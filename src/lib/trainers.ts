/**
 * Flo als Trainer erkennen.
 *
 * Im Kursplan steht der Trainername als freier Text und mal mit, mal ohne
 * Leerzeichen am Ende ("Flo" / "Flo "). Verlaesslich ist die Verknuepfung zum
 * Trainerprofil - der Name dient nur als Rueckfallebene fuer Kurse, die ohne
 * Verknuepfung angelegt wurden.
 */
export const FLO_TRAINER_USER_ID = '055a2fcd-6b5e-407a-b968-d8ccbb638aac'

export const isFloCourse = (course: {
  trainer?: string | null
  trainer_user_id?: string | null
}): boolean =>
  course.trainer_user_id === FLO_TRAINER_USER_ID ||
  (course.trainer || '').trim().toLowerCase() === 'flo'
