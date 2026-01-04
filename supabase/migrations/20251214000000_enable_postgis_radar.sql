-- Enable PostGIS extension
create extension if not exists postgis;

-- Ensure profiles table has correct columns for location (if not already present)
-- We use profile_lat and profile_lng from existing schema, but we can add a geography column for easier PostGIS use
alter table profiles
add column if not exists location geography(Point, 4326);

-- Index the location column for speed
create index if not exists profiles_location_idx on profiles using GIST (location);

-- Function to update the location column whenever lat/lng changes
create or replace function update_profile_location()
returns trigger as $$
begin
  if new.profile_lat is not null and new.profile_lng is not null then
    new.location := st_setsrid(st_make_point(new.profile_lng, new.profile_lat), 4326);
  else
    new.location := null;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to keep location column in sync
drop trigger if exists sync_profile_location on profiles;
create trigger sync_profile_location
before insert or update on profiles
for each row execute function update_profile_location();

-- Update existing rows
update profiles
set location = st_setsrid(st_make_point(profile_lng, profile_lat), 4326)
where profile_lat is not null and profile_lng is not null;

-- The Radar Function: Find users nearby
create or replace function get_users_nearby(
  lat float,
  lng float,
  radius_meters float
)
returns table (user_id uuid)
language plpgsql
security definer
as $$
begin
  return query
  select id
  from profiles
  where
    location is not null
    and st_dwithin(
      location,
      st_setsrid(st_make_point(lng, lat), 4326),
      radius_meters
    )
    and (notify_recommender = true or notify_recommender is null)
    and (recommender_paused = false or recommender_paused is null);
end;
$$;
