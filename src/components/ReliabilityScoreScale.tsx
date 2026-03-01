import { getLevelInfo, type ReliabilityScore } from "@/hooks/useReliabilityScore";

interface ReliabilityScoreScaleProps {
  score: ReliabilityScore;
}

export const ReliabilityScoreScale = ({ score }: ReliabilityScoreScaleProps) => {
  const levelInfo = getLevelInfo(score.level);
  // Clamp marker position between 2% and 98%
  const markerPosition = Math.min(98, Math.max(2, score.score));

  return (
    <div className="space-y-2">
      {/* Gradient bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-400 via-orange-500 to-red-500">
        {/* Marker */}
        <div
          className="absolute top-[-2px] w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all"
          style={{
            left: `${markerPosition}%`,
            transform: "translateX(-50%)",
            borderColor: levelInfo.color,
          }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>0%</span>
        <span>15%</span>
        <span>25%</span>
        <span>35%</span>
        <span>50%+</span>
      </div>
      {/* Status text */}
      <p className="text-xs text-center text-muted-foreground">
        Status:{" "}
        <span className="font-semibold" style={{ color: levelInfo.color }}>
          {levelInfo.label}
        </span>{" "}
        | Buchungsfenster:{" "}
        <span className="font-semibold">{score.bookingWindowDays} Tage</span>
      </p>
    </div>
  );
};
