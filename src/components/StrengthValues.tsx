import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { de } from "date-fns/locale"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Pencil,
  Plus,
  TrendingUp,
  History as HistoryIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AddStrengthValueDialog,
  type StrengthEntry,
} from "@/components/AddStrengthValueDialog"
import {
  STANDARD_LIFTS,
  GROUP_LABELS,
  GROUP_ORDER,
  findStandardLift,
  type LiftGroup,
} from "@/constants/standardLifts"

interface HistoryRow {
  id: string
  lift_name: string
  lift_type: "standard" | "custom"
  weight_kg: number
  achieved_on: string
}

interface CurrentValue {
  liftName: string
  liftType: "standard" | "custom"
  weightKg: number | null
  achievedOn: string | null // null = legacy profile-only value
  entryId: string | null // null when value comes from profile column
}

export const StrengthValues = () => {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<LiftGroup | "custom">("squat")
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [profileValues, setProfileValues] = useState<Record<string, number>>({})
  const [legacyExtraLifts, setLegacyExtraLifts] = useState<
    { name: string; weight: number }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StrengthEntry | null>(null)
  const [defaultLift, setDefaultLift] = useState<string | undefined>(undefined)

  const handleBack = () => {
    navigate("/pro?openProfile=true")
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [profileRes, historyRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "front_squat_1rm, back_squat_1rm, deadlift_1rm, bench_press_1rm, snatch_1rm, clean_1rm, jerk_1rm, clean_and_jerk_1rm"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("strength_history")
          .select("id, lift_name, lift_type, weight_kg, achieved_on")
          .eq("user_id", user.id)
          .order("achieved_on", { ascending: false }),
      ])

      const profile = profileRes.data as any
      const profileMap: Record<string, number> = {}
      if (profile) {
        STANDARD_LIFTS.forEach((lift) => {
          if (lift.profileColumn && profile[lift.profileColumn] != null) {
            profileMap[lift.name] = parseFloat(profile[lift.profileColumn])
          }
        })
      }
      setProfileValues(profileMap)
      setHistory((historyRes.data as HistoryRow[]) ?? [])
    } catch (error) {
      console.error("Error loading strength values:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Compute the "current" value per lift name, merging profile + history.
  const currentValues = useMemo(() => {
    const map = new Map<string, CurrentValue>()

    // Seed from profile (no date)
    Object.entries(profileValues).forEach(([liftName, weight]) => {
      map.set(liftName, {
        liftName,
        liftType: "standard",
        weightKg: weight,
        achievedOn: null,
        entryId: null,
      })
    })

    // Override with history if newer (history is sorted desc, so first occurrence wins)
    const seenInHistory = new Set<string>()
    history.forEach((row) => {
      if (seenInHistory.has(row.lift_name)) return
      seenInHistory.add(row.lift_name)
      map.set(row.lift_name, {
        liftName: row.lift_name,
        liftType: row.lift_type,
        weightKg: parseFloat(row.weight_kg as unknown as string),
        achievedOn: row.achieved_on,
        entryId: row.id,
      })
    })

    return map
  }, [profileValues, history])

  // Custom lifts: distinct names from history with type=custom
  const customLiftNames = useMemo(() => {
    const set = new Set<string>()
    history.forEach((h) => {
      if (h.lift_type === "custom") set.add(h.lift_name)
    })
    return Array.from(set)
  }, [history])

  const liftsForTab = (tab: LiftGroup | "custom") => {
    if (tab === "custom") return customLiftNames
    return STANDARD_LIFTS.filter((l) => l.group === tab).map((l) => l.name)
  }

  const historyForLift = (liftName: string) =>
    history.filter((h) => h.lift_name === liftName).slice(0, 5)

  const openAdd = (defaultName?: string) => {
    setEditing(null)
    setDefaultLift(defaultName)
    setDialogOpen(true)
  }

  const openEdit = (current: CurrentValue) => {
    if (!current.entryId || !current.achievedOn || current.weightKg == null) {
      // Profile-only value → seed dialog with current value, save creates a history entry
      openAdd(current.liftName)
      return
    }
    setEditing({
      id: current.entryId,
      liftName: current.liftName,
      liftType: current.liftType,
      weightKg: current.weightKg,
      achievedOn: parseISO(current.achievedOn),
    })
    setDefaultLift(undefined)
    setDialogOpen(true)
  }

  const formatDate = (iso: string) =>
    format(parseISO(iso), "dd.MM.yyyy", { locale: de })

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      <div className="mx-auto max-w-2xl p-4 pb-32">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kraftwerte</h1>
            <p className="text-sm text-muted-foreground">
              Verwalte deine 1RM-Werte mit Datum.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LiftGroup | "custom")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            {GROUP_ORDER.map((g) => (
              <TabsTrigger key={g} value={g} className="text-xs sm:text-sm">
                {GROUP_LABELS[g]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="custom" className="text-xs sm:text-sm">
              Eigene
            </TabsTrigger>
          </TabsList>

          {([...GROUP_ORDER, "custom"] as Array<LiftGroup | "custom">).map(
            (tab) => {
              const lifts = liftsForTab(tab)
              return (
                <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
                  {loading ? (
                    <>
                      <Skeleton className="h-24 w-full rounded-xl" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                    </>
                  ) : lifts.length === 0 ? (
                    <Card className="border-dashed p-8 text-center">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Noch keine eigenen Übungen erfasst.
                      </p>
                      <Button variant="outline" onClick={() => openAdd()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Übung hinzufügen
                      </Button>
                    </Card>
                  ) : (
                    lifts.map((liftName) => {
                      const current = currentValues.get(liftName)
                      const hasValue = current?.weightKg != null
                      const hist = historyForLift(liftName)
                      const isOpen = openHistoryFor === liftName

                      return (
                        <Card
                          key={liftName}
                          className={cn(
                            "overflow-hidden border-primary/10 transition-all",
                            hasValue ? "bg-card" : "bg-muted/30"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 p-4">
                            <button
                              type="button"
                              onClick={() =>
                                hist.length > 0
                                  ? setOpenHistoryFor(isOpen ? null : liftName)
                                  : undefined
                              }
                              className="flex-1 text-left"
                            >
                              <div className="text-sm font-medium text-foreground">
                                {liftName}
                              </div>
                              {hasValue ? (
                                <>
                                  <div className="mt-1 text-2xl font-bold text-primary">
                                    {current!.weightKg} kg
                                  </div>
                                  {current!.achievedOn && (
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      zuletzt {formatDate(current!.achievedOn)}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="mt-1 text-sm italic text-muted-foreground">
                                  noch nicht erfasst
                                </div>
                              )}
                            </button>

                            <div className="flex flex-col gap-1">
                              {hasValue ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(current!)}
                                  aria-label="Bearbeiten"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openAdd(liftName)}
                                  aria-label="Hinzufügen"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                              {hist.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setOpenHistoryFor(isOpen ? null : liftName)
                                  }
                                  aria-label="Verlauf"
                                >
                                  <HistoryIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {isOpen && hist.length > 0 && (
                            <div className="border-t border-primary/10 bg-muted/30 p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Verlauf
                              </div>
                              <div className="space-y-1.5">
                                {hist.map((row, idx) => {
                                  const prev = hist[idx + 1]
                                  const trend = prev
                                    ? parseFloat(row.weight_kg as any) -
                                      parseFloat(prev.weight_kg as any)
                                    : 0
                                  return (
                                    <button
                                      key={row.id}
                                      type="button"
                                      onClick={() => {
                                        setEditing({
                                          id: row.id,
                                          liftName: row.lift_name,
                                          liftType: row.lift_type,
                                          weightKg: parseFloat(
                                            row.weight_kg as any
                                          ),
                                          achievedOn: parseISO(row.achieved_on),
                                        })
                                        setDefaultLift(undefined)
                                        setDialogOpen(true)
                                      }}
                                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-background"
                                    >
                                      <span className="text-muted-foreground">
                                        {formatDate(row.achieved_on)}
                                      </span>
                                      <span className="flex items-center gap-2 font-medium">
                                        {row.weight_kg} kg
                                        {trend !== 0 && (
                                          <span
                                            className={cn(
                                              "flex items-center text-xs",
                                              trend > 0
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                            )}
                                          >
                                            <TrendingUp
                                              className={cn(
                                                "h-3 w-3",
                                                trend < 0 && "rotate-180"
                                              )}
                                            />
                                            {trend > 0 ? "+" : ""}
                                            {trend.toFixed(1)}
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </Card>
                      )
                    })
                  )}
                </TabsContent>
              )
            }
          )}
        </Tabs>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => openAdd()}
        className="fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label="Kraftwert hinzufügen"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddStrengthValueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={loadAll}
        initialEntry={editing}
        defaultLiftName={defaultLift}
      />
    </div>
  )
}
