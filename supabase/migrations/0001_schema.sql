-- TripSync schema. Money is stored as integer minor units (paise/cents), never floats.
create extension if not exists "pgcrypto";

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '', email text, avatar_path text,
  preferred_currency char(3) not null default 'INR',
  travel_styles text[] not null default '{}', accommodation_pref text,
  dietary text, accessibility text, max_budget_minor bigint not null default 0 check (max_budget_minor >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null check (length(name) >= 2), description text, start_city text, destination text,
  start_date date not null, end_date date not null, check (end_date >= start_date),
  currency char(3) not null default 'INR',
  total_budget_minor bigint not null default 0 check (total_budget_minor >= 0),
  per_person_budget_minor bigint not null default 0 check (per_person_budget_minor >= 0),
  budget_flexibility text, status text not null default 'Planning' check (status in ('Planning','Voting','Confirmed','In progress','Completed')),
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  voting_deadline date, voting_closed boolean not null default false, chosen_destination_id uuid,
  category_budgets jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on trips(owner_id);

create table trip_members (
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('organizer','member')),
  status text not null default 'joined' check (status in ('invited','joined','declined')),
  budget_minor bigint not null default 0 check (budget_minor >= 0),
  styles text[] not null default '{}', pace text default 'balanced', accommodation_pref text, transport_pref text,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index on trip_members(user_id);

create table invitations (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  email text not null, invited_by uuid references profiles(id), status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(), unique (trip_id, email)
);
create table trip_preferences (
  trip_id uuid primary key references trips(id) on delete cascade, pace text, transport text, accommodation text, activities text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table destinations (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  name text not null, description text, cost_minor bigint not null default 0 check (cost_minor >= 0), days int not null default 1 check (days > 0),
  distance_km int, attractions text[] not null default '{}', image_url text, suggested_by uuid references profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on destinations(trip_id);
create table destination_votes (
  trip_id uuid not null references trips(id) on delete cascade, destination_id uuid not null references destinations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade, created_at timestamptz not null default now(),
  primary key (trip_id, user_id) -- one active vote per member per voting round
);
create table itinerary_days (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  day_number int not null check (day_number > 0), day_date date, unique (trip_id, day_number)
);
create table itinerary_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  day_id uuid references itinerary_days(id) on delete set null, day_number int not null default 1,
  title text not null, start_time time, duration_min int not null default 60 check (duration_min > 0), location text, description text,
  cost_minor bigint not null default 0 check (cost_minor >= 0), url text, notes text, responsible_user uuid references profiles(id),
  status text not null default 'planned' check (status in ('planned','reserved','done','skipped')), sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on itinerary_items(trip_id, day_number);
create table transportation_options (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  mode text not null check (mode in ('car','train','bus','flight','bike','other')), from_location text, to_location text,
  departs_at timestamptz, arrives_at timestamptz, fare_minor bigint not null default 0 check (fare_minor >= 0), url text, passengers text, notes text,
  status text not null default 'proposed' check (status in ('proposed','selected','confirmed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table accommodation_options (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  name text not null, location text, check_in date, check_out date, cost_minor bigint not null default 0 check (cost_minor >= 0),
  rooms int not null default 1 check (rooms > 0), room_allocation text, url text, cancellation_notes text,
  status text not null default 'proposed' check (status in ('proposed','selected','confirmed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table option_votes (
  trip_id uuid not null references trips(id) on delete cascade, option_kind text not null check (option_kind in ('transport','accommodation','itinerary')),
  option_id uuid not null, user_id uuid not null references profiles(id) on delete cascade, primary key (option_kind, option_id, user_id)
);

create table expenses (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  title text not null, amount_minor bigint not null check (amount_minor > 0),
  category text not null check (category in ('Transportation','Accommodation','Food','Activities','Shopping','Fuel','Tickets','Other')),
  expense_date date not null, paid_by uuid not null references profiles(id),
  split_method text not null check (split_method in ('equal','percentage','exact')), notes text, receipt_path text,
  created_by uuid not null references profiles(id), updated_by uuid references profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on expenses(trip_id, expense_date);
create table expense_participants (
  expense_id uuid not null references expenses(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id), primary key (expense_id, user_id)
);
create table expense_splits (
  expense_id uuid not null references expenses(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id), share_minor bigint not null check (share_minor >= 0), primary key (expense_id, user_id)
);
-- Shares must add up to the expense amount (checked at commit so rows can be inserted in any order).
create or replace function check_split_total() returns trigger language plpgsql as $$
declare eid uuid := coalesce(new.expense_id, old.expense_id); s bigint; a bigint;
begin
  select coalesce(sum(share_minor),0) into s from expense_splits where expense_id = eid;
  select amount_minor into a from expenses where id = eid;
  if a is not null and s <> a then raise exception 'Splits (%) must equal expense amount (%)', s, a; end if;
  return null;
end $$;
create constraint trigger expense_splits_total after insert or update or delete on expense_splits
  deferrable initially deferred for each row execute function check_split_total();
create table expense_history (
  id uuid primary key default gen_random_uuid(), expense_id uuid not null, trip_id uuid not null references trips(id) on delete cascade,
  edited_by uuid references profiles(id), note text, snapshot jsonb, created_at timestamptz not null default now()
);
create table settlements (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  from_user uuid not null references profiles(id), to_user uuid not null references profiles(id), check (from_user <> to_user),
  amount_minor bigint not null check (amount_minor > 0), status text not null default 'paid' check (status in ('paid','confirmed')),
  reference text, created_at timestamptz not null default now(), confirmed_at timestamptz
);
create index on settlements(trip_id);

create table comments (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  target_kind text not null, target_id uuid not null, author_id uuid not null references profiles(id), body text not null, created_at timestamptz not null default now()
);
create table polls (id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade, question text not null, created_by uuid references profiles(id), closes_at timestamptz, closed boolean not null default false, created_at timestamptz not null default now());
create table poll_options (id uuid primary key default gen_random_uuid(), poll_id uuid not null references polls(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade, label text not null);
create table poll_votes (poll_id uuid not null references polls(id) on delete cascade, option_id uuid not null references poll_options(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade, primary key (poll_id, user_id));
create table notifications (id uuid primary key default gen_random_uuid(), trip_id uuid references trips(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade, body text not null, dedupe_key text, read_at timestamptz, created_at timestamptz not null default now(), unique (user_id, dedupe_key));
create table trip_messages (id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade, author_id uuid not null references profiles(id), body text not null, reply_to uuid references trip_messages(id), pinned boolean not null default false, created_at timestamptz not null default now());
create table trip_decisions (id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade, title text not null, owner_id uuid references profiles(id), deadline date, status text not null default 'open' check (status in ('open','closed')), result_option_id uuid, created_at timestamptz not null default now());
create table decision_options (id uuid primary key default gen_random_uuid(), decision_id uuid not null references trip_decisions(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade, label text not null);
create table decision_votes (decision_id uuid not null references trip_decisions(id) on delete cascade, option_id uuid not null references decision_options(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade, primary key (decision_id, user_id));
create table trip_checklists (id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade, title text not null default 'Essentials');
create table checklist_items (id uuid primary key default gen_random_uuid(), checklist_id uuid not null references trip_checklists(id) on delete cascade, trip_id uuid not null references trips(id) on delete cascade, text text not null, done boolean not null default false);
create table activity_logs (id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade, actor_id uuid references profiles(id), action text not null, created_at timestamptz not null default now());
create index on activity_logs(trip_id, created_at desc);
create index on trip_messages(trip_id, created_at);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','trips','destinations','itinerary_items','transportation_options','accommodation_options','expenses'] loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop; end $$;

-- Auto-create a profile for each new auth user
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Creator becomes organizer automatically
create or replace function add_owner_as_member() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into trip_members (trip_id, user_id, role, status) values (new.id, new.owner_id, 'organizer', 'joined'); return new; end $$;
create trigger trip_owner_member after insert on trips for each row execute function add_owner_as_member();
