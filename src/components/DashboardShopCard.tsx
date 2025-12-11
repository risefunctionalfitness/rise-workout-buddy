import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MerchOrderDialog } from "./MerchOrderDialog";

interface DashboardShopCardProps {
  userId: string;
}

export const DashboardShopCard = ({ userId }: DashboardShopCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOrderingAvailable, setIsOrderingAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOrderingAvailability();
  }, []);

  const checkOrderingAvailability = async () => {
    try {
      const { data: settings, error } = await supabase
        .from("merch_settings")
        .select("is_ordering_open, order_deadline")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading merch settings:", error);
        setIsOrderingAvailable(false);
        return;
      }

      if (!settings || !settings.is_ordering_open) {
        setIsOrderingAvailable(false);
        return;
      }

      // Check if deadline has passed
      if (settings.order_deadline) {
        const deadline = new Date(settings.order_deadline);
        const now = new Date();
        if (now > deadline) {
          setIsOrderingAvailable(false);
          return;
        }
      }

      setIsOrderingAvailable(true);
    } catch (error) {
      console.error("Error checking ordering availability:", error);
      setIsOrderingAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if ordering is not available or still loading
  if (loading || !isOrderingAvailable) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="p-3 bg-primary/10 rounded-full">
          <ShoppingBag className="h-8 w-8 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">T-Shirt Bestellung</span>
      </button>

      <MerchOrderDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        userId={userId}
        onOrderComplete={() => {
          setIsOpen(false);
        }}
      />
    </>
  );
};
