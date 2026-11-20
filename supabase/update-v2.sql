-- فواتح ومناسبات IBRA — تحديث 2: مناسبات خاصة بالرابط، نطاق الإشعارات، اسم الناشر، أنواع جديدة
alter table public.events add column if not exists visibility text not null default 'public';
alter table public.events add column if not exists reach_km int;
alter table public.events add column if not exists poster_name text;
alter table public.events drop constraint if exists events_visibility_check;
alter table public.events add constraint events_visibility_check check (visibility in ('public','private'));
alter table public.events drop constraint if exists events_reach_check;
alter table public.events add constraint events_reach_check check (reach_km is null or reach_km between 1 and 1000);
alter table public.events drop constraint if exists events_poster_check;
alter table public.events add constraint events_poster_check check (char_length(poster_name) <= 60);
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('fatiha','majlis','memorial','religious','wedding','tuhur','engagement','birth','hajj','other'));

drop function if exists public.list_events();
create function public.list_events()
returns table (id uuid, kind text, title text, tribe text, province text, area text, venue_type text, venue text,
 date_from date, date_to date, time_text text, lat double precision, lng double precision, loc_url text, note text,
 contact text, created_at timestamptz, visibility text, reach_km int, poster_name text)
language sql stable security definer set search_path = public, extensions
as $$
 select e.id, e.kind, e.title, e.tribe, e.province, e.area, e.venue_type, e.venue, e.date_from, e.date_to, e.time_text,
 e.lat, e.lng, e.loc_url, e.note, e.contact, e.created_at, e.visibility, e.reach_km, e.poster_name
 from events e where not e.hidden and e.visibility = 'public' and e.date_to >= current_date - 1
 order by e.date_from desc, e.created_at desc limit 3000
$$;

drop function if exists public.get_event(uuid);
create function public.get_event(p_id uuid)
returns table (id uuid, kind text, title text, tribe text, province text, area text, venue_type text, venue text,
 date_from date, date_to date, time_text text, lat double precision, lng double precision, loc_url text, note text,
 contact text, created_at timestamptz, visibility text, reach_km int, poster_name text)
language sql stable security definer set search_path = public, extensions
as $$
 select e.id, e.kind, e.title, e.tribe, e.province, e.area, e.venue_type, e.venue, e.date_from, e.date_to, e.time_text,
 e.lat, e.lng, e.loc_url, e.note, e.contact, e.created_at, e.visibility, e.reach_km, e.poster_name
 from events e where e.id = p_id and not e.hidden
$$;

create or replace function public.add_event(p jsonb, p_token text)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare oh text := _h(p_token); new_id uuid;
begin
 if p_token is null or char_length(p_token) < 16 then raise exception 'bad_token'; end if;
 if (select count(*) from events where owner_hash = oh and created_at > now() - interval '1 hour') >= 5 then raise exception 'rate_limit'; end if;
 if (select count(*) from events where created_at > now() - interval '10 minutes') >= 300 then raise exception 'busy'; end if;
 insert into events (kind, title, tribe, province, area, venue_type, venue, date_from, date_to, time_text, lat, lng, loc_url, note, contact,
   visibility, reach_km, poster_name, owner_hash)
 values (p->>'kind', _clean(p->>'title',120), _clean(p->>'tribe',80), _clean(p->>'province',40), _clean(p->>'area',80),
   nullif(p->>'venue_type',''), _clean(p->>'venue',120), (p->>'date_from')::date,
   coalesce(nullif(p->>'date_to','')::date, (p->>'date_from')::date), _clean(p->>'time_text',80),
   nullif(p->>'lat','')::float8, nullif(p->>'lng','')::float8, _clean(p->>'loc_url',400), _clean(p->>'note',400), _clean(p->>'contact',20),
   coalesce(nullif(p->>'visibility',''),'public'), nullif(p->>'reach_km','')::int, _clean(p->>'poster_name',60), oh)
 returning id into new_id;
 delete from events where date_to < current_date - 60;
 return new_id;
end $$;

create or replace function public.update_event(p_id uuid, p jsonb, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
 update events set kind = p->>'kind', title = _clean(p->>'title',120), tribe = _clean(p->>'tribe',80),
   province = _clean(p->>'province',40), area = _clean(p->>'area',80), venue_type = nullif(p->>'venue_type',''),
   venue = _clean(p->>'venue',120), date_from = (p->>'date_from')::date,
   date_to = coalesce(nullif(p->>'date_to','')::date, (p->>'date_from')::date), time_text = _clean(p->>'time_text',80),
   lat = nullif(p->>'lat','')::float8, lng = nullif(p->>'lng','')::float8, loc_url = _clean(p->>'loc_url',400),
   note = _clean(p->>'note',400), contact = _clean(p->>'contact',20),
   visibility = coalesce(nullif(p->>'visibility',''),'public'), reach_km = nullif(p->>'reach_km','')::int,
   poster_name = _clean(p->>'poster_name',60)
 where id = p_id and owner_hash = _h(p_token);
 return found;
end $$;

grant execute on function public.list_events() to anon, authenticated;
grant execute on function public.get_event(uuid) to anon, authenticated;
