-- Apply this to existing ScoutDeck databases after scout_pipeline_migration.sql.
-- The field is nullable so existing profile rows remain valid.

alter table profiles
  add column if not exists experience text;
