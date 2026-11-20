-- AX10 선호도 투표 사이트 · Supabase 설정 (처음 한 번 실행)
-- 원칙: 표는 모두 RLS로 잠그고, 아래 함수(RPC)로만 읽고 쓴다. 웹에는 publishable 키만 넣는다.
create extension if not exists pgcrypto;

create table if not exists ax_round (
  id text primary key,                 -- 예: 'ax30-1'
  title text not null,
  max_pick int not null default 7,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  results_public boolean not null default false,
  admin_hash text not null,            -- 관리 열쇠(crypt 해시)
  created_at timestamptz default now()
);
create table if not exists ax_candidate (
  round_id text references ax_round(id) on delete cascade,
  no int not null, cat text not null, orig text, sub text not null, line text, descr text, org text,
  primary key (round_id, no)
);
create table if not exists ax_member (
  id uuid primary key default gen_random_uuid(),
  round_id text references ax_round(id) on delete cascade,
  dept text not null, name text not null,
  unique (round_id, dept, name)
);
create table if not exists ax_vote (
  round_id text references ax_round(id) on delete cascade,
  member_id uuid references ax_member(id) on delete cascade,
  picks int[] not null,
  comment text,
  device text,
  updated_at timestamptz default now(),
  primary key (round_id, member_id)
);
alter table ax_round enable row level security;
alter table ax_candidate enable row level security;
alter table ax_member enable row level security;
alter table ax_vote enable row level security;
-- (정책을 만들지 않으므로 표에 직접 접근은 모두 막힌다)

create or replace function _ax_admin_ok(p_round text, p_key text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists(select 1 from ax_round where id = p_round and admin_hash = crypt(p_key, admin_hash));
$$;

-- ── 공개 함수 ─────────────────────────────
create or replace function ax_round_info(p_round text) returns json
language sql security definer set search_path = public as $$
  select json_build_object('id', id, 'title', title, 'max_pick', max_pick, 'opens_at', opens_at,
    'closes_at', closes_at, 'results_public', results_public, 'now', now())
  from ax_round where id = p_round;
$$;

create or replace function ax_candidates(p_round text) returns setof ax_candidate
language sql security definer set search_path = public as $$
  select * from ax_candidate where round_id = p_round order by no;
$$;

create or replace function ax_search_member(p_round text, p_q text) returns table(id uuid, dept text, name text)
language sql security definer set search_path = public as $$
  select id, dept, name from ax_member
  where round_id = p_round and length(trim(p_q)) >= 2 and (name like '%' || trim(p_q) || '%')
  order by name limit 10;
$$;

create or replace function ax_depts(p_round text) returns table(dept text)
language sql security definer set search_path = public as $$
  select distinct dept from ax_member where round_id = p_round order by dept;
$$;

create or replace function ax_members_by_dept(p_round text, p_dept text) returns table(id uuid, dept text, name text)
language sql security definer set search_path = public as $$
  select id, dept, name from ax_member where round_id = p_round and dept = p_dept order by name;
$$;

-- 내 투표 보기: 투표한 그 휴대폰에서만 내용을 돌려준다 (다른 사람이 이름으로 남의 선택을 엿보지 못하게)
create or replace function ax_my_vote(p_round text, p_member uuid, p_device text) returns json
language sql security definer set search_path = public as $$
  select case when device is null or device = p_device
    then json_build_object('picks', picks, 'comment', comment, 'updated_at', updated_at)
    else json_build_object('locked', true) end
  from ax_vote where round_id = p_round and member_id = p_member;
$$;

create or replace function ax_submit(p_round text, p_member uuid, p_picks int[], p_comment text, p_device text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round; n int; bad int; other uuid;
begin
  select * into r from ax_round where id = p_round;
  if r is null then return json_build_object('ok', false, 'msg', '투표를 찾을 수 없어요.'); end if;
  if now() < r.opens_at then return json_build_object('ok', false, 'msg', '아직 투표 시작 전이에요.'); end if;
  if now() > r.closes_at then return json_build_object('ok', false, 'msg', '투표가 마감됐어요.'); end if;
  if not exists(select 1 from ax_member where id = p_member and round_id = p_round) then
    return json_build_object('ok', false, 'msg', '명단에 없는 선정위원이에요.'); end if;
  select count(distinct x) into n from unnest(p_picks) x;
  if n < 1 or n > r.max_pick or n <> coalesce(array_length(p_picks, 1), 0) then
    return json_build_object('ok', false, 'msg', '1개에서 ' || r.max_pick || '개까지 고를 수 있어요.'); end if;
  select count(*) into bad from unnest(p_picks) x where not exists(select 1 from ax_candidate c where c.round_id = p_round and c.no = x);
  if bad > 0 then return json_build_object('ok', false, 'msg', '후보 번호가 올바르지 않아요.'); end if;
  if p_device is not null then
    select member_id into other from ax_vote where round_id = p_round and device = p_device and member_id <> p_member limit 1;
    if other is not null then return json_build_object('ok', false, 'msg', '이 휴대폰으로는 이미 다른 선정위원이 투표했어요. 본인 휴대폰으로 투표해 주세요.'); end if;
  end if;
  if exists(select 1 from ax_vote where round_id = p_round and member_id = p_member and device is not null and device <> p_device) then
    return json_build_object('ok', false, 'msg', '다른 휴대폰에서 이미 투표했어요. 바꾸려면 혁신팀(☎2837)에 초기화를 요청해 주세요.'); end if;
  insert into ax_vote(round_id, member_id, picks, comment, device, updated_at)
  values (p_round, p_member, p_picks, left(p_comment, 200), p_device, now())
  on conflict (round_id, member_id) do update set picks = excluded.picks,
    comment = coalesce(excluded.comment, ax_vote.comment), device = excluded.device, updated_at = now();
  return json_build_object('ok', true);
end $$;

create or replace function ax_comment(p_round text, p_member uuid, p_comment text, p_device text) returns json
language sql security definer set search_path = public as $$
  update ax_vote set comment = left(p_comment, 200) where round_id = p_round and member_id = p_member and (device is null or device = p_device);
  select json_build_object('ok', true);
$$;

-- 결과: 공개 스위치가 켜졌을 때만. 순위·1위 대비 비율·분야별 선정 수·유형 비율(%)·의견 문장만 (표 수·참여 인원·이름 비공개)
create or replace function ax_results(p_round text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round; items json; cats json; types json; cmts json; vr record; c record; best text; bestn int; tie boolean; tot int := 0;
  tc jsonb := '{}'::jsonb;
begin
  select * into r from ax_round where id = p_round;
  if r is null or not r.results_public then return json_build_object('public', false); end if;
  with t as (select x as no, count(*) as v from ax_vote, unnest(picks) x where round_id = p_round group by x),
       m as (select greatest(coalesce(max(v), 0), 1) as mx from t),
       s as (select k.no, k.cat, rank() over (order by coalesce(t.v, 0) desc) as rk,
                    round(coalesce(t.v, 0)::numeric / m.mx * 100) as ratio, coalesce(t.v, 0) as v
             from ax_candidate k left join t on t.no = k.no cross join m where k.round_id = p_round)
  select json_agg(json_build_object('no', no, 'rank', rk, 'ratio', ratio) order by v desc, no) into items from s;
  -- 선정위원 유형 비율: 한 사람이 고른 것 중 가장 많은 분야
  for vr in select picks from ax_vote where round_id = p_round loop
    best := null; bestn := 0; tie := false;
    for c in select k.cat, count(*) n from unnest(vr.picks) x join ax_candidate k on k.round_id = p_round and k.no = x group by k.cat order by count(*) desc loop
      if best is null then best := c.cat; bestn := c.n; elsif c.n = bestn then tie := true; end if;
    end loop;
    if best is not null then if tie then best := 'all'; end if; tc := jsonb_set(tc, array[best], to_jsonb(coalesce((tc->>best)::int, 0) + 1)); tot := tot + 1; end if;
  end loop;
  select json_object_agg(key, round(value::text::numeric / greatest(tot, 1) * 100)) into types from jsonb_each(tc);
  select json_agg(comment) into cmts from (select comment from ax_vote where round_id = p_round and coalesce(comment, '') <> '' order by updated_at limit 12) q;
  return json_build_object('public', true, 'items', coalesce(items, '[]'), 'types', coalesce(types, '{}'), 'comments', coalesce(cmts, '[]'),
    'title', r.title, 'opens_at', r.opens_at, 'closes_at', r.closes_at, 'max_pick', r.max_pick, 'closed', now() > r.closes_at);
end $$;

-- ── 관리 함수 (관리 열쇠 필요) ────────────────
create or replace function ax_admin_overview(p_round text, p_key text) returns json
language plpgsql security definer set search_path = public as $$
declare out json;
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  select json_build_object('ok', true,
    'round', (select row_to_json(x) from (select id, title, max_pick, opens_at, closes_at, results_public, now() as now from ax_round where id = p_round) x),
    'members', (select coalesce(json_agg(json_build_object('id', m.id, 'dept', m.dept, 'name', m.name,
                  'voted', v.member_id is not null, 'at', v.updated_at, 'device', v.device) order by m.dept, m.name), '[]')
                from ax_member m left join ax_vote v on v.member_id = m.id and v.round_id = p_round where m.round_id = p_round),
    'tally', (select coalesce(json_agg(json_build_object('no', k.no, 'sub', k.sub, 'cat', k.cat, 'votes', coalesce(t.v, 0)) order by coalesce(t.v, 0) desc, k.no), '[]')
              from ax_candidate k left join (select x as no, count(*) v from ax_vote, unnest(picks) x where round_id = p_round group by x) t on t.no = k.no
              where k.round_id = p_round),
    'ballots', (select coalesce(json_agg(picks), '[]') from ax_vote where round_id = p_round),
    'comments', (select coalesce(json_agg(json_build_object('dept', m.dept, 'name', m.name, 'comment', v.comment, 'picks', v.picks)), '[]')
                 from ax_vote v join ax_member m on m.id = v.member_id where v.round_id = p_round and coalesce(v.comment, '') <> '')
  ) into out;
  return out;
end $$;

create or replace function ax_admin_set(p_round text, p_key text, p_closes timestamptz, p_opens timestamptz, p_public boolean) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  update ax_round set closes_at = coalesce(p_closes, closes_at), opens_at = coalesce(p_opens, opens_at),
    results_public = coalesce(p_public, results_public) where id = p_round;
  return json_build_object('ok', true);
end $$;

-- 한 사람 투표 초기화 (휴대폰을 바꿨거나 잘못 투표했을 때)
create or replace function ax_admin_reset(p_round text, p_key text, p_member uuid) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  delete from ax_vote where round_id = p_round and member_id = p_member;
  return json_build_object('ok', true);
end $$;

-- 명단 올리기: [{"dept":"..","name":".."}, ...]  (기존 명단에 없는 사람만 추가)
create or replace function ax_admin_members(p_round text, p_key text, p_list json) returns json
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  insert into ax_member(round_id, dept, name)
  select p_round, trim(e->>'dept'), trim(e->>'name') from json_array_elements(p_list) e
  where coalesce(trim(e->>'name'), '') <> '' on conflict do nothing;
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'added', n);
end $$;

-- 2차로 넘기기: 1차 상위 N종을 새 라운드 후보로 복사
create or replace function ax_admin_promote(p_round text, p_key text, p_new text, p_title text, p_top int, p_max int, p_closes timestamptz, p_new_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  insert into ax_round(id, title, max_pick, closes_at, admin_hash) values (p_new, p_title, p_max, p_closes, crypt(p_new_key, gen_salt('bf')));
  insert into ax_candidate(round_id, no, cat, orig, sub, line, descr, org)
  select p_new, k.no, k.cat, k.orig, k.sub, k.line, k.descr, k.org from ax_candidate k
  where k.round_id = p_round and k.no in (
    select x from ax_vote, unnest(picks) x where round_id = p_round group by x order by count(*) desc, x limit p_top);
  return json_build_object('ok', true);
end $$;

grant execute on function ax_round_info, ax_candidates, ax_search_member, ax_depts, ax_members_by_dept, ax_my_vote,
  ax_submit, ax_comment, ax_results, ax_admin_overview, ax_admin_set, ax_admin_members, ax_admin_promote, ax_admin_reset to anon, authenticated;
revoke execute on function _ax_admin_ok from anon, authenticated;
notify pgrst, 'reload schema';
