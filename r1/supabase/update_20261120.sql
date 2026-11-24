-- AX10 추가 기능 (명단 빼기 + 후보별 중요도·의견). SQL Editor에 통째로 붙여 넣고 Run. 여러 번 실행해도 괜찮아요.
create or replace function ax_admin_member_del(p_round text, p_key text, p_member uuid) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  delete from ax_member where round_id = p_round and id = p_member;
  return json_build_object('ok', found);
end $$;
grant execute on function ax_admin_member_del(text, text, uuid) to anon, authenticated;

create table if not exists ax_note (
  round_id text references ax_round(id) on delete cascade,
  member_id uuid references ax_member(id) on delete cascade,
  no int not null,
  score smallint check (score between 1 and 5),
  comment text,
  device text,
  updated_at timestamptz default now(),
  primary key (round_id, member_id, no)
);
alter table ax_note enable row level security;

create or replace function ax_note_save(p_round text, p_member uuid, p_no int, p_score int, p_comment text, p_device text) returns json
language plpgsql security definer set search_path = public as $$
declare r ax_round;
begin
  select * into r from ax_round where id = p_round;
  if r is null or now() < r.opens_at or now() > r.closes_at then return json_build_object('ok', false, 'msg', '지금은 저장할 수 없어요.'); end if;
  if not exists(select 1 from ax_member where id = p_member and round_id = p_round) then return json_build_object('ok', false, 'msg', '명단에 없는 선정위원이에요.'); end if;
  if not exists(select 1 from ax_candidate where round_id = p_round and no = p_no) then return json_build_object('ok', false, 'msg', '후보 번호가 올바르지 않아요.'); end if;
  if exists(select 1 from ax_vote where round_id = p_round and member_id = p_member and device is not null and device <> p_device) then
    return json_build_object('ok', false, 'msg', '다른 휴대폰에서 이미 투표했어요.'); end if;
  if p_score is null and coalesce(trim(p_comment), '') = '' then
    delete from ax_note where round_id = p_round and member_id = p_member and no = p_no;
  else
    insert into ax_note(round_id, member_id, no, score, comment, device, updated_at)
    values (p_round, p_member, p_no, case when p_score between 1 and 5 then p_score end, left(nullif(trim(p_comment), ''), 300), p_device, now())
    on conflict (round_id, member_id, no) do update set score = excluded.score, comment = excluded.comment, device = excluded.device, updated_at = now();
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function ax_my_notes(p_round text, p_member uuid, p_device text) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('no', no, 'score', score, 'comment', comment)), '[]'::json)
  from ax_note where round_id = p_round and member_id = p_member and (device is null or device = p_device);
$$;

create or replace function ax_admin_notes(p_round text, p_key text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'items', coalesce((
    select json_agg(x order by x.no) from (
      select n.no, round(avg(n.score)::numeric, 1) as avg, count(n.score) as cnt,
        coalesce(json_agg(json_build_object('comment', n.comment, 'name', m.name, 'dept', m.dept, 'score', n.score)) filter (where n.comment is not null), '[]') as comments
      from ax_note n join ax_member m on m.id = n.member_id where n.round_id = p_round group by n.no) x), '[]'));
end $$;

grant execute on function ax_note_save(text, uuid, int, int, text, text), ax_my_notes(text, uuid, text), ax_admin_notes(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
