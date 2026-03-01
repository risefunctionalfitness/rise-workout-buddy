import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RELIABILITY_LEVELS } from "@/hooks/useReliabilityScore";

interface FairnessInfoDialogProps {
  userId: string;
}

export const FairnessInfoDialog = ({ userId }: FairnessInfoDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkIfShown = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("fairness_info_shown" as any)
        .eq("user_id", userId)
        .single();

      if (error) return;
      if (!(data as any)?.fairness_info_shown) {
        setOpen(true);
      }
    };
    checkIfShown();
  }, [userId]);

  const handleDismiss = async () => {
    setOpen(false);
    await supabase
      .from("profiles")
      .update({ fairness_info_shown: true } as any)
      .eq("user_id", userId);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-6 w-6 text-primary" />
            Dein Reliability Score
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Fairness zählt! Um die Wartelisten für alle planbar zu halten, bestimmt ab sofort deine Stornierungsrate dein Buchungsfenster:
          </p>

          <div className="space-y-2">
            {RELIABILITY_LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: lvl.color }}
                  />
                  <span className="text-sm font-medium">
                    Level {lvl.level} (
                    {lvl.level === 1
                      ? "0–15%"
                      : lvl.level === 2
                      ? "16–25%"
                      : lvl.level === 3
                      ? "26–35%"
                      : "36%+"}
                    )
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {lvl.windowDays === 14
                    ? "Max. Planung (14 Tage)"
                    : `${lvl.windowDays} Tage im Voraus`}
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Dein aktuelles Level findest du ab jetzt immer oben rechts über das{" "}
            <Gauge className="inline h-4 w-4 text-primary align-text-bottom" />
            -Icon. Bleib verlässlich und sichere dir deinen Platz!
          </p>

          <Button className="w-full" onClick={handleDismiss}>
            Alles klar!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
