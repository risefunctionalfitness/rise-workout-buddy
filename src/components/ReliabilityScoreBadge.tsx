import { Gauge } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getLevelColor,
  type ReliabilityScore,
} from "@/hooks/useReliabilityScore";
import { ReliabilityScoreScale } from "./ReliabilityScoreScale";

interface ReliabilityScoreBadgeProps {
  score: ReliabilityScore;
}

export const ReliabilityScoreBadge = ({ score }: ReliabilityScoreBadgeProps) => {
  const [open, setOpen] = useState(false);
  const color = getLevelColor(score.level);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border-2 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none shadow-md"
        style={{ borderColor: color }}
        title="Fairness Score"
      >
        <Gauge className="h-5 w-5" style={{ color }} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Gauge className="h-6 w-6" style={{ color }} />
              Fairness Score
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Big score display */}
            <div className="text-center py-2">
              <div className="text-5xl font-bold" style={{ color }}>
                {score.score}%
              </div>
            </div>

            <ReliabilityScoreScale score={score} />

            <p className="text-center text-sm font-medium">
              Buchungsfenster:{" "}
              <span className="font-bold" style={{ color }}>
                {score.bookingWindowDays} Tage
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
