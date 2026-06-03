// Globaler Feature-Flag für WhatsApp-Benachrichtigungen (Edge Functions).
// Muss synchron mit `src/config/features.ts` gehalten werden.
export const WHATSAPP_ENABLED = false;

interface NotificationProfile {
  notify_email_enabled?: boolean | null;
  notify_whatsapp_enabled?: boolean | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
}

export type NotificationMethod = 'email' | 'whatsapp' | 'both' | 'none';

/**
 * Bestimmt die Benachrichtigungsmethode für einen User unter Berücksichtigung
 * des WhatsApp-Feature-Flags. Wenn WhatsApp deaktiviert ist, wird ein User der
 * NUR WhatsApp aktiviert hatte auf Email zurückgefallen, damit er nicht ohne
 * Benachrichtigung dasteht.
 */
export function resolveNotificationMethod(profile: NotificationProfile | null | undefined): NotificationMethod {
  const wantsEmail = profile?.notify_email_enabled !== false; // default true
  const wantsWhatsAppRaw = !!(profile?.notify_whatsapp_enabled && profile?.phone_number);
  const wantsWhatsApp = WHATSAPP_ENABLED && wantsWhatsAppRaw;

  if (wantsEmail && wantsWhatsApp) return 'both';
  if (wantsEmail) return 'email';
  if (wantsWhatsApp) return 'whatsapp';
  // Fallback: User hatte nur WhatsApp an, aber WhatsApp ist deaktiviert -> Email
  if (!WHATSAPP_ENABLED && wantsWhatsAppRaw) return 'email';
  return 'none';
}

/**
 * Formatiert die Telefonnummer für Webhook-Payloads. Gibt null zurück, wenn
 * WhatsApp deaktiviert ist oder keine Nummer vorhanden ist.
 */
export function resolveWebhookPhone(profile: NotificationProfile | null | undefined): string | null {
  if (!WHATSAPP_ENABLED) return null;
  if (!profile?.phone_number || !profile?.notify_whatsapp_enabled) return null;
  const cleanCountryCode = (profile.phone_country_code || '+49').replace(/^\+/, '').replace(/\s/g, '');
  const cleanNumber = profile.phone_number.replace(/\s/g, '');
  return `${cleanCountryCode}${cleanNumber}`;
}
