-- AX10 2차 후보 정리 (한 번에 실행)
-- ① 출석시스템(23) 빼고 글주임 AI(2) 넣기
delete from ax_candidate where round_id = 'ax20-2' and no = 23;
insert into ax_candidate (round_id, no, cat, orig, sub, line, descr, org)
select 'ax20-2', no, cat, orig, sub, line, descr, org from ax_candidate
where round_id = 'ax30-1' and no = 2
on conflict (round_id, no) do nothing;
-- ② 16번 이름: 신규자 지식창고 → 살아있는 업무사전
update ax_candidate
   set orig = '살아있는 업무사전',
       sub = 'AI가 알아서 최신으로 고쳐 주는 업무 안내 사이트',
       line = '바뀐 규정도 바로 반영돼요!',
       descr = '신규자뿐 아니라 모든 공무원이 복무·급여·전자결재·당직 등 업무 규정을 근거와 함께 찾아보고, 지침이 바뀌면 AI가 알아서 내용을 최신으로 고쳐 주는 안내 사이트'
 where round_id = 'ax20-2' and no = 16;
-- 확인: 후보 수 20 · 글주임 있음 true · 출석시스템 남음 false · 16번 이름 살아있는 업무사전
select count(*) as "후보 수",
       bool_or(no = 2) as "글주임 있음",
       bool_or(no = 23) as "출석시스템 남음",
       max(orig) filter (where no = 16) as "16번 이름"
from ax_candidate where round_id = 'ax20-2';
