-- 2차 후보: 출석시스템(23) 빼고 글주임 AI(2) 넣기 (11. 24. 계획서 기준)
delete from ax_candidate where round_id = 'ax20-2' and no = 23;
insert into ax_candidate (round_id, no, cat, orig, sub, line, descr, org)
select 'ax20-2', no, cat, orig, sub, line, descr, org from ax_candidate
where round_id = 'ax30-1' and no = 2
on conflict (round_id, no) do nothing;
-- 확인: 20개, 2번 있고 23번 없으면 성공
select count(*) as "후보 수", bool_or(no = 2) as "글주임 있음", bool_or(no = 23) as "출석시스템 남음"
from ax_candidate where round_id = 'ax20-2';
