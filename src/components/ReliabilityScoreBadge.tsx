import { Gauge } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RELIABILITY_LEVELS,
  getLevelColor,
  type ReliabilityScore,
} from "@/hooks/useReliabilityScore";
import { ReliabilityScoreScale } from "./ReliabilityScoreScale";

interface ReliabilityScoreBadgeProps {
  score: ReliabilityScore;
  variant?: "compact" | "detailed";
}

export const ReliabilityScoreBadge = ({ score, variant = "compact" }: ReliabilityScoreBadgeProps) => {
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
        <DialogContent className={variant === "detailed" ? "max-w-sm" : "max-w-xs"}>
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
              {variant === "detailed" && (
                <p className="text-sm text-muted-foreground mt-2">
                  {score.cancellations} von {score.totalBookings} storniert
                </p>
              )}
            </div>

            {variant === "detailed" && (
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Dein Fairness Score basiert auf deiner Stornierungsrate der letzten 90 Tage.
                Je zuverlässiger du bist, desto weiter im Voraus kannst du Kurse buchen.
              </p>
            )}

            <ReliabilityScoreScale score={score} />

            <p className="text-center text-sm font-medium">
              Buchungsfenster:{" "}
              <span className="font-bold" style={{ color }}>
                {score.bookingWindowDays} Tage
              </span>
            </p>

            {variant === "detailed" && (
              <div className="space-y-2">
                {RELIABILITY_LEVELS.map((lvl) => {
                  const isActive = score.level === lvl.level;
                  return (
                    <div
                      key={lvl.level}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        isActive ? "bg-muted/60" : "bg-muted/20"
                      }`}
                      style={isActive ? { borderColor: lvl.color, borderWidth: 2, borderStyle: "solid" } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: lvl.color }}
                        />
                        <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>
                          {lvl.level === 1
                            ? "0–15%"
                            : lvl.level === 2
                            ? "16–25%"
                            : lvl.level === 3
                            ? "26–35%"
                            : "36%+"}
                        </span>
                      </div>
                      <span className={`text-sm ${isActive ? "font-bold" : "text-muted-foreground"}`}>
                        {lvl.windowDays} Tage
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
