// Standard CrossFit / Strength lifts grouped by category.
// Used in StrengthValues and PercentageCalculator.

export type LiftGroup = "squat" | "pull" | "press" | "olympic"

export interface StandardLift {
  name: string
  group: LiftGroup
  // Profile column for the 8 legacy lifts that still live on profiles.
  // For new lifts this is null and the value lives only in strength_history.
  profileColumn:
    | "front_squat_1rm"
    | "back_squat_1rm"
    | "deadlift_1rm"
    | "bench_press_1rm"
    | "snatch_1rm"
    | "clean_1rm"
    | "jerk_1rm"
    | "clean_and_jerk_1rm"
    | null
}

export const STANDARD_LIFTS: StandardLift[] = [
  // Squat
  { name: "Back Squat", group: "squat", profileColumn: "back_squat_1rm" },
  { name: "Front Squat", group: "squat", profileColumn: "front_squat_1rm" },
  { name: "Overhead Squat", group: "squat", profileColumn: null },

  // Pull / Hinge
  { name: "Deadlift", group: "pull", profileColumn: "deadlift_1rm" },

  // Press
  { name: "Bench Press", group: "press", profileColumn: "bench_press_1rm" },
  { name: "Strict Press", group: "press", profileColumn: null },
  { name: "Push Press", group: "press", profileColumn: null },

  // Olympic
  { name: "Snatch", group: "olympic", profileColumn: "snatch_1rm" },
  { name: "Power Snatch", group: "olympic", profileColumn: null },
  { name: "Hang Snatch", group: "olympic", profileColumn: null },
  { name: "Squat Snatch", group: "olympic", profileColumn: null },
  { name: "Clean", group: "olympic", profileColumn: "clean_1rm" },
  { name: "Power Clean", group: "olympic", profileColumn: null },
  { name: "Hang Clean", group: "olympic", profileColumn: null },
  { name: "Squat Clean", group: "olympic", profileColumn: null },
  { name: "Jerk", group: "olympic", profileColumn: "jerk_1rm" },
  { name: "Push Jerk", group: "olympic", profileColumn: null },
  { name: "Split Jerk", group: "olympic", profileColumn: null },
  { name: "Clean & Jerk", group: "olympic", profileColumn: "clean_and_jerk_1rm" },
]

export const GROUP_LABELS: Record<LiftGroup, string> = {
  squat: "Squat",
  pull: "Pull",
  press: "Press",
  olympic: "Olympic",
}

export const GROUP_ORDER: LiftGroup[] = ["squat", "pull", "press", "olympic"]

export const findStandardLift = (name: string): StandardLift | undefined =>
  STANDARD_LIFTS.find((l) => l.name === name)
