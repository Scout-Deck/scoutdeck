-- ============================================================
-- Enums (match api-spec/openapi.yaml exactly)
-- ============================================================

create type opportunity_type as enum (
  'fellowship', 'builder_program', 'ambassador_program', 'hackathon', 'scholarship', 'grant'
);

create type opportunity_source_type as enum (
  'scraped', 'user_submitted'
);

create type profile_experience_level as enum (
  'student', 'recent_grad', 'early_career'
);

-- ============================================================
-- profiles
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  education_level text not null default '',
  field_of_study text not null default '',
  skills text[] not null default '{}',
  interests text not null default '',
  location text not null default '',
  remote_ok boolean not null default true,
  opportunity_types opportunity_type[] not null default '{}',
  experience_level profile_experience_level not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- opportunities
-- ============================================================

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  summary text not null,
  source_url text not null,
  type opportunity_type not null,
  score numeric not null default 0 check (score >= 0 and score <= 100),
  why text not null default '',
  deadline timestamptz,
  compensation text,
  source_type opportunity_source_type not null default 'scraped',
  is_prefetched boolean not null default false,
  required_skills text[] not null default '{}',

  -- flattened Eligibility
  education_level text not null default '',
  experience text not null default '',
  location text not null default '',
  remote_ok boolean not null default false,
  other_criteria text not null default '',

  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_type_idx on opportunities(type);
create index opportunities_source_type_idx on opportunities(source_type);
create index opportunities_prefetched_idx on opportunities(is_prefetched);
create index opportunities_deadline_idx on opportunities(deadline);
create unique index opportunities_source_url_unique_idx on opportunities(source_url);

alter table opportunities enable row level security;

create policy "Authenticated users can view opportunities"
  on opportunities for select
  to authenticated
  using (true);

create policy "Users can submit opportunities"
  on opportunities for insert
  to authenticated
  with check (auth.uid() = submitted_by);

-- ============================================================
-- opportunity_matches (personalised Scout pipeline results)
-- ============================================================

create table opportunity_matches (
  profile_id uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  match_score numeric not null check (match_score >= 0 and match_score <= 100),
  match_reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, opportunity_id)
);

create index opportunity_matches_profile_idx on opportunity_matches(profile_id);

alter table opportunity_matches enable row level security;

create policy "Users can view their own matches"
  on opportunity_matches for select
  using (auth.uid() = profile_id);

create policy "Users can create their own matches"
  on opportunity_matches for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own matches"
  on opportunity_matches for update
  using (auth.uid() = profile_id);

-- ============================================================
-- saved_opportunities (join table — powers /saved, /saved/{id})
-- ============================================================

create table saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create index saved_opportunities_user_idx on saved_opportunities(user_id);

alter table saved_opportunities enable row level security;

create policy "Users can view their own saved opportunities"
  on saved_opportunities for select
  using (auth.uid() = user_id);

create policy "Users can save opportunities"
  on saved_opportunities for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave opportunities"
  on saved_opportunities for delete
  using (auth.uid() = user_id);

-- ============================================================
-- updated_at auto-touch trigger (profiles + opportunities)
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger opportunities_set_updated_at
  before update on opportunities
  for each row execute function set_updated_at();

create trigger opportunity_matches_set_updated_at
  before update on opportunity_matches
  for each row execute function set_updated_at();
