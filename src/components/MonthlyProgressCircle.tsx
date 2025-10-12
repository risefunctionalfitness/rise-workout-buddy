import { Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from "date-fns";

interface MonthlyProgressCircleProps {
  user: any;
}

export const MonthlyProgressCircle = ({ user }: MonthlyProgressCircleProps) => {
  const [trainingDays, setTrainingDays] = useState<Date[]>([]);
  const [registeredDays, setRegisteredDays] = useState<Date[]>([]);
  const [trainingCount, setTrainingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadMonthlyData();
      setupRealtimeUpdates();
    }
  }, [user?.id]);

  const loadMonthlyData = async () => {
    if (!user?.id) return;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    try {
      // Get training sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("date, status")
        .eq("user_id", user.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      if (sessionsError) throw sessionsError;

      const completedDays = sessions
        ?.filter((s) => s.status === "completed")
        .map((s) => new Date(s.date)) || [];

      // Get course registrations
      const { data: registrations, error: registrationsError } = await supabase
        .from("course_registrations")
        .select("courses(course_date)")
        .eq("user_id", user.id)
        .eq("status", "registered")
        .gte("courses.course_date", format(monthStart, "yyyy-MM-dd"))
        .lte("courses.course_date", format(monthEnd, "yyyy-MM-dd"));

      if (registrationsError) throw registrationsError;

      const regDays = registrations
        ?.map((r: any) => new Date(r.courses.course_date))
        .filter((d) => d) || [];

      setTrainingDays(completedDays);
      setRegisteredDays(regDays);
      setTrainingCount(completedDays.length);
    } catch (error) {
      console.error("Error loading monthly data:", error);
    }
  };

  const setupRealtimeUpdates = () => {
    const channel1 = supabase
      .channel("training-sessions-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_sessions",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadMonthlyData()
      )
      .subscribe();

    const channel2 = supabase
      .channel("course-registrations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_registrations",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadMonthlyData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  };

  const getDotColor = (day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);
    
    const isPast = dayDate < today;
    const isFuture = dayDate > today;

    // Check if has completed training (past or today)
    const hasTraining = trainingDays.some((d) => isSameDay(d, day));
    if (hasTraining) {
      return "fill-green-500"; // Completed training - filled green
    }

    // Check if has future course registration (only for future dates)
    const hasRegistration = registeredDays.some((d) => isSameDay(d, day));
    if (hasRegistration && (isFuture || isSameDay(dayDate, today))) {
      return "fill-none stroke-green-500 stroke-2"; // Future course registration - green ring
    }

    // Past day without training
    if (isPast) {
      return "fill-foreground"; // Black/white filled
    }

    // Future day
    if (isFuture || isSameDay(dayDate, today)) {
      return "fill-gray-300 dark:fill-gray-600"; // Gray filled
    }

    return "fill-gray-300 dark:fill-gray-600";
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const centerX = 180;
  const centerY = 180;
  const radius = 140;
  const angleStep = 360 / daysInMonth.length;

  return (
    <div className="h-full flex items-center justify-center">
      <svg
        viewBox="0 0 360 360"
        className="w-full h-full max-w-[360px] max-h-[360px]"
      >
        {/* Dots */}
        {daysInMonth.map((day, index) => {
          const angle = -90 + angleStep * index; // Start at top (-90°)
          const angleRad = (angle * Math.PI) / 180;
          const x = centerX + radius * Math.cos(angleRad);
          const y = centerY + radius * Math.sin(angleRad);

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="6"
              className={getDotColor(day)}
            />
          );
        })}

        {/* Center Content */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Dumbbell Icon */}
          <g transform="translate(-20, -85)">
            <foreignObject x="0" y="0" width="40" height="40">
              <Dumbbell className="h-10 w-10 text-primary" />
            </foreignObject>
          </g>

          {/* Training Count */}
          <text
            x="0"
            y="20"
            textAnchor="middle"
            className="text-6xl font-bold fill-foreground"
            style={{ fontSize: "60px" }}
          >
            {trainingCount}
          </text>

          {/* Label */}
          <text
            x="0"
            y="50"
            textAnchor="middle"
            className="text-lg fill-muted-foreground"
            style={{ fontSize: "18px" }}
          >
            Trainings
          </text>
        </g>
      </svg>
    </div>
  );
};
