import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format, addDays, startOfWeek } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarDays, CalendarIcon, Clock, Users, Trash2, Edit, Plus } from "lucide-react"

interface CourseTemplate {
  id: string
  title: string
  trainer: string
  strength_exercise?: string
  max_participants: number
  registration_deadline_minutes: number
  cancellation_deadline_minutes: number
  duration_minutes: number
  created_at: string
}

interface Course {
  id: string
  title: string
  trainer: string
  strength_exercise?: string
  max_participants: number
  course_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  registration_deadline_minutes: number
  cancellation_deadline_minutes: number
  registered_count: number
  waitlist_count: number
}

interface ScheduleEntry {
  day: number // 0 = Monday, 6 = Sunday
  time: string
}

export const CourseTemplateManager = () => {
  const [templates, setTemplates] = useState<CourseTemplate[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('templates')

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    title: '',
    trainer: '',
    strength_exercise: '',
    max_participants: 16,
    registration_deadline_minutes: 30,
    cancellation_deadline_minutes: 60,
    duration_minutes: 60
  })

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    templateId: '',
    startDate: '',
    endDate: '',
    schedule: [] as ScheduleEntry[]
  })

  // Generation state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadTemplates(), loadCourses()])
    setLoading(false)
  }

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('course_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Fehler beim Laden der Vorlagen')
    }
  }

  const loadCourses = async () => {
    try {
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_registrations(status)
        `)
        .gte('course_date', format(new Date(), 'yyyy-MM-dd'))
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      const processedCourses = (coursesData || []).map(course => ({
        ...course,
        registered_count: course.course_registrations?.filter(r => r.status === 'registered').length || 0,
        waitlist_count: course.course_registrations?.filter(r => r.status === 'waitlist').length || 0
      }))

      setCourses(processedCourses)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Fehler beim Laden der Kurse')
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('course_templates')
        .insert(templateForm)

      if (error) throw error

      toast.success('Vorlage erfolgreich erstellt')
      setTemplateForm({
        title: '',
        trainer: '',
        strength_exercise: '',
        max_participants: 16,
        registration_deadline_minutes: 30,
        cancellation_deadline_minutes: 60,
        duration_minutes: 60
      })
      await loadTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Fehler beim Erstellen der Vorlage')
    }
  }

  const generateCourses = async () => {
    if (!selectedTemplate || !startDate || !endDate) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('generate_courses_from_template', {
        template_id_param: selectedTemplate.id,
        start_date_param: format(startDate, 'yyyy-MM-dd'),
        end_date_param: format(endDate, 'yyyy-MM-dd')
      })

      if (error) throw error

      toast.success('Kurse erfolgreich generiert!')
      setGenerateDialogOpen(false)
      setSelectedTemplate(null)
      setStartDate(undefined)
      setEndDate(undefined)
      await loadCourses()
    } catch (error) {
      console.error('Error generating courses:', error)
      toast.error('Fehler beim Generieren der Kurse')
    } finally {
      setLoading(false)
    }
  }

  const openGenerateDialog = (template: CourseTemplate) => {
    setSelectedTemplate(template)
    setGenerateDialogOpen(true)
  }

  const handleGenerateCourses = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleForm.templateId || !scheduleForm.startDate || !scheduleForm.endDate || scheduleForm.schedule.length === 0) {
      toast.error('Bitte füllen Sie alle Felder aus')
      return
    }

    try {
      const template = templates.find(t => t.id === scheduleForm.templateId)
      if (!template) throw new Error('Template not found')

      const startDate = new Date(scheduleForm.startDate)
      const endDate = new Date(scheduleForm.endDate)
      const coursesToCreate = []

      // Generate courses for each week in the date range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 7)) {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        
        scheduleForm.schedule.forEach(entry => {
          const courseDate = addDays(weekStart, entry.day)
          
          // Only create courses within the specified range and not in the past
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Reset time to midnight for date comparison
          if (courseDate >= startDate && courseDate <= endDate && courseDate >= today) {
            const [hours, minutes] = entry.time.split(':').map(Number)
            const startTime = entry.time
            const endTime = format(new Date(0, 0, 0, hours, minutes + template.duration_minutes), 'HH:mm')

            coursesToCreate.push({
              template_id: template.id,
              title: template.title,
              trainer: template.trainer,
              strength_exercise: template.strength_exercise,
              max_participants: template.max_participants,
              registration_deadline_minutes: template.registration_deadline_minutes,
              cancellation_deadline_minutes: template.cancellation_deadline_minutes,
              duration_minutes: template.duration_minutes,
              course_date: format(courseDate, 'yyyy-MM-dd'),
              start_time: startTime,
              end_time: endTime
            })
          }
        })
      }

      if (coursesToCreate.length === 0) {
        toast.error('Keine Kurse zu erstellen (alle Termine liegen in der Vergangenheit)')
        return
      }

      const { error } = await supabase
        .from('courses')
        .insert(coursesToCreate)

      if (error) throw error

      toast.success(`${coursesToCreate.length} Kurse erfolgreich erstellt`)
      setScheduleForm({
        templateId: '',
        startDate: '',
        endDate: '',
        schedule: []
      })
      await loadCourses()
    } catch (error) {
      console.error('Error generating courses:', error)
      toast.error('Fehler beim Erstellen der Kurse')
    }
  }

  const handleEditCourse = async (course: Course) => {
    setEditingCourse(course)
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const startTime = formData.get('start_time') as string
      const durationMinutes = parseInt(formData.get('duration_minutes') as string)
      
      // Calculate end time
      const [hours, minutes] = startTime.split(':').map(Number)
      const endTime = format(new Date(0, 0, 0, hours, minutes + durationMinutes), 'HH:mm')

      const updates = {
        title: formData.get('title') as string,
        trainer: formData.get('trainer') as string,
        strength_exercise: formData.get('strength_exercise') as string || null,
        max_participants: parseInt(formData.get('max_participants') as string),
        registration_deadline_minutes: parseInt(formData.get('registration_deadline_minutes') as string),
        cancellation_deadline_minutes: parseInt(formData.get('cancellation_deadline_minutes') as string),
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes
      }

      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', editingCourse.id)

      if (error) throw error

      toast.success('Kurs erfolgreich aktualisiert')
      setEditingCourse(null)
      await loadCourses()
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Fehler beim Aktualisieren des Kurses')
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Kurs löschen möchten?')) return

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

      if (error) throw error

      toast.success('Kurs erfolgreich gelöscht')
      await loadCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Fehler beim Löschen des Kurses')
    }
  }

  const addScheduleEntry = () => {
    setScheduleForm(prev => ({
      ...prev,
      schedule: [...prev.schedule, { day: 0, time: '09:00' }]
    }))
  }

  const updateScheduleEntry = (index: number, field: 'day' | 'time', value: string | number) => {
    setScheduleForm(prev => ({
      ...prev,
      schedule: prev.schedule.map((entry, i) => 
        i === index ? { ...entry, [field]: value } : entry
      )
    }))
  }

  const removeScheduleEntry = (index: number) => {
    setScheduleForm(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }))
  }

  const weekDays = [
    { value: 0, label: 'Montag' },
    { value: 1, label: 'Dienstag' },
    { value: 2, label: 'Mittwoch' },
    { value: 3, label: 'Donnerstag' },
    { value: 4, label: 'Freitag' },
    { value: 5, label: 'Samstag' },
    { value: 6, label: 'Sonntag' }
  ]

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Lade Kursverwaltung...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
          <TabsTrigger value="schedule">Terminplanung</TabsTrigger>
          <TabsTrigger value="courses">Kurse bearbeiten</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Neue Kursvorlage erstellen</CardTitle>
              <CardDescription>
                Erstellen Sie wiederverwendbare Vorlagen für Ihre Kurse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Titel</Label>
                    <Select value={templateForm.title} onValueChange={(value) => setTemplateForm(prev => ({ ...prev, title: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kurstyp wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Functional Fitness">Functional Fitness</SelectItem>
                        <SelectItem value="Strength">Strength</SelectItem>
                        <SelectItem value="Mobility">Mobility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trainer">Trainer</Label>
                    <Input
                      value={templateForm.trainer}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, trainer: e.target.value }))}
                      placeholder="Trainer Name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="strength_exercise">Kraftübung (optional)</Label>
                    <Input
                      value={templateForm.strength_exercise}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, strength_exercise: e.target.value }))}
                      placeholder="z.B. Back Squat, Deadlift"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_participants">Max. Teilnehmer</Label>
                    <Input
                      type="number"
                      min="1"
                      value={templateForm.max_participants}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="registration_deadline_minutes">Anmeldefrist (Minuten vor Start)</Label>
                    <Input
                      type="number"
                      min="15"
                      max="120"
                      value={templateForm.registration_deadline_minutes}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, registration_deadline_minutes: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cancellation_deadline_minutes">Abmeldefrist (Minuten vor Start)</Label>
                    <Input
                      type="number"
                      min="30"
                      max="480"
                      value={templateForm.cancellation_deadline_minutes}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, cancellation_deadline_minutes: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_minutes">Kursdauer (Minuten)</Label>
                    <Input
                      type="number"
                      min="30"
                      max="120"
                      value={templateForm.duration_minutes}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Vorlage erstellen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bestehende Vorlagen</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Kraftübung</TableHead>
                    <TableHead>Max. Teilnehmer</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell>{template.trainer}</TableCell>
                      <TableCell>
                        {template.strength_exercise ? (
                          <Badge variant="outline">{template.strength_exercise}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{template.max_participants}</TableCell>
                      <TableCell>{template.duration_minutes} min</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGenerateDialog(template)}
                        >
                          <CalendarDays className="h-4 w-4 mr-2" />
                          Kurse erstellen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kurse aus Vorlage generieren</CardTitle>
              <CardDescription>
                Wählen Sie eine Vorlage und erstellen Sie wiederkehrende Termine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateCourses} className="space-y-4">
                <div>
                  <Label>Vorlage auswählen</Label>
                  <Select value={scheduleForm.templateId} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, templateId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vorlage wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title} - {template.trainer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Startdatum</Label>
                    <Input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Enddatum</Label>
                    <Input
                      type="date"
                      value={scheduleForm.endDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Wochenplan</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addScheduleEntry}>
                      <Plus className="h-4 w-4 mr-2" />
                      Termin hinzufügen
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {scheduleForm.schedule.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={entry.day.toString()}
                          onValueChange={(value) => updateScheduleEntry(index, 'day', parseInt(value))}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {weekDays.map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={entry.time}
                          onChange={(e) => updateScheduleEntry(index, 'time', e.target.value)}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeScheduleEntry(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Kurse generieren
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geplante Kurse</CardTitle>
              <CardDescription>
                Bearbeiten und verwalten Sie bestehende Kurse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Zeit</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Teilnehmer</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        {format(new Date(course.course_date), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell>
                        {course.start_time} - {course.end_time}
                      </TableCell>
                      <TableCell className="font-medium">
                        {course.title}
                        {course.strength_exercise && (
                          <Badge variant="outline" className="ml-2">
                            {course.strength_exercise}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{course.trainer}</TableCell>
                      <TableCell>
                        {course.registered_count}/{course.max_participants}
                        {course.waitlist_count > 0 && (
                          <span className="text-sm text-muted-foreground ml-1">
                            (+{course.waitlist_count} Warteliste)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCourse(course)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Course Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kurs bearbeiten</DialogTitle>
          </DialogHeader>
          {editingCourse && (
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input name="title" defaultValue={editingCourse.title} required />
              </div>
              <div>
                <Label htmlFor="trainer">Trainer</Label>
                <Input name="trainer" defaultValue={editingCourse.trainer} required />
              </div>
              <div>
                <Label htmlFor="strength_exercise">Kraftübung</Label>
                <Input name="strength_exercise" defaultValue={editingCourse.strength_exercise || ''} />
              </div>
              <div>
                <Label htmlFor="max_participants">Max. Teilnehmer</Label>
                <Input name="max_participants" type="number" min="1" defaultValue={editingCourse.max_participants} required />
              </div>
              <div>
                <Label htmlFor="registration_deadline_minutes">Anmeldefrist (Minuten vor Start)</Label>
                <Input name="registration_deadline_minutes" type="number" min="15" max="120" defaultValue={editingCourse.registration_deadline_minutes} required />
              </div>
              <div>
                <Label htmlFor="cancellation_deadline_minutes">Abmeldefrist (Minuten vor Start)</Label>
                <Input name="cancellation_deadline_minutes" type="number" min="30" max="480" defaultValue={editingCourse.cancellation_deadline_minutes} required />
              </div>
              <div>
                <Label htmlFor="start_time">Startzeit</Label>
                <Input name="start_time" type="time" defaultValue={editingCourse.start_time} required />
              </div>
              <div>
                <Label htmlFor="duration_minutes">Dauer (Minuten)</Label>
                <Input name="duration_minutes" type="number" min="30" max="120" defaultValue={editingCourse.duration_minutes} required />
              </div>
              <Button type="submit" className="w-full">
                Kurs aktualisieren
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Courses Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kurse generieren</DialogTitle>
            <DialogDescription>
              Erstelle Kurse aus der Vorlage "{selectedTemplate?.title}" für den gewählten Zeitraum.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Startdatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: de }) : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={de}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">Enddatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: de }) : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={de}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={generateCourses} 
              disabled={loading || !startDate || !endDate}
            >
              {loading ? "Generiere..." : "Kurse erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CourseTemplateManager;