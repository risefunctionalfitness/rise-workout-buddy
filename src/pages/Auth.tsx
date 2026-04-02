import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Logo } from "@/components/Logo";

export default function Auth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true
    let hasRedirected = false
    
    const handleRedirect = async (session: Session | null) => {
      if (!session?.user || hasRedirected || !mounted) return
      
      hasRedirected = true
      
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
      if (!email || !accessCode) {
        toast.error("Bitte E-Mail und Code eingeben");
        setLoading(false);
        return;
      }

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
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Fehler beim Anmelden");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Bitte E-Mail eingeben");
      return;
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email: resetEmail },
      });

      if (error) {
        toast.error("Fehler beim Zurücksetzen des Passworts");
        return;
      }

      toast.success("Falls die E-Mail existiert, wurde ein neuer Zugangscode versendet.");
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Fehler beim Zurücksetzen des Passworts");
    } finally {
      setResetLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <Logo className="h-12 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Log in</CardTitle>
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
              className="w-full bg-rise-accent hover:bg-rise-accent-dark text-white" 
              disabled={loading}
            >
              {loading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Passwort vergessen?
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen</DialogTitle>
            <DialogDescription>
              Gib deine E-Mail-Adresse ein. Du erhältst einen neuen Zugangscode.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Input
              type="email"
              placeholder="E-Mail"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={resetLoading}
            >
              {resetLoading ? "Wird gesendet..." : "Neuen Zugangscode anfordern"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
