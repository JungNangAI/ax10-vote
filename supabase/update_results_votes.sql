-- AX10 결과 보기에 후보별 득표수(votes)를 함께 내려줍니다. 여러 번 실행해도 괜찮아요.
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
  select json_agg(json_build_object('no', no, 'rank', rk, 'ratio', ratio, 'votes', v) order by v desc, no) into items from s;
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

notify pgrst, 'reload schema';

-- 확인: 득표수가 보이면 성공
select ax_results('ax20-2')->'items'->0 as "1위 항목";
