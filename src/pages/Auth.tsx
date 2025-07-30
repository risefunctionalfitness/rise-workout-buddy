import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Removed tabs import
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export default function Auth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true
    let hasRedirected = false
    
    const handleRedirect = async (session: Session | null) => {
      if (!session?.user || hasRedirected || !mounted) return
      
      hasRedirected = true
      
      // Use setTimeout to defer navigation and database calls
      setTimeout(async () => {
        if (!mounted) return
        
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle()

          if (!mounted) return

          if (roleData || session.user.email === 'admin@rise-fitness.com') {
            navigate("/admin")
          } else {
            navigate("/pro")
          }
        } catch (error) {
          console.error('Error checking user role:', error)
          if (mounted) {
            navigate("/pro")
          }
        }
      }, 100)
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN') {
          handleRedirect(session)
        }
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        handleRedirect(session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Einheitlicher Login für alle: Email + Code
      if (!email || !accessCode) {
        toast.error("Bitte E-Mail und Code eingeben");
        setLoading(false);
        return;
      }

      // Login mit Email und Code als Passwort
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: accessCode,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Ungültige E-Mail oder Code");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Erfolgreich angemeldet!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Fehler beim Anmelden");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/pro`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password: accessCode, // Use access code as password
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: email.split('@')[0], // Use email prefix as display name
            access_code: accessCode
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("Benutzer bereits registriert. Bitte melden Sie sich an.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Registrierung erfolgreich! Sie können sich jetzt anmelden.");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Fehler bei der Registrierung");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null; // User will be redirected
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png" 
            alt="RISE Functional Fitness Logo" 
            className="h-12 mx-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold">RISE Fitness</CardTitle>
          <CardDescription>
            Melden Sie sich an oder registrieren Sie sich
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Zugangscode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}