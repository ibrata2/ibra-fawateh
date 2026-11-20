-- =====================================================================
--  فواتح ومناسبات IBRA — قاعدة بيانات الدليل العام (Supabase)
--  الصق هذا الملف كاملاً في: Supabase > SQL Editor > New query > Run
--  (كود الإدارة السري يُكتب في آخر سطر من الملف)
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------- الجداول ----------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('fatiha','wedding','tuhur','engagement','birth','hajj','other')),
  title       text not null check (char_length(title) between 2 and 120),
  tribe       text check (char_length(tribe) <= 80),
  province    text not null check (char_length(province) between 2 and 40),
  area        text check (char_length(area) <= 80),
  venue_type  text check (venue_type in ('house','husseiniya','mosque','hall','madhif','other')),
  venue       text check (char_length(venue) <= 120),
  date_from   date not null,
  date_to     date not null,
  time_text   text check (char_length(time_text) <= 80),
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  loc_url     text check (char_length(loc_url) <= 400),
  note        text check (char_length(note) <= 400),
  contact     text check (char_length(contact) <= 20),
  owner_hash  text not null,
  reports     int  not null default 0,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint date_range check (date_to >= date_from and date_to <= date_from + 30)
);
create index if not exists events_active_idx on public.events (date_to) where not hidden;
create index if not exists events_owner_idx  on public.events (owner_hash, created_at);

create table if not exists public.event_reports (
  event_id    uuid references public.events(id) on delete cascade,
  device_hash text not null,
  reason      text check (char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  primary key (event_id, device_hash)
);

create table if not exists public.admin_secret (
  id        int primary key default 1 check (id = 1),
  code_hash text not null
);

-- لا أحد يوصل للجداول مباشرة؛ كل شي يمر عبر الدوال تحت
alter table public.events        enable row level security;
alter table public.event_reports enable row level security;
alter table public.admin_secret  enable row level security;
revoke all on public.events, public.event_reports, public.admin_secret from anon, authenticated;

-- ---------- دوال مساعدة ----------
create or replace function public._h(t text) returns text
language sql immutable set search_path = public, extensions
as $$ select encode(digest(coalesce(t,''), 'sha256'), 'hex') $$;

create or replace function public._is_admin(p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if exists (select 1 from admin_secret where code_hash = crypt(p_code, code_hash)) then return true; end if;
  perform pg_sleep(1);   -- يبطّئ محاولات التخمين
  return false;
end $$;

create or replace function public._clean(t text, maxlen int) returns text
language sql immutable as $$ select nullif(left(btrim(coalesce(t,'')), maxlen), '') $$;

-- ---------- القراءة العامة ----------
create or replace function public.list_events()
returns table (id uuid, kind text, title text, tribe text, province text, area text,
               venue_type text, venue text, date_from date, date_to date, time_text text,
               lat double precision, lng double precision, loc_url text, note text,
               contact text, created_at timestamptz)
language sql stable security definer set search_path = public, extensions
as $$
  select e.id, e.kind, e.title, e.tribe, e.province, e.area, e.venue_type, e.venue,
         e.date_from, e.date_to, e.time_text, e.lat, e.lng, e.loc_url, e.note, e.contact, e.created_at
  from events e
  where not e.hidden and e.date_to >= current_date - 1
  order by e.date_from desc, e.created_at desc
  limit 3000
$$;

-- ---------- النشر ----------
create or replace function public.add_event(p jsonb, p_token text)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare oh text := _h(p_token); new_id uuid;
begin
  if p_token is null or char_length(p_token) < 16 then raise exception 'bad_token'; end if;
  if (select count(*) from events where owner_hash = oh and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limit';
  end if;
  if (select count(*) from events where created_at > now() - interval '10 minutes') >= 300 then
    raise exception 'busy';
  end if;
  insert into events (kind, title, tribe, province, area, venue_type, venue, date_from, date_to,
                      time_text, lat, lng, loc_url, note, contact, owner_hash)
  values (p->>'kind', _clean(p->>'title',120), _clean(p->>'tribe',80), _clean(p->>'province',40),
          _clean(p->>'area',80), nullif(p->>'venue_type',''), _clean(p->>'venue',120),
          (p->>'date_from')::date, coalesce(nullif(p->>'date_to','')::date, (p->>'date_from')::date),
          _clean(p->>'time_text',80), nullif(p->>'lat','')::float8, nullif(p->>'lng','')::float8,
          _clean(p->>'loc_url',400), _clean(p->>'note',400), _clean(p->>'contact',20), oh)
  returning id into new_id;
  delete from events where date_to < current_date - 60;   -- تنظيف المناسبات القديمة جداً
  return new_id;
end $$;

create or replace function public.update_event(p_id uuid, p jsonb, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  update events set
    kind = p->>'kind', title = _clean(p->>'title',120), tribe = _clean(p->>'tribe',80),
    province = _clean(p->>'province',40), area = _clean(p->>'area',80),
    venue_type = nullif(p->>'venue_type',''), venue = _clean(p->>'venue',120),
    date_from = (p->>'date_from')::date,
    date_to = coalesce(nullif(p->>'date_to','')::date, (p->>'date_from')::date),
    time_text = _clean(p->>'time_text',80), lat = nullif(p->>'lat','')::float8, lng = nullif(p->>'lng','')::float8,
    loc_url = _clean(p->>'loc_url',400), note = _clean(p->>'note',400), contact = _clean(p->>'contact',20)
  where id = p_id and owner_hash = _h(p_token);
  return found;
end $$;

create or replace function public.delete_event(p_id uuid, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  delete from events where id = p_id and owner_hash = _h(p_token);
  return found;
end $$;

-- ---------- الإبلاغ: 5 بلاغات من أجهزة مختلفة = يختفي ----------
create or replace function public.report_event(p_id uuid, p_device text, p_reason text default null)
returns int
language plpgsql security definer set search_path = public, extensions
as $$
declare n int;
begin
  if p_device is null or char_length(p_device) < 16 then raise exception 'bad_device'; end if;
  insert into event_reports (event_id, device_hash, reason)
  values (p_id, _h(p_device), _clean(p_reason,200)) on conflict do nothing;
  select count(*) into n from event_reports where event_id = p_id;
  update events set reports = n, hidden = (hidden or n >= 5) where id = p_id;
  return n;
end $$;

-- ---------- لوحة الإدارة ----------
create or replace function public.admin_list(p_code text)
returns table (id uuid, kind text, title text, tribe text, province text, area text, venue text,
               date_from date, date_to date, reports int, hidden boolean, created_at timestamptz,
               reasons text)
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if not _is_admin(p_code) then raise exception 'not_admin'; end if;
  return query
    select e.id, e.kind, e.title, e.tribe, e.province, e.area, e.venue, e.date_from, e.date_to,
           e.reports, e.hidden, e.created_at,
           (select string_agg(r.reason, ' | ') from event_reports r where r.event_id = e.id and r.reason is not null)
    from events e
    order by e.hidden desc, e.reports desc, e.created_at desc
    limit 500;
end $$;

create or replace function public.admin_action(p_code text, p_id uuid, p_action text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if not _is_admin(p_code) then raise exception 'not_admin'; end if;
  if p_action = 'delete' then delete from events where id = p_id;
  elsif p_action = 'hide' then update events set hidden = true where id = p_id;
  elsif p_action = 'unhide' then
    update events set hidden = false, reports = 0 where id = p_id;
    delete from event_reports where event_id = p_id;
  else raise exception 'bad_action'; end if;
  return found;
end $$;

-- ---------- الصلاحيات ----------
revoke all on function public._h(text), public._is_admin(text), public._clean(text,int) from public, anon, authenticated;
grant execute on function public.list_events()                          to anon, authenticated;
grant execute on function public.add_event(jsonb, text)                 to anon, authenticated;
grant execute on function public.update_event(uuid, jsonb, text)        to anon, authenticated;
grant execute on function public.delete_event(uuid, text)               to anon, authenticated;
grant execute on function public.report_event(uuid, text, text)         to anon, authenticated;
grant execute on function public.admin_list(text)                       to anon, authenticated;
grant execute on function public.admin_action(text, uuid, text)         to anon, authenticated;


-- ---------- إعدادات عامة تتعدّل من لوحة الإدارة (طرق الدعم، رابط التحميل، إعلان) ----------
create table if not exists public.app_config (
  key   text primary key check (key in ('support','download_link','announcement')),
  value text check (char_length(value) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

create or replace function public.get_config()
returns table (key text, value text)
language sql stable security definer set search_path = public, extensions
as $$ select c.key, c.value from app_config c $$;

create or replace function public.admin_set_config(p_code text, p_key text, p_value text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if not _is_admin(p_code) then raise exception 'not_admin'; end if;
  insert into app_config (key, value, updated_at) values (p_key, nullif(btrim(p_value),''), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return true;
end $$;
grant execute on function public.get_config()                         to anon, authenticated;
grant execute on function public.admin_set_config(text, text, text)   to anon, authenticated;

-- ---------- كود الإدارة ----------
insert into public.admin_secret (id, code_hash)
values (1, extensions.crypt('__ADMIN_CODE__', extensions.gen_salt('bf')))
on conflict (id) do update set code_hash = excluded.code_hash;
