import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  newsId: string;
  title: string;
  content: string;
  statusFilter: 'all' | 'active' | 'inactive';
  membershipTypes: string[];
}

interface Profile {
  user_id: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  membership_type?: string;
  status?: string;
}

interface EmailRecipient {
  email: string;
  first_name: string;
  last_name: string;
  membership_type: string;
  subject: string;
  body: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get webhook URL from environment
    const webhookUrl = Deno.env.get('MAKE_NEWS_EMAIL_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('MAKE_NEWS_EMAIL_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook URL not configured', sent: 0 }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      throw new Error('Unauthorized - Admin access required');
    }

    // Parse request body
    const { newsId, title, content, statusFilter, membershipTypes }: EmailRequest = await req.json();

    console.log('Processing news email:', { newsId, title, statusFilter, membershipTypes });

    // Check if email was already sent for this news
    const { data: news, error: newsError } = await supabaseClient
      .from('news')
      .select('email_sent_at')
      .eq('id', newsId)
      .single();

    if (newsError) {
      console.error('Error fetching news:', newsError);
      throw new Error('News not found');
    }

    if (news?.email_sent_at) {
      console.log('Email already sent for this news at:', news.email_sent_at);
      return new Response(
        JSON.stringify({ message: 'Email already sent', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build query for recipients
    let profilesQuery = supabaseClient
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, membership_type')
      .not('user_id', 'is', null);

    // Apply status filter
    if (statusFilter !== 'all') {
      profilesQuery = profilesQuery.eq('status', statusFilter);
    }

    // Apply membership type filter if specified
    if (membershipTypes.length > 0) {
      profilesQuery = profilesQuery.in('membership_type', membershipTypes);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} matching profiles`);

    if (!profiles || profiles.length === 0) {
      console.log('No recipients found');
      return new Response(
        JSON.stringify({ message: 'No recipients found', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch email addresses for all users from auth.users with pagination
    const userIds = profiles.map((p: Profile) => p.user_id);
    const allAuthUsers = [];
    let page = 1;
    const perPage = 1000; // Maximum per page

    while (true) {
      const { data: authUsersPage, error: authUsersError } = await supabaseClient.auth.admin.listUsers({
        page: page,
        perPage: perPage
      });

      if (authUsersError) {
        console.error('Error fetching auth users:', authUsersError);
        throw authUsersError;
      }

      if (!authUsersPage || authUsersPage.users.length === 0) {
        break; // No more users
      }

      allAuthUsers.push(...authUsersPage.users);
      
      console.log(`Fetched page ${page}: ${authUsersPage.users.length} users (total so far: ${allAuthUsers.length})`);

      // If we got less than perPage, we've reached the end
      if (authUsersPage.users.length < perPage) {
        break;
      }

      page++;
    }

    console.log(`Total auth users fetched: ${allAuthUsers.length}`);

    // Map user_id to email
    const emailMap = new Map(
      allAuthUsers
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, u.email])
    );

    console.log(`Mapped ${emailMap.size} email addresses for ${userIds.length} profiles`);

    // Create recipient list with emails
    const recipients: EmailRecipient[] = profiles
      .map((profile: Profile) => {
        const email = emailMap.get(profile.user_id);
        if (!email) return null;

        return {
          email,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          membership_type: profile.membership_type || 'Member',
          subject: title, // Title is the subject
          body: content  // Content is the body
        };
      })
      .filter((r): r is EmailRecipient => r !== null);

    console.log(`Prepared ${recipients.length} recipients for email`);

    // Batch recipients (50 per batch)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    console.log(`Sending ${batches.length} batches to webhook`);

    // Send batches to Make.com webhook
    let successfulBatches = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const payload = {
        event_type: 'news_email',
        batch_number: i + 1,
        total_batches: batches.length,
        total_recipients: recipients.length,
        timestamp: new Date().toISOString(),
        news: {
          id: newsId,
          title: title,
          content: content
        },
        emails: batch
      };

      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!webhookResponse.ok) {
          console.error(`Webhook batch ${i + 1} failed:`, await webhookResponse.text());
        } else {
          console.log(`Webhook batch ${i + 1}/${batches.length} sent successfully`);
          successfulBatches++;
        }

        // Delay between batches (1 second)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (webhookError) {
        console.error(`Error sending webhook batch ${i + 1}:`, webhookError);
      }
    }

    // Update news with email_sent_at timestamp (only if at least one batch was successful)
    if (successfulBatches > 0) {
      const { error: updateError } = await supabaseClient
        .from('news')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', newsId);

      if (updateError) {
        console.error('Error updating news email_sent_at:', updateError);
      } else {
        console.log('News email_sent_at updated successfully');
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Email batches sent successfully',
        sent: recipients.length,
        batches: successfulBatches,
        total_batches: batches.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in send-news-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message, sent: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
