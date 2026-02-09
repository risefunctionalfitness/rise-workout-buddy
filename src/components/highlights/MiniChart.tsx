import { UserStats } from "@/hooks/useUserAchievements";

interface MiniChartProps {
  type: string;
  stats: UserStats | null;
  value: string;
}

export const MiniChart = ({ type, stats, value }: MiniChartProps) => {
  if (type === "streak") {
    return <StreakMiniChart stats={stats} />;
  }
  if (type === "training") {
    const numValue = parseInt(value) || 0;
    return <MilestoneMiniChart currentValue={numValue} />;
  }
  if (type === "total") {
    return <TotalMiniChart stats={stats} />;
  }
  if (type === "weekly") {
    return <WeeklyMiniChart stats={stats} />;
  }
  return <GenericMiniChart />;
};

function StreakMiniChart({ stats }: { stats: UserStats | null }) {
  const current = stats?.currentStreak ?? 0;
  const longest = stats?.longestStreak ?? 0;
  return (
    <div>
      <div className="flex items-end justify-center gap-1 h-12">
        {Array.from({ length: 10 }).map((_, i) => {
          const progress = (i + 1) / 10;
          const height = 30 + progress * 70;
          return (
            <div
              key={i}
              className="w-2.5 rounded-sm"
              style={{
                height: `${height}%`,
                background: "linear-gradient(to top, #6b1c1c, #991b1b, #dc2626)",
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
        <span>Aktuell: {current} Wochen</span>
        <span>Längste: {longest} Wochen</span>
      </div>
    </div>
  );
}

function MilestoneMiniChart({ currentValue }: { currentValue: number }) {
  const allMilestones = [10, 25, 50, 75, 100, 150, 200, 300, 500];
  const nextIdx = allMilestones.findIndex(m => m > currentValue);
  const startIdx = Math.max(0, (nextIdx === -1 ? allMilestones.length : nextIdx) - 3);
  const endIdx = Math.min(allMilestones.length, startIdx + 5);
  const milestones = allMilestones.slice(startIdx, endIdx);

  return (
    <div>
      <div className="flex items-center justify-center gap-0">
        {milestones.map((m, i) => {
          const reached = currentValue >= m;
          return (
            <div key={m} className="flex items-center">
              {i > 0 && (
                <div
                  className="h-0.5 w-6"
                  style={{
                    background: currentValue >= milestones[i - 1]
                      ? "linear-gradient(to right, #6b1c1c, #dc2626)"
                      : "rgba(255,255,255,0.15)",
                  }}
                />
              )}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  background: reached
                    ? "radial-gradient(circle, #dc2626, #991b1b)"
                    : "rgba(255,255,255,0.1)",
                  border: reached ? "none" : "1.5px solid rgba(255,255,255,0.3)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-1">
        {milestones.map((m) => (
          <span key={m} className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function TotalMiniChart({ stats }: { stats: UserStats | null }) {
  const bookings = stats?.totalBookings ?? 0;
  const trainings = stats?.totalTrainings ?? 0;
  const total = bookings + trainings;
  const bookingsPercent = total > 0 ? (bookings / total) * 100 : 50;

  return (
    <div>
      <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${bookingsPercent}%`,
            background: "linear-gradient(to right, #dc2626, #b91c1c)",
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
        <span>Kursbuchungen: {bookings}</span>
        <span>Open Gym: {trainings}</span>
      </div>
    </div>
  );
}

function WeeklyMiniChart({ stats }: { stats: UserStats | null }) {
  const completed = stats?.thisWeekTrainings ?? 0;
  const goal = stats?.weeklyGoal ?? 3;
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div className="flex justify-center gap-2">
      {days.map((day, i) => {
        const isCompleted = i < completed;
        const isGoal = i < goal;
        return (
          <div key={day} className="flex flex-col items-center gap-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
              style={{
                background: isCompleted
                  ? "radial-gradient(circle, #dc2626, #991b1b)"
                  : isGoal
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.05)",
                border: isCompleted
                  ? "none"
                  : isGoal
                  ? "2px solid rgba(220,38,38,0.5)"
                  : "1.5px solid rgba(255,255,255,0.2)",
              }}
            >
              {isCompleted && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className="text-[10px]"
              style={{ color: isCompleted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}
            >
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GenericMiniChart() {
  return (
    <div className="flex items-end justify-center gap-1 h-10">
      {Array.from({ length: 8 }).map((_, i) => {
        const height = 25 + ((i + 1) / 8) * 75;
        return (
          <div
            key={i}
            className="w-2.5 rounded-sm"
            style={{
              height: `${height}%`,
              background: "linear-gradient(to top, #6b1c1c, #991b1b, #dc2626)",
            }}
          />
        );
      })}
    </div>
  );
}
