-- 介護施設と入居希望者のマッチング（デモ版）初期スキーマ
-- Supabase の SQL Editor に貼り付けて実行するか、`npm run db:setup` で適用する。
--
-- 介護度は数値で持つ：0=自立、1=要支援1、2=要支援2、3=要介護1 … 7=要介護5
-- 施設の種類、医療・ケア、入居時期などのコードと表示名は src/lib/domain.ts にまとめてある。

-- ---------------------------------------------------------------------------
-- テーブル
-- ---------------------------------------------------------------------------
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  facility_type text not null check (facility_type in ('tokuyo', 'roken', 'kaigo_yuryo', 'jutaku_yuryo', 'sakoju', 'group_home')),
  city text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  phone text,
  monthly_fee_min integer not null check (monthly_fee_min >= 0),
  monthly_fee_max integer not null,
  admission_fee integer not null default 0 check (admission_fee >= 0),
  care_level_min smallint not null check (care_level_min between 0 and 7),
  care_level_max smallint not null check (care_level_max between 0 and 7),
  accepts_welfare boolean not null default false,
  services text[] not null default '{}',
  capacity integer not null check (capacity > 0),
  vacancies integer not null default 0,
  vacancy_updated_at timestamptz not null default now(),
  description text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (monthly_fee_max >= monthly_fee_min),
  check (care_level_max >= care_level_min),
  check (vacancies between 0 and capacity)
);
create index facilities_city_idx on public.facilities (city);
create index facilities_vacancy_idx on public.facilities (vacancies) where vacancies > 0;

-- ログインする人の役割（入居希望者、施設担当者、管理者）
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('applicant', 'facility', 'admin')),
  display_name text not null,
  facility_id uuid references public.facilities (id) on delete set null,
  check (role <> 'facility' or facility_id is not null)
);

-- 入居希望者と希望条件。氏名と連絡先は、本人、管理者、本人が相談した施設にだけ見える
create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  age integer check (age between 0 and 120),
  contact text,
  care_level smallint not null check (care_level between 0 and 7),
  preferred_cities text[] not null default '{}',
  budget_max integer not null check (budget_max > 0),
  needs_welfare boolean not null default false,
  required_services text[] not null default '{}',
  preferred_types text[] not null default '{}',
  move_in text not null default 'undecided' check (move_in in ('asap', 'within_3m', 'undecided')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 入居希望者から施設への相談
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'in_progress', 'visit', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, facility_id)
);
create index inquiries_facility_idx on public.inquiries (facility_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 役割の判定（RLS の再帰を避けるため security definer）
-- ---------------------------------------------------------------------------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where user_id = auth.uid()), false);
$$;

create or replace function public.my_facility_id()
returns uuid language sql stable security definer set search_path = public as $$
  select facility_id from public.profiles where user_id = auth.uid() and role = 'facility';
$$;

create or replace function public.my_applicant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.applicants where user_id = auth.uid();
$$;

-- 施設を管理できるか（その施設の担当者、または管理者）。
-- 「facility_id = my_facility_id()」だけだと、施設を持たない人では NULL になり、
-- 「not (NULL)」も NULL なので権限の確認をすり抜ける。coalesce で必ず true / false にする。
create or replace function public.can_manage_facility(p_facility_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(p_facility_id = public.my_facility_id(), false);
$$;

-- ---------------------------------------------------------------------------
-- 更新日時と、空室の更新日時
-- ---------------------------------------------------------------------------
create or replace function public.facilities_before_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.vacancies is distinct from old.vacancies then
    new.vacancy_updated_at := now();
  end if;
  -- 掲載の停止と再開は管理者だけ
  if new.is_published is distinct from old.is_published and not public.is_admin() and auth.uid() is not null then
    raise exception '掲載の切り替えは管理者だけができます' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger facilities_before_update before update on public.facilities
  for each row execute function public.facilities_before_update();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger applicants_touch before update on public.applicants
  for each row execute function public.touch_updated_at();
create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 業務の操作（関数の中で権限を確かめる）
-- ---------------------------------------------------------------------------

-- 空室数の増減（施設担当者は自分の施設だけ、管理者はすべて）
create or replace function public.adjust_vacancy(p_facility_id uuid, p_delta integer)
returns public.facilities language plpgsql security definer set search_path = public as $$
declare
  v_row public.facilities;
begin
  if auth.uid() is null or not public.can_manage_facility(p_facility_id) then
    raise exception 'この施設の空室を更新する権限がありません' using errcode = '42501';
  end if;
  select * into v_row from public.facilities where id = p_facility_id for update;
  if v_row.vacancies + p_delta < 0 or v_row.vacancies + p_delta > v_row.capacity then
    raise exception '空室数は0から定員（%室）までです', v_row.capacity using errcode = '22003';
  end if;
  update public.facilities set vacancies = vacancies + p_delta where id = p_facility_id returning * into v_row;
  return v_row;
end;
$$;

-- 相談の状況の更新（相談を受けた施設、または管理者）
create or replace function public.set_inquiry_status(p_inquiry_id uuid, p_status text)
returns public.inquiries language plpgsql security definer set search_path = public as $$
declare
  v_row public.inquiries;
begin
  select * into v_row from public.inquiries where id = p_inquiry_id;
  if v_row.id is null then
    raise exception '相談が見つかりません' using errcode = 'P0002';
  end if;
  if auth.uid() is null or not public.can_manage_facility(v_row.facility_id) then
    raise exception 'この相談を更新する権限がありません' using errcode = '42501';
  end if;
  update public.inquiries set status = p_status where id = p_inquiry_id returning * into v_row;
  return v_row;
end;
$$;

-- 施設担当者向け：入居希望者の条件だけを、氏名と連絡先を除いて返す
create or replace function public.anonymous_applicants()
returns table (
  code text,
  age_group text,
  care_level smallint,
  preferred_cities text[],
  budget_max integer,
  needs_welfare boolean,
  required_services text[],
  preferred_types text[],
  move_in text,
  updated_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.my_role(), '') not in ('facility', 'admin') then
    raise exception '施設担当者と管理者だけが利用できます' using errcode = '42501';
  end if;
  return query
    select
      'No.' || upper(substr(md5(a.id::text), 1, 6)),
      case when a.age is null then '非公開' else (a.age / 10 * 10)::text || '代' end,
      a.care_level, a.preferred_cities, a.budget_max, a.needs_welfare,
      a.required_services, a.preferred_types, a.move_in, a.updated_at
    from public.applicants a
    order by a.updated_at desc;
end;
$$;

-- 施設担当者向け：自分の施設に届いた相談と、相談してきた入居希望者の情報
-- （入居希望者が相談した時点で、その施設にだけ氏名と連絡先を開示する）
create or replace function public.received_inquiries()
returns table (
  id uuid,
  facility_id uuid,
  facility_name text,
  status text,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  applicant_name text,
  applicant_age integer,
  applicant_contact text,
  care_level smallint,
  preferred_cities text[],
  budget_max integer,
  needs_welfare boolean,
  required_services text[],
  move_in text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.my_role(), '') not in ('facility', 'admin') then
    raise exception '施設担当者と管理者だけが利用できます' using errcode = '42501';
  end if;
  return query
    select i.id, i.facility_id, f.name, i.status, i.message, i.created_at, i.updated_at,
      a.name, a.age, a.contact, a.care_level, a.preferred_cities, a.budget_max, a.needs_welfare,
      a.required_services, a.move_in
    from public.inquiries i
    join public.applicants a on a.id = i.applicant_id
    join public.facilities f on f.id = i.facility_id
    where public.is_admin() or i.facility_id = public.my_facility_id()
    order by i.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- アクセス制御（Row Level Security）
-- ---------------------------------------------------------------------------
alter table public.facilities enable row level security;
alter table public.profiles enable row level security;
alter table public.applicants enable row level security;
alter table public.inquiries enable row level security;

create policy "published facilities are public" on public.facilities
  for select to anon, authenticated
  using (is_published or id = public.my_facility_id() or public.is_admin());
create policy "facility staff and admins update facilities" on public.facilities
  for update to authenticated
  using (id = public.my_facility_id() or public.is_admin())
  with check (id = public.my_facility_id() or public.is_admin());
create policy "admins add facilities" on public.facilities
  for insert to authenticated with check (public.is_admin());

create policy "own profile or admin" on public.profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "own applicant record or admin" on public.applicants
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "applicants update their own conditions" on public.applicants
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "applicants register themselves" on public.applicants
  for insert to authenticated with check (user_id = auth.uid());

create policy "inquiries visible to the parties and admins" on public.inquiries
  for select to authenticated
  using (applicant_id = public.my_applicant_id() or facility_id = public.my_facility_id() or public.is_admin());
create policy "applicants send inquiries" on public.inquiries
  for insert to authenticated
  with check (applicant_id = public.my_applicant_id() and status = 'new');

revoke all on public.facilities, public.profiles, public.applicants, public.inquiries from anon, authenticated;
grant select on public.facilities to anon, authenticated;
grant insert, update on public.facilities to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.applicants to authenticated;
grant select, insert on public.inquiries to authenticated;

revoke execute on function public.adjust_vacancy(uuid, integer) from public, anon;
revoke execute on function public.set_inquiry_status(uuid, text) from public, anon;
revoke execute on function public.anonymous_applicants() from public, anon;
revoke execute on function public.received_inquiries() from public, anon;
grant execute on function public.adjust_vacancy(uuid, integer) to authenticated;
grant execute on function public.set_inquiry_status(uuid, text) to authenticated;
grant execute on function public.anonymous_applicants() to authenticated;
grant execute on function public.received_inquiries() to authenticated;
grant execute on function public.my_role(), public.is_admin(), public.my_facility_id(), public.my_applicant_id(), public.can_manage_facility(uuid)
  to anon, authenticated;
