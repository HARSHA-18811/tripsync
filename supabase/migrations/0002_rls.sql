-- Row Level Security: only members of a trip can read or write that trip's data.
create or replace function is_trip_member(tid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = tid and user_id = auth.uid() and status = 'joined') $$;
create or replace function is_trip_organizer(tid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = tid and user_id = auth.uid() and role = 'organizer' and status = 'joined') $$;

-- Join by invite code. Validates the code server-side; users cannot insert themselves into arbitrary trips.
create or replace function join_trip_by_code(code text) returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id into tid from trips where invite_code = upper(trim(code));
  if tid is null then raise exception 'Invalid invite code'; end if;
  insert into trip_members (trip_id, user_id, role, status) values (tid, auth.uid(), 'member', 'joined')
    on conflict (trip_id, user_id) do update set status = 'joined';
  return tid;
end $$;
revoke all on function join_trip_by_code(text) from public; grant execute on function join_trip_by_code(text) to authenticated;

-- profiles: own row, plus co-members' basic profile
alter table profiles enable row level security;
create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_comembers_read on profiles for select using (exists (
  select 1 from trip_members a join trip_members b on a.trip_id = b.trip_id where a.user_id = auth.uid() and b.user_id = profiles.id));

-- trips
alter table trips enable row level security;
create policy trips_read on trips for select using (is_trip_member(id) or owner_id = auth.uid());
create policy trips_insert on trips for insert with check (owner_id = auth.uid());
create policy trips_update on trips for update using (is_trip_organizer(id)) with check (is_trip_organizer(id));
create policy trips_delete on trips for delete using (owner_id = auth.uid());

-- trip_members: members see each other; organizer manages; a user can leave (delete self) or update own prefs
alter table trip_members enable row level security;
create policy tm_read on trip_members for select using (is_trip_member(trip_id) or user_id = auth.uid());
create policy tm_organizer_insert on trip_members for insert with check (is_trip_organizer(trip_id));
create policy tm_update on trip_members for update using (user_id = auth.uid() or is_trip_organizer(trip_id)) with check (user_id = auth.uid() or is_trip_organizer(trip_id));
create policy tm_delete on trip_members for delete using (user_id = auth.uid() or is_trip_organizer(trip_id));

-- Generic "members only" policy for every trip-scoped table with a trip_id column
do $$ declare t text; begin
  foreach t in array array['invitations','trip_preferences','destinations','destination_votes','itinerary_days','itinerary_items','transportation_options','accommodation_options','option_votes',
    'expense_participants','expense_splits','expense_history','settlements','comments','polls','poll_options','poll_votes','trip_messages','trip_decisions','decision_options','decision_votes',
    'trip_checklists','checklist_items','activity_logs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id))', t || '_members', t);
  end loop; end $$;

-- Votes: a member can only cast/change their own vote
drop policy destination_votes_members on destination_votes;
create policy dv_read on destination_votes for select using (is_trip_member(trip_id));
create policy dv_write on destination_votes for all using (is_trip_member(trip_id) and user_id = auth.uid()) with check (is_trip_member(trip_id) and user_id = auth.uid());

-- Expenses: any member may add; only creator or organizer may edit/delete
alter table expenses enable row level security;
create policy exp_read on expenses for select using (is_trip_member(trip_id));
create policy exp_insert on expenses for insert with check (is_trip_member(trip_id) and created_by = auth.uid());
create policy exp_update on expenses for update using (created_by = auth.uid() or is_trip_organizer(trip_id)) with check (is_trip_member(trip_id));
create policy exp_delete on expenses for delete using (created_by = auth.uid() or is_trip_organizer(trip_id));

-- Settlements: only the payer can mark paid; only the receiver can confirm
drop policy settlements_members on settlements;
create policy st_read on settlements for select using (is_trip_member(trip_id));
create policy st_insert on settlements for insert with check (is_trip_member(trip_id) and from_user = auth.uid() and status = 'paid');
create policy st_confirm on settlements for update using (to_user = auth.uid() and is_trip_member(trip_id)) with check (to_user = auth.uid());

-- Notifications: only your own
alter table notifications enable row level security;
create policy notif_own on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage: private buckets, paths must start with the trip id and the caller must be a member
insert into storage.buckets (id, name, public) values ('receipts','receipts',false), ('trip-images','trip-images',false), ('avatars','avatars',false) on conflict do nothing;
create policy receipts_members on storage.objects for all
  using (bucket_id in ('receipts','trip-images') and is_trip_member(((storage.foldername(name))[1])::uuid))
  with check (bucket_id in ('receipts','trip-images') and is_trip_member(((storage.foldername(name))[1])::uuid));
create policy avatars_own on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
