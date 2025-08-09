import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Keeps Supabase sessions alive and rehydrates on app visibility changes
export const AuthKeeper = () => {
  useEffect(() => {
    // Subscribe to auth state to ensure library timers are active
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // no-op: just ensuring listener is attached
    });

    const ensureSession = async () => {
      try {
        // Triggers rehydration and refresh timers if needed
        await supabase.auth.getSession();
      } catch (e) {
        // Silently ignore to avoid noisy logs; UI handles auth errors elsewhere
      }
    };

    // Initial ensure
    ensureSession();

    // Refresh when app returns to foreground
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        ensureSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic keep-alive well below 1h JWT expiry
    const interval = setInterval(ensureSession, 1000 * 60 * 20); // every 20 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
};

