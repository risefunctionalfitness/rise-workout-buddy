-- =====================================================================
-- RISE · Versionierte AGB und nachweisbare Zustimmungen
-- ---------------------------------------------------------------------
-- Warum:
--   Heute steht der AGB-Text im Frontend-Code, und `terms_accepted_at`
--   ist nur ein Zeitstempel. Damit lässt sich nicht sagen, WELCHER
--   Fassung jemand zugestimmt hat — und genau das muss RISE im
--   Streitfall nach § 305 Abs. 2 BGB beweisen können.
--
--   Diese Migration legt zwei Tabellen an:
--     terms_documents    — jede Fassung mit Text und Veröffentlichungsdatum
--     terms_acceptances  — wer wann welcher Fassung zugestimmt hat
--
--   Die Zustimmungen sind bewusst als Historie angelegt und werden nie
--   überschrieben. Alte Zustimmungen bleiben als Nachweis erhalten.
--
-- Rein additiv: keine bestehende Spalte wird geändert oder gelöscht.
-- `profiles.terms_accepted_at` bleibt unangetastet.
-- =====================================================================

-- ------------------------------------------------- 1 · AGB-Fassungen
create table if not exists public.terms_documents (
  id           uuid primary key default gen_random_uuid(),
  version      text        not null unique,   -- z. B. '2026-09-09'
  title        text        not null default 'Allgemeine Geschäftsbedingungen',
  body_md      text        not null,          -- vollständiger Text (Markdown)
  summary_md   text,                          -- „Was hat sich geändert“
  published_at timestamptz,                   -- NULL = Entwurf, für Mitglieder unsichtbar
  created_at   timestamptz not null default now()
);

comment on column public.terms_documents.published_at is
  'NULL = Entwurf. Erst mit gesetztem Datum wird die Fassung in der App '
  'ausgeliefert. Das ist der Aus-Schalter für den Rollout.';

-- ------------------------------------------------- 2 · Zustimmungen
create table if not exists public.terms_acceptances (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  version     text        not null references public.terms_documents(version),
  accepted_at timestamptz not null default now(),
  source      text        not null default 'app',   -- 'app' | 'backfill' | 'papier'
  unique (user_id, version)
);

create index if not exists terms_acceptances_user_idx
  on public.terms_acceptances (user_id);
create index if not exists terms_acceptances_version_idx
  on public.terms_acceptances (version);

-- ------------------------------------------------- 3 · Zugriffsrechte
alter table public.terms_documents   enable row level security;
alter table public.terms_acceptances enable row level security;

drop policy if exists "terms lesbar wenn veroeffentlicht" on public.terms_documents;
create policy "terms lesbar wenn veroeffentlicht"
  on public.terms_documents for select to authenticated
  using (published_at is not null);

drop policy if exists "terms admin voll" on public.terms_documents;
create policy "terms admin voll"
  on public.terms_documents for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "eigene zustimmung lesen" on public.terms_acceptances;
create policy "eigene zustimmung lesen"
  on public.terms_acceptances for select to authenticated
  using (auth.uid() = user_id
         or public.has_role(auth.uid(), 'admin'::public.app_role));

-- Einfügen nur für sich selbst und nur für veröffentlichte Fassungen.
-- Kein UPDATE, kein DELETE: eine Zustimmung ist ein Beweis, kein Zustand.
drop policy if exists "eigene zustimmung anlegen" on public.terms_acceptances;
create policy "eigene zustimmung anlegen"
  on public.terms_acceptances for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.terms_documents d
      where d.version = terms_acceptances.version
        and d.published_at is not null
    )
  );

-- ------------------------------------------------- 4 · Altbestand sichern
-- Die 402 bisherigen Zustimmungen beziehen sich auf die alte Fassung.
-- Sie werden als Fassung 'legacy' übernommen, damit nichts verloren geht.
insert into public.terms_documents (version, title, body_md, published_at)
values ('legacy',
        'AGB — Fassung vor dem 9. September 2026',
        E'Der Text dieser Fassung lag nur im Frontend-Code und wurde beim '
        'Anlegen dieser Tabelle nicht archiviert.\n\n'
        'BITTE NACHTRAGEN: den alten AGB-Text aus dem Lovable-Projekt hier '
        'einfügen, damit das Archiv vollständig ist.',
        now())
on conflict (version) do nothing;

insert into public.terms_acceptances (user_id, version, accepted_at, source)
select p.user_id, 'legacy', p.terms_accepted_at, 'backfill'
from public.profiles p
where p.user_id is not null and p.terms_accepted_at is not null
  and exists (select 1 from auth.users u where u.id = p.user_id)
on conflict (user_id, version) do nothing;

insert into public.terms_acceptances (user_id, version, accepted_at, source)
select w.user_id, 'legacy', w.terms_accepted_at, 'backfill'
from public.wellpass_registrations w
where w.user_id is not null and w.terms_accepted_at is not null
  and exists (select 1 from auth.users u where u.id = w.user_id)
on conflict (user_id, version) do nothing;

-- ------------------------------------------------- 5 · Bequemer Zugriff
-- Was die App braucht: die aktuelle Fassung und ob ich ihr zugestimmt habe.
create or replace view public.current_terms
with (security_invoker = true) as
select d.version, d.title, d.body_md, d.summary_md, d.published_at,
       exists (
         select 1 from public.terms_acceptances a
         where a.user_id = auth.uid() and a.version = d.version
       ) as accepted_by_me
from public.terms_documents d
where d.published_at is not null
order by d.published_at desc
limit 1;
