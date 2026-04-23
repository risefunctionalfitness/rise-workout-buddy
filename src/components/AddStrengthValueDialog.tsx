import { useEffect, useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  STANDARD_LIFTS,
  GROUP_LABELS,
  GROUP_ORDER,
  findStandardLift,
} from "@/constants/standardLifts"

export interface StrengthEntry {
  id?: string
  liftName: string
  liftType: "standard" | "custom"
  weightKg: number
  achievedOn: Date
}

interface AddStrengthValueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialEntry?: StrengthEntry | null
  defaultLiftName?: string
}

export const AddStrengthValueDialog = ({
  open,
  onOpenChange,
  onSaved,
  initialEntry,
  defaultLiftName,
}: AddStrengthValueDialogProps) => {
  const { toast } = useToast()

  const isEdit = !!initialEntry?.id
  const lockedLiftName = isEdit ? initialEntry?.liftName : defaultLiftName

  const [liftType, setLiftType] = useState<"standard" | "custom">("standard")
  const [standardLiftName, setStandardLiftName] = useState<string>("")
  const [customName, setCustomName] = useState<string>("")
  const [weight, setWeight] = useState<string>("")
  const [date, setDate] = useState<Date>(new Date())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    // Initialize from props each time the dialog opens
    if (initialEntry) {
      setLiftType(initialEntry.liftType)
      if (initialEntry.liftType === "standard") {
        setStandardLiftName(initialEntry.liftName)
        setCustomName("")
      } else {
        setCustomName(initialEntry.liftName)
        setStandardLiftName("")
      }
      setWeight(initialEntry.weightKg?.toString() ?? "")
      setDate(initialEntry.achievedOn ?? new Date())
    } else if (defaultLiftName) {
      const std = findStandardLift(defaultLiftName)
      if (std) {
        setLiftType("standard")
        setStandardLiftName(defaultLiftName)
        setCustomName("")
      } else {
        setLiftType("custom")
        setCustomName(defaultLiftName)
        setStandardLiftName("")
      }
      setWeight("")
      setDate(new Date())
    } else {
      setLiftType("standard")
      setStandardLiftName("")
      setCustomName("")
      setWeight("")
      setDate(new Date())
    }
  }, [open, initialEntry, defaultLiftName])

  const liftName =
    liftType === "standard" ? standardLiftName : customName.trim()

  const handleSave = async () => {
    if (!liftName) {
      toast({
        title: "Übung fehlt",
        description: "Bitte wähle oder benenne eine Übung.",
        variant: "destructive",
      })
      return
    }
    const weightNum = parseFloat(weight)
    if (isNaN(weightNum) || weightNum <= 0) {
      toast({
        title: "Ungültiges Gewicht",
        description: "Bitte gib ein Gewicht größer als 0 ein.",
        variant: "destructive",
      })
      return
    }
    if (date > new Date()) {
      toast({
        title: "Ungültiges Datum",
        description: "Das Datum darf nicht in der Zukunft liegen.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Nicht angemeldet")

      const dateStr = format(date, "yyyy-MM-dd")
      const payload = {
        user_id: user.id,
        lift_type: liftType,
        lift_name: liftName,
        weight_kg: weightNum,
        achieved_on: dateStr,
      }

      if (isEdit && initialEntry?.id) {
        const { error } = await supabase
          .from("strength_history")
          .update(payload)
          .eq("id", initialEntry.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("strength_history")
          .insert(payload)
        if (error) throw error
      }

      // Sync legacy 1RM column on profile for the 8 classic lifts
      if (liftType === "standard") {
        const std = findStandardLift(liftName)
        if (std?.profileColumn) {
          // Only update profile if this entry is the latest known value
          const { data: latest } = await supabase
            .from("strength_history")
            .select("achieved_on, weight_kg")
            .eq("user_id", user.id)
            .eq("lift_name", liftName)
            .order("achieved_on", { ascending: false })
            .limit(1)
            .maybeSingle()

          const valueToSync = latest?.weight_kg ?? weightNum
          await supabase
            .from("profiles")
            .update({ [std.profileColumn]: valueToSync })
            .eq("user_id", user.id)
        }
      }

      toast({
        title: isEdit ? "Kraftwert aktualisiert" : "Kraftwert gespeichert",
        description: `${liftName} – ${weightNum} kg`,
      })
      onSaved()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving strength value:", error)
      toast({
        title: "Fehler",
        description: error.message ?? "Speichern fehlgeschlagen.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!initialEntry?.id) return
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("strength_history")
        .delete()
        .eq("id", initialEntry.id)
      if (error) throw error

      // Re-sync profile column with the remaining latest value (if standard)
      if (initialEntry.liftType === "standard") {
        const std = findStandardLift(initialEntry.liftName)
        if (std?.profileColumn) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const { data: latest } = await supabase
              .from("strength_history")
              .select("weight_kg")
              .eq("user_id", user.id)
              .eq("lift_name", initialEntry.liftName)
              .order("achieved_on", { ascending: false })
              .limit(1)
              .maybeSingle()

            await supabase
              .from("profiles")
              .update({ [std.profileColumn]: latest?.weight_kg ?? null })
              .eq("user_id", user.id)
          }
        }
      }

      toast({ title: "Eintrag gelöscht" })
      onSaved()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error deleting strength value:", error)
      toast({
        title: "Fehler",
        description: error.message ?? "Löschen fehlgeschlagen.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Kraftwert bearbeiten" : "Kraftwert hinzufügen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!lockedLiftName && (
            <div>
              <Label className="mb-2 block text-sm font-semibold">
                Übungstyp
              </Label>
              <RadioGroup
                value={liftType}
                onValueChange={(v) => setLiftType(v as "standard" | "custom")}
                className="grid grid-cols-2 gap-2"
              >
                <Label
                  htmlFor="type-standard"
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                    liftType === "standard"
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  )}
                >
                  <RadioGroupItem id="type-standard" value="standard" />
                  <span className="text-sm font-medium">Standard</span>
                </Label>
                <Label
                  htmlFor="type-custom"
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                    liftType === "custom"
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  )}
                >
                  <RadioGroupItem id="type-custom" value="custom" />
                  <span className="text-sm font-medium">Eigene</span>
                </Label>
              </RadioGroup>
            </div>
          )}

          {liftType === "standard" ? (
            <div>
              <Label className="mb-2 block text-sm font-semibold">Übung</Label>
              <Select
                value={standardLiftName}
                onValueChange={setStandardLiftName}
                disabled={!!lockedLiftName}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Übung wählen" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-72 bg-background">
                  {GROUP_ORDER.map((group) => {
                    const lifts = STANDARD_LIFTS.filter((l) => l.group === group)
                    return (
                      <SelectGroup key={group}>
                        <SelectLabel>{GROUP_LABELS[group]}</SelectLabel>
                        {lifts.map((lift) => (
                          <SelectItem key={lift.name} value={lift.name}>
                            {lift.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="mb-2 block text-sm font-semibold">
                Übungsname
              </Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="z. B. Pendlay Row"
                disabled={!!lockedLiftName && isEdit}
                className="h-11"
              />
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-semibold">
              Gewicht (kg)
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="z. B. 100"
              className="h-11 text-lg"
              inputMode="decimal"
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm font-semibold">Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date
                    ? format(date, "dd. MMMM yyyy", { locale: de })
                    : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-50 w-auto bg-background p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  locale={de}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={saving}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
