import { Gauge } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RELIABILITY_LEVELS,
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
        onClick={() => setOpen(true)}
        className="flex items-center px-2 py-1 rounded-full transition-colors hover:bg-muted"
        title="Fairness Score"
      >
        <Gauge className="h-7 w-7" style={{ color }} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" style={{ color }} />
              Fairness Score
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dein Fairness Score basiert auf deiner Stornierungsrate der letzten 90 Tage.
              Je zuverlässiger du bist, desto weiter im Voraus kannst du Kurse buchen.
            </p>

            <ReliabilityScoreScale score={score} />

            <div className="text-sm text-center text-muted-foreground">
              Dein Score: <span className="font-bold" style={{ color }}>{score.score}%</span>
              {" "}({score.cancellations} von {score.totalBookings} storniert)
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Buchungsfenster</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RELIABILITY_LEVELS.map((lvl) => (
                  <TableRow
                    key={lvl.level}
                    className={score.level === lvl.level ? "bg-muted/50 font-semibold" : ""}
                  >
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={{ color: lvl.color }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: lvl.color }}
                        />
                        {lvl.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lvl.level === 1
                        ? "0–15%"
                        : lvl.level === 2
                        ? "16–25%"
                        : lvl.level === 3
                        ? "26–35%"
                        : "36%+"}
                    </TableCell>
                    <TableCell>{lvl.windowDays} Tage</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
