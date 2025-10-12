import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DashboardWorkoutCard = () => {
  const navigate = useNavigate();

  return (
    <Card 
      className="h-full cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate('/pro/workout')}
    >
      <CardContent className="h-full p-4 flex flex-col items-center justify-center">
        <Dumbbell className="h-8 w-8 text-primary mb-2" />
        <h3 className="text-sm font-semibold text-center">WOD</h3>
      </CardContent>
    </Card>
  );
};