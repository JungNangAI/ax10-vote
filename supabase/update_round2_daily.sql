-- ============================================================
-- AX10 2차 투표(ax20-2) 바꾸기: 1인 최대 7개 · 하루에 한 번씩 다시 투표 가능
--  · 같은 휴대폰(브라우저)이라도 날짜(한국 시간)가 바뀌면 새로 한 표를 더 낼 수 있어요.
--  · 하루 안에서는 그날 낸 표를 고칠 수 있고, 표가 늘지는 않아요.
--  · 날마다 낸 표는 모두 결과에 더해져요.
--  · 여러 번 실행해도 됩니다. SQL Editor에 전체를 붙여 넣고 Run.
-- ============================================================

-- ① 1인 최대 7개
update ax_round set max_pick = 7 where id = 'ax20-2';

-- ② 표에 '투표한 날' 칸을 넣고, 한 휴대폰이 날마다 한 표씩 낼 수 있게 바꿈
alter table ax_anon_vote add column if not exists vote_day date;
update ax_anon_vote set vote_day = (created_at at time zone 'Asia/Seoul')::date where vote_day is null;
alter table ax_anon_vote alter column vote_day set default ((now() at time zone 'Asia/Seoul')::date);
alter table ax_anon_vote alter column vote_day set not null;
alter table ax_anon_vote drop constraint if exists ax_anon_vote_pkey;
alter table ax_anon_vote add constraint ax_anon_vote_pkey primary key (round_id, device, vote_day);

-- ③ 내 표 보기: 오늘 낸 표만 보여 줌(어제 냈어도 오늘은 새로 고를 수 있게)
create or replace function ax_anon_my(p_round text, p_device text) returns json
language sql security definer set search_path = public as $$
  select json_build_object('picks', picks, 'comment', comment, 'updated_at', updated_at)
  from ax_anon_vote where round_id = p_round and device = p_device
   and vote_day = (now() at time zone 'Asia/Seoul')::date;
$$;

-- ④ 투표하기: 오늘 표가 없으면 새로 넣고, 있으면 오늘 표를 고침
create or replace function ax_anon_submit(p_round text, p_device text, p_picks int[], p_comment text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round; n int; bad int; recent int; d date := (now() at time zone 'Asia/Seoul')::date;
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
  if not exists (select 1 from ax_anon_vote where round_id = p_round and device = p_device and vote_day = d) then
    -- 비정상적인 대량 제출 막기(1분에 새 투표 300건까지)
    select count(*) into recent from ax_anon_vote where round_id = p_round and created_at > now() - interval '1 minute';
    if recent >= 300 then return json_build_object('ok', false, 'msg', '지금 참여하는 분이 많아요. 1분 뒤 다시 보내 주세요.'); end if;
  end if;
  insert into ax_anon_vote (round_id, device, vote_day, picks, comment, created_at, updated_at)
  values (p_round, p_device, d, p_picks, left(nullif(trim(p_comment), ''), 200), now(), now())
  on conflict (round_id, device, vote_day) do update
    set picks = excluded.picks, comment = coalesce(excluded.comment, ax_anon_vote.comment), updated_at = now();
  return json_build_object('ok', true);
end $$;

-- ⑤ 한마디: 오늘 낸 표에 붙임
create or replace function ax_anon_comment(p_round text, p_device text, p_comment text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round;
begin
  r := _ax_anon_round(p_round);
  if r.id is null or now() > r.closes_at then return json_build_object('ok', false); end if;
  update ax_anon_vote set comment = left(nullif(trim(p_comment), ''), 200), updated_at = now()
   where round_id = p_round and device = p_device and vote_day = (now() at time zone 'Asia/Seoul')::date;
  return json_build_object('ok', found);
end $$;

-- ⑥ 관리자 집계: 참여자 = 투표한 휴대폰 수, ballots_n = 누적 표 수, 날짜별 = 그날 낸 표 수
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
    'participants', (select count(distinct device) from ax_anon_vote where round_id = p_round),
    'ballots_n', (select count(*) from ax_anon_vote where round_id = p_round),
    'today', (select count(*) from ax_anon_vote where round_id = p_round and vote_day = (now() at time zone 'Asia/Seoul')::date),
    'daily', (select coalesce(json_agg(json_build_object('d', d, 'n', n) order by d), '[]') from
               (select to_char(vote_day, 'MM.DD') d, count(*) n from ax_anon_vote where round_id = p_round group by 1) q),
    'tally', (select coalesce(json_agg(json_build_object('no', k.no, 'sub', k.sub, 'cat', k.cat, 'votes', coalesce(t.v, 0)) order by coalesce(t.v, 0) desc, k.no), '[]')
              from ax_candidate k left join (select x as no, count(*) v from ax_anon_vote, unnest(picks) x where round_id = p_round group by x) t on t.no = k.no
              where k.round_id = p_round),
    'ballots', (select coalesce(json_agg(picks), '[]') from ax_anon_vote where round_id = p_round),
    'comments', (select coalesce(json_agg(json_build_object('dept', '', 'name', '익명', 'comment', comment, 'picks', picks) order by updated_at desc), '[]')
                 from ax_anon_vote where round_id = p_round and coalesce(comment, '') <> '')
  ) into out;
  return out;
end $$;


notify pgrst, 'reload schema';

-- 확인: 최대 개수 7 · 기본키 (round_id, device, vote_day)
select max_pick as "최대 개수" from ax_round where id = 'ax20-2';
select pg_get_constraintdef(oid) as "기본키" from pg_constraint where conname = 'ax_anon_vote_pkey';
