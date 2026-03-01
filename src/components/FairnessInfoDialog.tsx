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
        <div className="flex flex-col items-center text-center pt-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <Gauge className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Deine Stornierungsrate
          </DialogTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3 px-2">
            Fairness zählt! Um die Wartelisten für alle planbar zu halten, bestimmt ab sofort deine Stornierungsrate dein Buchungsfenster:
          </p>
        </div>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            {RELIABILITY_LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: lvl.color }}
                  />
                  <span className="text-sm font-medium">
                    {lvl.level === 1
                      ? "0–15%"
                      : lvl.level === 2
                      ? "16–25%"
                      : lvl.level === 3
                      ? "26–35%"
                      : "36%+"}
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

          <p className="text-xs text-muted-foreground leading-relaxed text-center px-2">
            Dein aktuelles Level findest du ab jetzt immer oben rechts über das{" "}
            <Gauge className="inline h-3.5 w-3.5 text-primary align-text-bottom" />
            -Icon. Bleib verlässlich und sichere dir deinen Platz!
          </p>

          <Button className="w-full rounded-xl h-11 font-semibold" onClick={handleDismiss}>
            Alles klar!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
