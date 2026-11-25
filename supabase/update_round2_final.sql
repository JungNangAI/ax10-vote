-- ============================================================
-- AX10 2차 투표 · 최종 정리 (한 번에 실행, 여러 번 실행해도 됩니다)
--  Supabase → ax10-vote 프로젝트 → SQL Editor → New query → 전체 붙여 넣기 → Run
-- ============================================================

-- ① 후보: 출석시스템(23) 빼고 글주임 AI(2) 넣기
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

-- ③ 투표 기간: 11. 26.(목) 09시 ~ 12. 2.(수) 18시 / 결과는 마감 전까지 비공개
--    (기간을 다르게 하려면 아래 두 날짜만 고치세요)
update ax_round
   set opens_at = '2026-11-26 09:00+09',
       closes_at = '2026-12-02 18:00+09',
       results_public = false
 where id = 'ax20-2';

notify pgrst, 'reload schema';

-- 확인: 후보 수 20 · 글주임 있음 true · 출석시스템 남음 false · 16번 이름 살아있는 업무사전
--       시작 2026-11-26 09:00 · 마감 2026-12-02 18:00 · 결과 공개 false
select (select count(*) from ax_candidate where round_id = 'ax20-2') as "후보 수",
       (select bool_or(no = 2) from ax_candidate where round_id = 'ax20-2') as "글주임 있음",
       (select bool_or(no = 23) from ax_candidate where round_id = 'ax20-2') as "출석시스템 남음",
       (select orig from ax_candidate where round_id = 'ax20-2' and no = 16) as "16번 이름",
       to_char(opens_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') as "시작",
       to_char(closes_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') as "마감",
       results_public as "결과 공개"
from ax_round where id = 'ax20-2';
