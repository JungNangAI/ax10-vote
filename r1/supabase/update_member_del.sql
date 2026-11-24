-- 명단에서 한 명 빼기 (투표했으면 그 표도 함께 지워짐). 여러 번 실행해도 괜찮아요.
create or replace function ax_admin_member_del(p_round text, p_key text, p_member uuid) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _ax_admin_ok(p_round, p_key) then return json_build_object('ok', false); end if;
  delete from ax_member where round_id = p_round and id = p_member;
  return json_build_object('ok', found);
end $$;
grant execute on function ax_admin_member_del(text, text, uuid) to anon, authenticated;
notify pgrst, 'reload schema';
