import { getLevelInfo, type ReliabilityScore } from "@/hooks/useReliabilityScore";

interface ReliabilityScoreScaleProps {
  score: ReliabilityScore;
}

export const ReliabilityScoreScale = ({ score }: ReliabilityScoreScaleProps) => {
  const levelInfo = getLevelInfo(score.level);
  // Map score (0-50+) to bar position (0-100%), clamped
  const markerPosition = Math.min(98, Math.max(2, (score.score / 50) * 100));

  return (
    <div className="space-y-3">
      {/* Gradient bar */}
      <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-400 via-orange-500 to-red-500">
        {/* Marker */}
        <div
          className="absolute top-[-3px] w-5 h-5 rounded-full bg-white border-[3px] shadow-lg transition-all"
          style={{
            left: `${markerPosition}%`,
            transform: "translateX(-50%)",
            borderColor: levelInfo.color,
          }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>0%</span>
        <span>15%</span>
        <span>25%</span>
        <span>35%</span>
        <span>50%+</span>
      </div>
    </div>
  );
};
