import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { de } from "date-fns/locale"
import { useNavigate } from "react-router-dom"
import { Calculator, ChevronRight, Plus, Settings, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddStrengthValueDialog } from "@/components/AddStrengthValueDialog"
import {
  STANDARD_LIFTS,
  GROUP_LABELS,
  GROUP_ORDER,
  findStandardLift,
} from "@/constants/standardLifts"

interface SavedLift {
  name: string
  weight: number
  achievedOn: string | null
}

const QUICK_PERCENTS = [60, 70, 75, 80, 85, 90, 95, 100]

const roundToBar = (kg: number) => Math.round(kg / 2.5) * 2.5

export const PercentageCalculator = () => {
  const navigate = useNavigate()

  const [mode, setMode] = useState<"saved" | "free">("saved")

  // Saved values mode
  const [savedLifts, setSavedLifts] = useState<SavedLift[]>([])
  const [customLifts, setCustomLifts] = useState<SavedLift[]>([])
  const [selectedLift, setSelectedLift] = useState("")
  const [percentage, setPercentage] = useState("")

  // Free mode
  const [freeWeight, setFreeWeight] = useState("")
  const [freePercent, setFreePercent] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)

  const loadStrengthValues = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, historyRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "front_squat_1rm, back_squat_1rm, deadlift_1rm, bench_press_1rm, snatch_1rm, clean_1rm, jerk_1rm, clean_and_jerk_1rm, extra_lifts"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("strength_history")
          .select("lift_name, lift_type, weight_kg, achieved_on")
          .eq("user_id", user.id)
          .order("achieved_on", { ascending: false }),
      ])

      const map = new Map<string, SavedLift>()
      const customSet = new Set<string>()

      // Seed from profile (no date)
      const profile = profileRes.data as any
      if (profile) {
        STANDARD_LIFTS.forEach((lift) => {
          if (lift.profileColumn && profile[lift.profileColumn] != null) {
            const w = parseFloat(profile[lift.profileColumn])
            if (w > 0) {
              map.set(lift.name, {
                name: lift.name,
                weight: w,
                achievedOn: null,
              })
            }
          }
        })
      }

      // Override with newer history values (sorted desc, first occurrence wins)
      const seen = new Set<string>()
      ;(historyRes.data ?? []).forEach((row: any) => {
        if (seen.has(row.lift_name)) return
        seen.add(row.lift_name)
        map.set(row.lift_name, {
          name: row.lift_name,
          weight: parseFloat(row.weight_kg),
          achievedOn: row.achieved_on,
        })
        if (row.lift_type === "custom") customSet.add(row.lift_name)
      })

      // Legacy extra_lifts from profile (no date) — only if no history exists for that name
      const rawExtras = (profile?.extra_lifts as any[]) ?? []
      rawExtras.forEach((entry) => {
        const name = (entry?.name ?? "").toString().trim()
        if (!name || map.has(name)) return
        const rawWeight = (entry?.weight ?? "").toString()
        const match = rawWeight.match(/-?\d+([.,]\d+)?/)
        if (!match) return
        const weight = parseFloat(match[0].replace(",", "."))
        if (isNaN(weight) || weight <= 0) return
        map.set(name, { name, weight, achievedOn: null })
        customSet.add(name)
      })

      const all = Array.from(map.values()).filter((l) => l.weight > 0)
      setSavedLifts(all.filter((l) => !customSet.has(l.name)))
      setCustomLifts(all.filter((l) => customSet.has(l.name)))
    } catch (error) {
      console.error("Error loading strength values:", error)
    }
  }

  useEffect(() => {
    loadStrengthValues()
  }, [])

  const allLifts = useMemo(
    () => [...savedLifts, ...customLifts],
    [savedLifts, customLifts]
  )

  const selected = useMemo(
    () => allLifts.find((l) => l.name === selectedLift),
    [allLifts, selectedLift]
  )

  const result = useMemo(() => {
    if (mode === "saved") {
      if (!selected || !percentage) return null
      const p = parseFloat(percentage)
      if (isNaN(p)) return null
      return (selected.weight * p) / 100
    } else {
      if (!freeWeight || !freePercent) return null
      const w = parseFloat(freeWeight)
      const p = parseFloat(freePercent)
      if (isNaN(w) || isNaN(p)) return null
      return (w * p) / 100
    }
  }, [mode, selected, percentage, freeWeight, freePercent])

  const liftsByGroup = useMemo(() => {
    const grouped: Record<string, SavedLift[]> = {
      squat: [],
      pull: [],
      press: [],
      olympic: [],
    }
    savedLifts.forEach((lift) => {
      const std = findStandardLift(lift.name)
      if (std) grouped[std.group].push(lift)
    })
    return grouped
  }, [savedLifts])

  const hasAny = allLifts.length > 0

  return (
    <div className="mx-4 space-y-4">
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="space-y-5 p-5">
          {/* Mode Tabs + Manage link */}
          <div className="flex items-center gap-2">
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as "saved" | "free")}
              className="flex-1"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saved">Gespeichert</TabsTrigger>
                <TabsTrigger value="free">Frei</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/pro/strength-values")}
              aria-label="Kraftwerte verwalten"
              title="Kraftwerte verwalten"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick link as text below for discoverability */}
          <button
            type="button"
            onClick={() => navigate("/pro/strength-values")}
            className="-mt-3 flex w-full items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            Alle Kraftwerte verwalten
            <ChevronRight className="h-3 w-3" />
          </button>

          {/* Saved Mode */}
          {mode === "saved" && (
            <>
              {!hasAny ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 inline-flex rounded-2xl bg-muted/40 p-4">
                    <Calculator className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="mb-1 text-base font-medium text-foreground">
                    Noch keine Kraftwerte
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Lege deinen ersten Wert an, um den Rechner zu nutzen.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Kraftwert hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Übung
                  </Label>
                  <Select value={selectedLift} onValueChange={setSelectedLift}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Übung wählen" />
                    </SelectTrigger>
                    <SelectContent className="z-50 max-h-72 bg-background">
                      {GROUP_ORDER.map((group) => {
                        const lifts = liftsByGroup[group]
                        if (lifts.length === 0) return null
                        return (
                          <SelectGroup key={group}>
                            <SelectLabel>{GROUP_LABELS[group]}</SelectLabel>
                            {lifts.map((lift) => (
                              <SelectItem key={lift.name} value={lift.name}>
                                <span className="flex w-full items-center justify-between gap-4">
                                  <span>{lift.name}</span>
                                  <span className="font-semibold text-primary">
                                    {lift.weight} kg
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )
                      })}
                      {customLifts.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Eigene</SelectLabel>
                          {customLifts.map((lift) => (
                            <SelectItem key={lift.name} value={lift.name}>
                              <span className="flex w-full items-center justify-between gap-4">
                                <span>{lift.name}</span>
                                <span className="font-semibold text-primary">
                                  {lift.weight}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  {selected?.achievedOn && (
                    <p className="text-xs text-muted-foreground">
                      zuletzt{" "}
                      {format(parseISO(selected.achievedOn), "dd.MM.yyyy", {
                        locale: de,
                      })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Free Mode */}
          {mode === "free" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gewicht (kg)
              </Label>
              <Input
                type="number"
                step="0.5"
                value={freeWeight}
                onChange={(e) => setFreeWeight(e.target.value)}
                placeholder="z. B. 100"
                className="h-12 text-base"
                inputMode="decimal"
              />
            </div>
          )}

          {/* Percentage section */}
          {(mode === "free" || hasAny) && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prozent
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_PERCENTS.map((p) => {
                  const value = mode === "saved" ? percentage : freePercent
                  const isActive = value === String(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        if (mode === "saved") setPercentage(String(p))
                        else setFreePercent(String(p))
                      }}
                      className={cn(
                        "rounded-lg border-2 px-2 py-2 text-sm font-semibold transition-colors",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted bg-background hover:border-primary/40"
                      )}
                    >
                      {p}%
                    </button>
                  )
                })}
              </div>
              <Input
                type="number"
                min="1"
                max="150"
                value={mode === "saved" ? percentage : freePercent}
                onChange={(e) => {
                  if (mode === "saved") setPercentage(e.target.value)
                  else setFreePercent(e.target.value)
                }}
                placeholder="Eigenen Prozentwert eingeben"
                className="h-11"
                inputMode="decimal"
              />
            </div>
          )}

          {/* Result */}
          {(mode === "free" || hasAny) && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
              <div className="text-center">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ergebnis
                </div>
                <div className="text-4xl font-bold text-primary">
                  {result != null ? `${result.toFixed(1)} kg` : "—"}
                </div>
                {result != null && (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {mode === "saved"
                        ? `${percentage}% von ${selected?.weight} kg (${selected?.name})`
                        : `${freePercent}% von ${freeWeight} kg`}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs text-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Stange: {roundToBar(result).toFixed(1)} kg
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
        aria-label="Kraftwert hinzufügen"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddStrengthValueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={loadStrengthValues}
      />
    </div>
  )
}
