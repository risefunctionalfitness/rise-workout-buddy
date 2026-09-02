// Teilnahmebescheinigungen fuer Praeventionskurse
//
// Laeuft taeglich. Sucht Praeventionskarten, deren 8 Wochen abgelaufen sind,
// fuellt das ZPP-Formular aus, legt es im Speicher ab und schickt es ueber
// Make per E-Mail an das Mitglied (Kopie an das Studio).
//
// Aufrufe:
//   {}                                  -> normaler Lauf
//   { "dry_run": true }                 -> erzeugt die PDFs, verschickt aber nichts
//   { "test_email": "flo@..." }         -> eine Musterbescheinigung an diese Adresse
//   { "certificate_id": "uuid" }        -> vorhandene Bescheinigung erneut senden

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const BUCKET = "praevention"
const VORLAGE = "vorlage.pdf"
const UNTERSCHRIFT = "unterschrift.png"
const KOPIE_AN = "florian@rise-ff.de"

// Formularfelder von Teil 1 (Teil 2 fuellt das Mitglied selbst aus)
const FELD_NAME = "AcroFormField"
const FELD_VON = "AcroFormField_19"
const FELD_BIS = "AcroFormField_21"
const FELD_EINHEITEN = "AcroFormField_23"
const FELD_ORT = "AcroFormField_28"
const FELD_DATUM = "AcroFormField_30"

// Grauer Kasten der Unterschrift, aus dem Formular ausgemessen
const SIG_X = 272.1
const SIG_MITTE_Y = (389.7 + 401.2) / 2
const SIG_HOEHE = 22
const SIG_LINKS = 8

const ORT = "Pfronten"

const datumDE = (iso: string) => {
  const [j, m, t] = iso.split("-")
  return `${t}.${m}.${j}`
}

const mailText = (vorname: string) =>
  `Hallo ${vorname},

anbei findest du deine Teilnahmebestätigung für unseren Functional Fitness Präventionskurs. Bitte fülle den zweiten Teil des Dokuments selber aus und sende ihn an deine Krankenkasse um deine Bezuschussung direkt von der Krankenkasse zu bekommen.

Bei Fragen melde dich gerne.

Viele Grüße
Flo
RISE Functional Fitness`

interface Faellig {
  user_id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  validity_start: string
  period_from: string
  period_to: string
  signature_date: string
  units: number
  units_counted: number
  cert_year: number
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
    const dryRun: boolean = body.dry_run === true
    const testEmail: string | undefined = body.test_email
    const resendId: string | undefined = body.certificate_id

    // Testmail und erneutes Senden duerfen nur Admins ausloesen - sonst
    // koennte sich jedes angemeldete Mitglied ein unterschriebenes Formular
    // schicken lassen. Der Zeitplan laeuft ohne Benutzer und macht nur den
    // normalen Durchlauf.
    if (testEmail || resendId) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "")
      let istAdmin = false
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) {
          const { data: rollen } = await supabase
            .from("user_roles").select("role").eq("user_id", user.id)
          istAdmin = !!rollen?.some((r: { role: string }) => r.role === "admin")
        }
      }
      if (!istAdmin) return json({ ok: false, fehler: "Nur Admins" }, 403)
    }

    // --- Webhook-Adresse: Umgebungsvariable hat Vorrang, sonst aus der Tabelle
    let webhookUrl = Deno.env.get("MAKE_PRAEVENTION_WEBHOOK_URL") ?? ""
    if (!webhookUrl) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "make_praevention_webhook_url")
        .maybeSingle()
      webhookUrl = data?.value ?? ""
    }

    // --- Vorlage und Unterschrift einmalig laden
    const [vorlageRes, sigRes] = await Promise.all([
      supabase.storage.from(BUCKET).download(VORLAGE),
      supabase.storage.from(BUCKET).download(UNTERSCHRIFT),
    ])
    if (vorlageRes.error || !vorlageRes.data) {
      throw new Error(`Vorlage fehlt im Ordner "${BUCKET}" (${VORLAGE}): ${vorlageRes.error?.message}`)
    }
    if (sigRes.error || !sigRes.data) {
      throw new Error(`Unterschrift fehlt im Ordner "${BUCKET}" (${UNTERSCHRIFT}): ${sigRes.error?.message}`)
    }
    const vorlageBytes = new Uint8Array(await vorlageRes.data.arrayBuffer())
    const sigBytes = new Uint8Array(await sigRes.data.arrayBuffer())

    // --- PDF bauen
    const baueBescheinigung = async (d: {
      name: string; von: string; bis: string; einheiten: number; datum: string
    }): Promise<Uint8Array> => {
      const pdf = await PDFDocument.load(vorlageBytes)
      const form = pdf.getForm()
      const font = await pdf.embedFont(StandardFonts.Helvetica)

      const setze = (feld: string, wert: string) => {
        const f = form.getTextField(feld)
        f.setText(wert)
        f.updateAppearances(font)
      }
      setze(FELD_NAME, d.name)
      setze(FELD_VON, datumDE(d.von))
      setze(FELD_BIS, datumDE(d.bis))
      setze(FELD_EINHEITEN, String(d.einheiten))
      setze(FELD_ORT, ORT)
      setze(FELD_DATUM, datumDE(d.datum))

      const png = await pdf.embedPng(sigBytes)
      const breite = SIG_HOEHE * (png.width / png.height)
      pdf.getPage(0).drawImage(png, {
        x: SIG_X + SIG_LINKS,
        y: SIG_MITTE_Y - SIG_HOEHE / 2,
        width: breite,
        height: SIG_HOEHE,
      })

      // Nur die von uns gefuellten Felder wurden neu gezeichnet; das leere
      // IKT-Kaestchen behaelt dadurch seinen Rahmen. Teil 2 bleibt ausfuellbar.
      return await pdf.save({ updateFieldAppearances: false })
    }

    const dateiName = (name: string, bis: string) =>
      `Teilnahmebescheinigung_${name.replace(/[^\p{L}\p{N}]+/gu, "_")}_${bis}.pdf`

    const sendeAnMake = async (nutzlast: Record<string, unknown>) => {
      if (!webhookUrl) throw new Error("Keine Make-Webhook-Adresse hinterlegt")
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nutzlast),
      })
      if (!res.ok) throw new Error(`Make antwortete mit ${res.status}: ${await res.text()}`)
    }

    // --- Testlauf: Musterbescheinigung an eine feste Adresse
    if (testEmail) {
      const heute = new Date().toISOString().slice(0, 10)
      const bis = new Date(Date.now() + 49 * 864e5).toISOString().slice(0, 10)
      const pdfBytes = await baueBescheinigung({
        name: "Max Mustermann", von: heute, bis, einheiten: 8,
        datum: new Date(Date.now() + 56 * 864e5).toISOString().slice(0, 10),
      })
      const pfad = `test/${crypto.randomUUID()}.pdf`
      await supabase.storage.from(BUCKET).upload(pfad, pdfBytes, { contentType: "application/pdf" })
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(pfad, 60 * 60 * 24 * 30)
      await sendeAnMake({
        typ: "teilnahmebescheinigung",
        test: true,
        email: testEmail,
        vorname: "Max",
        nachname: "Mustermann",
        betreff: "TEST - Deine Teilnahmebestätigung",
        text: mailText("Max"),
        dateiname: "Teilnahmebescheinigung_TEST.pdf",
        pdf_url: signed?.signedUrl,
        kopie_an: null,
      })
      return json({ ok: true, modus: "test", bytes: pdfBytes.length, pdf_url: signed?.signedUrl })
    }

    // --- Erneut senden
    if (resendId) {
      const { data: cert, error } = await supabase
        .from("prevention_certificates").select("*").eq("id", resendId).single()
      if (error || !cert) throw new Error("Bescheinigung nicht gefunden")
      const { data: signed } = await supabase.storage.from(BUCKET)
        .createSignedUrl(cert.pdf_path, 60 * 60 * 24 * 30)
      const { data: userData } = await supabase.auth.admin.getUserById(cert.user_id)
      const { data: prof } = await supabase.from("profiles")
        .select("first_name, last_name, email").eq("user_id", cert.user_id).maybeSingle()
      const email = userData?.user?.email ?? prof?.email ?? cert.recipient_email
      const vorname = prof?.first_name ?? ""
      await sendeAnMake({
        typ: "teilnahmebescheinigung",
        email, vorname, nachname: prof?.last_name ?? "",
        betreff: "Deine Teilnahmebestätigung für den Präventionskurs",
        text: mailText(vorname),
        dateiname: dateiName(`${vorname}_${prof?.last_name ?? ""}`, cert.period_to),
        pdf_url: signed?.signedUrl,
        kopie_an: KOPIE_AN,
      })
      await supabase.from("prevention_certificates")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", resendId)
      return json({ ok: true, modus: "erneut_gesendet", id: resendId })
    }

    // --- Normaler Lauf
    const { data: faellige, error: faelligError } = await supabase
      .rpc("get_due_prevention_certificates")
    if (faelligError) throw faelligError

    const ergebnisse: unknown[] = []

    for (const f of (faellige ?? []) as Faellig[]) {
      try {
        const pdfBytes = await baueBescheinigung({
          name: f.full_name,
          von: f.period_from,
          bis: f.period_to,
          einheiten: f.units,
          datum: f.signature_date,
        })

        const pfad = `bescheinigungen/${f.cert_year}/${f.user_id}_${f.validity_start}.pdf`
        const up = await supabase.storage.from(BUCKET)
          .upload(pfad, pdfBytes, { contentType: "application/pdf", upsert: true })
        if (up.error) throw up.error

        const { data: userData } = await supabase.auth.admin.getUserById(f.user_id)
        const { data: prof } = await supabase.from("profiles")
          .select("email").eq("user_id", f.user_id).maybeSingle()
        const email = userData?.user?.email ?? prof?.email ?? null
        const vorname = f.first_name ?? ""

        // Zeile anlegen - schuetzt gleichzeitig vor Doppelversand
        const { data: cert, error: insErr } = await supabase
          .from("prevention_certificates")
          .insert({
            user_id: f.user_id,
            validity_start: f.validity_start,
            period_from: f.period_from,
            period_to: f.period_to,
            signature_date: f.signature_date,
            units: f.units,
            units_counted: f.units_counted,
            cert_year: f.cert_year,
            pdf_path: pfad,
            recipient_email: email,
            status: "pending",
          })
          .select("id").single()
        if (insErr) throw insErr

        if (dryRun) {
          ergebnisse.push({ name: f.full_name, einheiten: f.units, pfad, status: "dry_run" })
          continue
        }

        if (!email) throw new Error("Keine E-Mail-Adresse hinterlegt")

        const { data: signed } = await supabase.storage.from(BUCKET)
          .createSignedUrl(pfad, 60 * 60 * 24 * 30)

        await sendeAnMake({
          typ: "teilnahmebescheinigung",
          email,
          vorname,
          nachname: f.last_name ?? "",
          betreff: "Deine Teilnahmebestätigung für den Präventionskurs",
          text: mailText(vorname),
          dateiname: dateiName(f.full_name, f.period_to),
          pdf_url: signed?.signedUrl,
          kopie_an: KOPIE_AN,
        })

        await supabase.from("prevention_certificates")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", cert.id)

        // Praeventionskurs-Haken setzen (erst 1, dann 2)
        const { data: credits } = await supabase.from("membership_credits")
          .select("prevention_course_1, prevention_course_2")
          .eq("user_id", f.user_id).maybeSingle()
        if (credits && !credits.prevention_course_1) {
          await supabase.from("membership_credits")
            .update({ prevention_course_1: true }).eq("user_id", f.user_id)
        } else if (credits && !credits.prevention_course_2) {
          await supabase.from("membership_credits")
            .update({ prevention_course_2: true }).eq("user_id", f.user_id)
        }

        ergebnisse.push({ name: f.full_name, email, einheiten: f.units, status: "gesendet" })
      } catch (e) {
        const meldung = e instanceof Error ? e.message : String(e)
        await supabase.from("prevention_certificates")
          .update({ status: "failed", error: meldung })
          .eq("user_id", f.user_id).eq("validity_start", f.validity_start)
        ergebnisse.push({ name: f.full_name, status: "fehler", fehler: meldung })
      }
    }

    return json({ ok: true, gefunden: (faellige ?? []).length, ergebnisse })
  } catch (e) {
    const meldung = e instanceof Error ? e.message : String(e)
    console.error("send-prevention-certificates:", meldung)
    return json({ ok: false, fehler: meldung }, 500)
  }
})

function json(daten: unknown, status = 200) {
  return new Response(JSON.stringify(daten), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  })
}
