-- Apply this once to an existing ScoutDeck Supabase project after schema.sql.
-- It is idempotent and adds the storage used by /api/opportunities/scout.

alter type opportunity_type add value if not exists 'builder_program';
alter type opportunity_type add value if not exists 'ambassador_program';
-- PostgreSQL cannot safely remove enum values in-place. Legacy categories
-- remain in an existing database for compatibility, but the app no longer
-- accepts, searches, or displays them.

alter table opportunities
  add column if not exists is_prefetched boolean not null default false;

create index if not exists opportunities_prefetched_idx
  on opportunities(is_prefetched);

-- Source URLs identify a live listing. Resolve historical duplicates before
-- adding the uniqueness guarantee used by the live persistence path.
delete from opportunities older
using opportunities newer
where older.source_url = newer.source_url
  and older.created_at < newer.created_at
  and not exists (select 1 from opportunity_matches match where match.opportunity_id = older.id)
  and not exists (select 1 from saved_opportunities saved where saved.opportunity_id = older.id);

create unique index if not exists opportunities_source_url_unique_idx
  on opportunities(source_url);

create table if not exists opportunity_matches (
  profile_id uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  match_score numeric not null check (match_score >= 0 and match_score <= 100),
  match_reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, opportunity_id)
);

create index if not exists opportunity_matches_profile_idx
  on opportunity_matches(profile_id);

alter table opportunity_matches enable row level security;

drop policy if exists "Users can view their own matches" on opportunity_matches;
create policy "Users can view their own matches"
  on opportunity_matches for select
  using (auth.uid() = profile_id);

drop policy if exists "Users can create their own matches" on opportunity_matches;
create policy "Users can create their own matches"
  on opportunity_matches for insert
  with check (auth.uid() = profile_id);

drop policy if exists "Users can update their own matches" on opportunity_matches;
create policy "Users can update their own matches"
  on opportunity_matches for update
  using (auth.uid() = profile_id);

drop trigger if exists opportunity_matches_set_updated_at on opportunity_matches;
create trigger opportunity_matches_set_updated_at
  before update on opportunity_matches
  for each row execute function set_updated_at();
