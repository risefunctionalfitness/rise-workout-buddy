-- 'legacy' ist ein Archiveintrag, keine ausspielbare Fassung. Solange sie als
-- veröffentlicht galt, hätte current_terms den Platzhaltertext geliefert.
update public.terms_documents set published_at = null where version = 'legacy';

-- Damit Mitglieder trotzdem nachlesen können, WAS sie akzeptiert haben:
-- veröffentlichte Fassungen sind für alle lesbar, dazu jede Fassung, der man
-- selbst zugestimmt hat.
drop policy if exists "terms lesbar wenn veroeffentlicht" on public.terms_documents;
create policy "terms lesbar wenn veroeffentlicht oder selbst akzeptiert"
  on public.terms_documents for select to authenticated
  using (
    published_at is not null
    or exists (
      select 1 from public.terms_acceptances a
      where a.user_id = auth.uid() and a.version = terms_documents.version
    )
  );
