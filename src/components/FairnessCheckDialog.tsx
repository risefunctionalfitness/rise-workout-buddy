import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut } from "lucide-react";
import {
  getProjectedScore,
  getLevelColor,
  getLevelInfo,
  type ReliabilityScore,
} from "@/hooks/useReliabilityScore";

interface FairnessCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScore: ReliabilityScore;
  onConfirmCancel: () => void;
}

export const FairnessCheckDialog = ({
  open,
  onOpenChange,
  currentScore,
  onConfirmCancel,
}: FairnessCheckDialogProps) => {
  const projected = getProjectedScore(currentScore);
  const currentColor = getLevelColor(currentScore.level);
  const projectedColor = getLevelColor(projected.level);
  const projectedInfo = getLevelInfo(projected.level);
  const levelChanged = projected.level > currentScore.level;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fairness Check</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mit dieser Stornierung steigt dein Score auf{" "}
            <span className="font-bold" style={{ color: projectedColor }}>
              {projected.score}%
            </span>
            .
            {levelChanged && (
              <>
                {" "}Dein Level ändert sich auf{" "}
                <span className="font-bold" style={{ color: projectedColor }}>
                  {projectedInfo.label}
                </span>{" "}
                (Buchungsfenster: {projectedInfo.windowDays} Tage).
              </>
            )}
          </p>

          {/* Visual score change */}
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color: currentColor }}
              >
                {currentScore.score}%
              </div>
              <div className="text-xs text-muted-foreground">Aktuell</div>
            </div>
            <span className="text-lg text-muted-foreground">→</span>
            <div className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color: projectedColor }}
              >
                {projected.score}%
              </div>
              <div className="text-xs text-muted-foreground">Danach</div>
            </div>
          </div>

          {/* Gradient bar with corrected scale (0-50%) */}
          <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-400 via-orange-500 to-red-500">
            {/* Current marker */}
            <div
              className="absolute top-[-2px] w-4 h-4 rounded-full bg-white border-2 shadow-md opacity-40"
              style={{
                left: `${Math.min(98, Math.max(2, (currentScore.score / 50) * 100))}%`,
                transform: "translateX(-50%)",
                borderColor: currentColor,
              }}
            />
            {/* Projected marker */}
            <div
              className="absolute top-[-3px] w-5 h-5 rounded-full bg-white border-[3px] shadow-lg"
              style={{
                left: `${Math.min(98, Math.max(2, (projected.score / 50) * 100))}%`,
                transform: "translateX(-50%)",
                borderColor: projectedColor,
              }}
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Bist du dir sicher, dass du dich abmelden willst?
          </p>

          <div className="space-y-2">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onOpenChange(false)}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Angemeldet bleiben
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              onClick={() => {
                onConfirmCancel();
                onOpenChange(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Trotzdem abmelden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
