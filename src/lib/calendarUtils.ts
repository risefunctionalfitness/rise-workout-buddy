import { format } from "date-fns";

interface CalendarEvent {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss or HH:mm
  endTime: string;   // HH:mm:ss or HH:mm
  trainer?: string;
  location?: string;
}

/**
 * Generates a Google Calendar URL with pre-filled event data
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { title, startDate, startTime, endTime, trainer, location = "Rise Gym" } = event;

  // Format dates for Google Calendar: YYYYMMDDTHHmmss
  const startDateTime = formatDateTimeForGoogle(startDate, startTime);
  const endDateTime = formatDateTimeForGoogle(startDate, endTime);

  const description = trainer ? `Trainer: ${trainer}` : "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startDateTime}/${endDateTime}`,
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

  const startDateTime = formatDateTimeForICS(startDate, startTime);
  const endDateTime = formatDateTimeForICS(startDate, endTime);
  const now = formatDateTimeForICS(
    format(new Date(), "yyyy-MM-dd"),
    format(new Date(), "HH:mm:ss")
  );

  const description = trainer ? `Trainer: ${trainer}` : "";
  const uid = `${startDate}-${startTime.replace(/:/g, "")}-${crypto.randomUUID()}@rise-gym`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rise Gym//Course Booking//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${escapeICSText(title)}`,
    `LOCATION:${escapeICSText(location)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  // Create and download the file
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
 * Format date and time for Google Calendar URL (YYYYMMDDTHHmmss)
 */
function formatDateTimeForGoogle(date: string, time: string): string {
  const cleanDate = date.replace(/-/g, "");
  const cleanTime = time.slice(0, 5).replace(/:/g, "") + "00";
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Format date and time for ICS file (YYYYMMDDTHHmmss)
 */
function formatDateTimeForICS(date: string, time: string): string {
  const cleanDate = date.replace(/-/g, "");
  const cleanTime = time.slice(0, 5).replace(/:/g, "") + "00";
  return `${cleanDate}T${cleanTime}`;
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
