import { format } from "date-fns";

interface CalendarEvent {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss or HH:mm
  endTime: string;   // HH:mm:ss or HH:mm
  trainer?: string;
  location?: string;
}

const TIMEZONE = "Europe/Berlin";

/**
 * Generates a Google Calendar URL with pre-filled event data
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { title, startDate, startTime, endTime, trainer, location = "Rise Gym" } = event;

  const startDateTime = formatDateTimeLocal(startDate, startTime);
  const endDateTime = formatDateTimeLocal(startDate, endTime);

  const description = trainer ? `Trainer: ${trainer}` : "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startDateTime}/${endDateTime}`,
    ctz: TIMEZONE,
    location: location,
    details: description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and downloads an ICS file for Apple Calendar / Outlook
 */
export function downloadICSFile(event: CalendarEvent): void {
  const { title, startDate, startTime, endTime, trainer, location = "Rise Gym" } = event;

  const startDateTime = formatDateTimeLocal(startDate, startTime);
  const endDateTime = formatDateTimeLocal(startDate, endTime);
  const now = formatUTCStamp(new Date());

  const description = trainer ? `Trainer: ${trainer}` : "";
  const uid = `${startDate}-${startTime.replace(/:/g, "")}-${crypto.randomUUID()}@rise-gym`;

  // VTIMEZONE block for Europe/Berlin so iOS/Apple Calendar interprets the
  // local times correctly instead of treating them as UTC.
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rise Gym//Course Booking//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${TIMEZONE}`,
    "X-LIC-LOCATION:Europe/Berlin",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${TIMEZONE}:${startDateTime}`,
    `DTEND;TZID=${TIMEZONE}:${endDateTime}`,
    `SUMMARY:${escapeICSText(title)}`,
    `LOCATION:${escapeICSText(location)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${startDate}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date and time as local time string (YYYYMMDDTHHmmss).
 * Used with TZID/ctz to anchor the value to Europe/Berlin.
 */
function formatDateTimeLocal(date: string, time: string): string {
  const cleanDate = date.replace(/-/g, "");
  const cleanTime = time.slice(0, 5).replace(/:/g, "") + "00";
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Format a Date as UTC timestamp (YYYYMMDDTHHmmssZ) for DTSTAMP.
 */
function formatUTCStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Escape special characters for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
