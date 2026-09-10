# AGB-Versionierung und Zustimmungen

Stand: 10. September 2026

## Was das ist

Bis September 2026 stand der AGB-Text im Frontend-Code, und `profiles.terms_accepted_at`
war nur ein Zeitstempel. Damit ließ sich nicht sagen, **welcher Fassung** jemand
zugestimmt hat — was RISE im Streitfall nach § 305 Abs. 2 BGB aber beweisen können muss.

Seitdem liegen Text und Zustimmungen in der Datenbank.

## Tabellen

| Tabelle | Inhalt |
|---|---|
| `terms_documents` | Jede AGB-Fassung mit Volltext, Änderungszusammenfassung und `published_at` |
| `terms_acceptances` | Wer wann welcher Fassung zugestimmt hat — Historie, wird nie überschrieben |
| `current_terms` (View) | Die neueste veröffentlichte Fassung plus `accepted_by_me` für den eingeloggten Nutzer |

`published_at IS NULL` bedeutet **Entwurf**: unsichtbar für Mitglieder. Das ist der
Aus-Schalter für den Rollout — kein Deployment nötig.

## Migrationen in diesem Ordner

| Datei | Zweck |
|---|---|
| `20260910112221_terms_versioning.sql` | Tabellen, RLS, View, Übernahme der 404 Altzustimmungen als Fassung `legacy` |
| `20260910112512_terms_legacy_is_archive_not_current.sql` | Korrektur: `legacy` ist Archiv, nicht die aktuelle Fassung. Dazu die Leseregel, die auch selbst akzeptierte Fassungen freigibt |
| `20260910113000_terms_seed_2026_09_09.sql` | Der AGB-Text vom 9. September 2026 als Entwurf |

Die ersten beiden sind auf der Produktionsdatenbank bereits angewendet. Die dritte ist
idempotent und kann gefahrlos erneut laufen.

## Zugriffsregeln

- **Lesen von Fassungen**: alles Veröffentlichte, dazu jede Fassung, der man selbst
  zugestimmt hat.
- **Zustimmen**: nur für sich selbst und nur für veröffentlichte Fassungen.
- **Kein UPDATE, kein DELETE** auf Zustimmungen. Eine Zustimmung ist ein Beweis,
  kein Zustand.
- **Admins** (`has_role(auth.uid(), 'admin')`) dürfen Fassungen anlegen und ändern
  und alle Zustimmungen lesen.

## Rollout

```sql
-- live schalten
update public.terms_documents set published_at = now() where version = '2026-09-09';

-- wieder verstecken, falls im Frontend etwas klemmt
update public.terms_documents set published_at = null where version = '2026-09-09';

-- Zustimmungsquote
select
  (select count(*) from public.terms_acceptances where version = '2026-09-09') as zugestimmt,
  (select count(*) from public.profiles where user_id is not null)             as gesamt;
```

## Regeln fürs Frontend

Die Zustimmung ist **freiwillig**. Wer sie überspringt, nutzt die App uneingeschränkt
weiter und kann insbesondere weiter Kurse buchen.

Das ist eine bewusste Entscheidung: Bei laufenden Mitgliedschaften wäre eine erzwungene
Zustimmung nicht freiwillig und damit angreifbar — und das Zurückhalten einer bezahlten
Leistung wäre selbst eine Pflichtverletzung.

Konkret heißt das:

- Kein Dialog, der sich nicht schließen lässt, und keine Sperre der Kursbuchung.
- Die Checkbox ist **nicht** vorausgewählt, der Zustimmen-Button bleibt bis zum Haken deaktiviert.
- Der Volltext muss **vor** dem Zustimmen lesbar sein.
- Die Datenschutzerklärung wird **nicht** akzeptiert — sie ist eine Information und wird nur verlinkt.

## Offen

- Der alte AGB-Text aus dem Frontend gehört in die Zeile `version = 'legacy'`
  nachgetragen, damit das Archiv lückenlos ist.
- `profiles.terms_accepted_at` und `wellpass_registrations.terms_accepted_at` bleiben
  vorerst unangetastet. Sobald das Frontend nur noch `terms_acceptances` schreibt,
  können sie entfallen.
