-- ============================================================
-- AX10 2차 투표(전 직원 · 익명) 설정
--  · 1차(ax30-1, AI파트너스) 자료는 그대로 둡니다.
--  · 새 투표 'ax20-2' : 후보 20종, 1인 최대 10개, 이름 없이 휴대폰(브라우저)마다 1표
--  · 여러 번 실행해도 됩니다.
--  · 기간·최대 개수는 아래 insert 줄에서 바꾸거나, 나중에 관리자 페이지에서 바꿀 수 있어요.
-- ============================================================

alter table ax_round add column if not exists anon boolean not null default false;

create table if not exists ax_anon_vote (
  round_id text references ax_round(id) on delete cascade,
  device text not null,
  picks int[] not null,
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (round_id, device)
);
create table if not exists ax_anon_note (
  round_id text references ax_round(id) on delete cascade,
  device text not null,
  no int not null,
  score smallint check (score between 1 and 5),
  comment text,
  updated_at timestamptz default now(),
  primary key (round_id, device, no)
);
alter table ax_anon_vote enable row level security;
alter table ax_anon_note enable row level security;
create index if not exists ax_anon_vote_created on ax_anon_vote (round_id, created_at);

-- ① 2차 투표 만들기 (관리 열쇠 2094 / 기간은 필요하면 고치세요)
insert into ax_round (id, title, max_pick, opens_at, closes_at, results_public, admin_hash, anon)
values ('ax20-2', 'AX20 → 10 · 전 직원 투표', 10,
        '2026-11-25 09:00+09', '2026-12-02 18:00+09', false, crypt('2094', gen_salt('bf')), true)
on conflict (id) do update set anon = true;

-- ② 후보 20종: 1차에서 뽑힌 번호를 그대로 옮김(번호는 AX30 원래 번호 유지)
insert into ax_candidate (round_id, no, cat, orig, sub, line, descr, org)
select 'ax20-2', no, cat, orig, sub, line, descr, org from ax_candidate
where round_id = 'ax30-1' and no = any (array[1,3,4,5,6,7,8,9,10,12,16,17,20,22,23,24,25,26,29,30])
on conflict (round_id, no) do nothing;

-- ③ 투표 정보에 익명 여부 추가
create or replace function ax_round_info(p_round text) returns json
language sql security definer set search_path = public as $$
  select json_build_object('id', id, 'title', title, 'max_pick', max_pick, 'opens_at', opens_at,
    'closes_at', closes_at, 'results_public', results_public, 'anon', coalesce(anon, false), 'now', now())
  from ax_round where id = p_round;
$$;

-- ④ 익명 투표 함수
create or replace function _ax_anon_round(p_round text) returns ax_round
language sql security definer set search_path = public as $$
  select * from ax_round where id = p_round and coalesce(anon, false);
$$;

create or replace function ax_anon_my(p_round text, p_device text) returns json
language sql security definer set search_path = public as $$
  select json_build_object('picks', picks, 'comment', comment, 'updated_at', updated_at)
  from ax_anon_vote where round_id = p_round and device = p_device;
$$;

create or replace function ax_anon_submit(p_round text, p_device text, p_picks int[], p_comment text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round; n int; bad int; recent int;
begin
  r := _ax_anon_round(p_round);
  if r.id is null then return json_build_object('ok', false, 'msg', '투표를 찾지 못했어요.'); end if;
  if now() < r.opens_at then return json_build_object('ok', false, 'msg', '아직 투표 시작 전이에요.'); end if;
  if now() > r.closes_at then return json_build_object('ok', false, 'msg', '투표가 마감됐어요.'); end if;
  if p_device is null or length(p_device) not between 8 and 64 then return json_build_object('ok', false, 'msg', '새로고침 후 다시 시도해 주세요.'); end if;
  select count(distinct x) into n from unnest(p_picks) x;
  if n is null or n < 1 or n <> cardinality(p_picks) or n > r.max_pick then
    return json_build_object('ok', false, 'msg', format('1개에서 %s개까지 골라 주세요.', r.max_pick)); end if;
  select count(*) into bad from unnest(p_picks) x
   where not exists (select 1 from ax_candidate k where k.round_id = p_round and k.no = x);
  if bad > 0 then return json_build_object('ok', false, 'msg', '후보 번호가 올바르지 않아요.'); end if;
  if not exists (select 1 from ax_anon_vote where round_id = p_round and device = p_device) then
    -- 비정상적인 대량 제출 막기(1분에 새 투표 300건까지)
    select count(*) into recent from ax_anon_vote where round_id = p_round and created_at > now() - interval '1 minute';
    if recent >= 300 then return json_build_object('ok', false, 'msg', '지금 참여하는 분이 많아요. 1분 뒤 다시 보내 주세요.'); end if;
  end if;
  insert into ax_anon_vote (round_id, device, picks, comment, created_at, updated_at)
  values (p_round, p_device, p_picks, left(nullif(trim(p_comment), ''), 200), now(), now())
  on conflict (round_id, device) do update
    set picks = excluded.picks, comment = coalesce(excluded.comment, ax_anon_vote.comment), updated_at = now();
  return json_build_object('ok', true);
end $$;

create or replace function ax_anon_comment(p_round text, p_device text, p_comment text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round;
begin
  r := _ax_anon_round(p_round);
  if r.id is null or now() > r.closes_at then return json_build_object('ok', false); end if;
  update ax_anon_vote set comment = left(nullif(trim(p_comment), ''), 200), updated_at = now()
   where round_id = p_round and device = p_device;
  return json_build_object('ok', found);
end $$;

create or replace function ax_anon_note_save(p_round text, p_device text, p_no int, p_score int, p_comment text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round;
begin
  r := _ax_anon_round(p_round);
  if r.id is null or now() < r.opens_at or now() > r.closes_at then return json_build_object('ok', false, 'msg', '지금은 저장할 수 없어요.'); end if;
  if p_device is null or length(p_device) not between 8 and 64 then return json_build_object('ok', false); end if;
  if not exists (select 1 from ax_candidate where round_id = p_round and no = p_no) then return json_build_object('ok', false, 'msg', '후보 번호가 올바르지 않아요.'); end if;
  if p_score is null and coalesce(trim(p_comment), '') = '' then
    delete from ax_anon_note where round_id = p_round and device = p_device and no = p_no;
  else
    insert into ax_anon_note (round_id, device, no, score, comment, updated_at)
    values (p_round, p_device, p_no, case when p_score between 1 and 5 then p_score end, left(nullif(trim(p_comment), ''), 300), now())
    on conflict (round_id, device, no) do update set score = excluded.score, comment = excluded.comment, updated_at = now();
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function ax_anon_my_notes(p_round text, p_device text) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('no', no, 'score', score, 'comment', comment)), '[]'::json)
  from ax_anon_note where round_id = p_round and device = p_device;
$$;

-- ⑤ 결과(공개용): 명단 투표 + 익명 투표를 함께 셈
create or replace function ax_results(p_round text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round; items json; types json; cmts json; vr record; c record; best text; bestn int; tie boolean; tot int := 0;
  tc jsonb := '{}'::jsonb; nb int;
begin
  select * into r from ax_round where id = p_round;
  if r is null or not r.results_public then return json_build_object('public', false); end if;
  select (select count(*) from ax_vote where round_id = p_round) + (select count(*) from ax_anon_vote where round_id = p_round) into nb;
  with b as (select picks from ax_vote where round_id = p_round union all select picks from ax_anon_vote where round_id = p_round),
       t as (select x as no, count(*) as v from b, unnest(picks) x group by x),
       m as (select greatest(coalesce(max(v), 0), 1) as mx from t),
       s as (select k.no, k.cat, rank() over (order by coalesce(t.v, 0) desc) as rk,
                    round(coalesce(t.v, 0)::numeric / m.mx * 100) as ratio, coalesce(t.v, 0) as v
             from ax_candidate k left join t on t.no = k.no cross join m where k.round_id = p_round)
  select json_agg(json_build_object('no', no, 'rank', rk, 'ratio', ratio) order by v desc, no) into items from s;
  for vr in select picks from ax_vote where round_id = p_round union all select picks from ax_anon_vote where round_id = p_round loop
    best := null; bestn := 0; tie := false;
    for c in select k.cat, count(*) n from unnest(vr.picks) x join ax_candidate k on k.round_id = p_round and k.no = x group by k.cat order by count(*) desc loop
      if best is null then best := c.cat; bestn := c.n; elsif c.n = bestn then tie := true; end if;
    end loop;
    if best is not null then if tie then best := 'all'; end if; tc := jsonb_set(tc, array[best], to_jsonb(coalesce((tc->>best)::int, 0) + 1)); tot := tot + 1; end if;
  end loop;
  select json_object_agg(key, round(value::text::numeric / greatest(tot, 1) * 100)) into types from jsonb_each(tc);
  select json_agg(comment) into cmts from (
    select comment, at from (select comment, updated_at at from ax_vote where round_id = p_round
                             union all select comment, updated_at from ax_anon_vote where round_id = p_round) u
    where coalesce(comment, '') <> '' order by at desc limit 12) q;
  return json_build_object('public', true, 'items', coalesce(items, '[]'), 'types', coalesce(types, '{}'), 'comments', coalesce(cmts, '[]'),
    'title', r.title, 'opens_at', r.opens_at, 'closes_at', r.closes_at, 'max_pick', r.max_pick, 'anon', coalesce(r.anon, false),
    'closed', now() > r.closes_at);
end $$;

-- ⑥ 관리자 집계: 익명 투표면 참여 수·시간대별 수를 함께 돌려줌
create or replace function ax_admin_overview(p_round text, p_key text) returns json
language plpgsql security definer set search_path = public as $$
declare out json; isanon boolean;
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  select coalesce(anon, false) into isanon from ax_round where id = p_round;
  if not isanon then
    select json_build_object('ok', true,
      'round', (select row_to_json(x) from (select id, title, max_pick, opens_at, closes_at, results_public, false as anon, now() as now from ax_round where id = p_round) x),
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
  end if;
  select json_build_object('ok', true,
    'round', (select row_to_json(x) from (select id, title, max_pick, opens_at, closes_at, results_public, true as anon, now() as now from ax_round where id = p_round) x),
    'members', '[]'::json,
    'participants', (select count(*) from ax_anon_vote where round_id = p_round),
    'today', (select count(*) from ax_anon_vote where round_id = p_round and created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    'daily', (select coalesce(json_agg(json_build_object('d', d, 'n', n) order by d), '[]') from
               (select to_char(created_at at time zone 'Asia/Seoul', 'MM.DD') d, count(*) n from ax_anon_vote where round_id = p_round group by 1) q),
    'tally', (select coalesce(json_agg(json_build_object('no', k.no, 'sub', k.sub, 'cat', k.cat, 'votes', coalesce(t.v, 0)) order by coalesce(t.v, 0) desc, k.no), '[]')
              from ax_candidate k left join (select x as no, count(*) v from ax_anon_vote, unnest(picks) x where round_id = p_round group by x) t on t.no = k.no
              where k.round_id = p_round),
    'ballots', (select coalesce(json_agg(picks), '[]') from ax_anon_vote where round_id = p_round),
    'comments', (select coalesce(json_agg(json_build_object('dept', '', 'name', '익명', 'comment', comment, 'picks', picks) order by updated_at desc), '[]')
                 from ax_anon_vote where round_id = p_round and coalesce(comment, '') <> '')
  ) into out;
  return out;
end $$;

create or replace function ax_admin_notes(p_round text, p_key text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'items', coalesce((
    select json_agg(x order by x.no) from (
      select no, round(avg(score)::numeric, 1) as avg, count(score) as cnt,
        coalesce(json_agg(json_build_object('comment', comment, 'name', name, 'dept', dept, 'score', score)) filter (where comment is not null), '[]') as comments
      from (select n.no, n.score, n.comment, m.name, m.dept from ax_note n join ax_member m on m.id = n.member_id where n.round_id = p_round
            union all
            select a.no, a.score, a.comment, '익명', '' from ax_anon_note a where a.round_id = p_round) u
      group by no) x), '[]'));
end $$;

revoke execute on function _ax_anon_round(text) from public, anon, authenticated;
grant execute on function ax_round_info(text), ax_results(text), ax_admin_overview(text, text), ax_admin_notes(text, text),
  ax_anon_my(text, text), ax_anon_submit(text, text, int[], text), ax_anon_comment(text, text, text),
  ax_anon_note_save(text, text, int, int, text), ax_anon_my_notes(text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- 확인용: 아래 결과가 20 이면 성공
select count(*) as "2차 후보 수" from ax_candidate where round_id = 'ax20-2';
