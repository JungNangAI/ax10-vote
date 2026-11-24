-- 2차 후보 16번 이름 바꾸기: 신규자 지식창고 → AI 지식창고
update ax_candidate
   set orig = 'AI 지식창고',
       sub = '모든 업무를 알려주는 AI 자동 최신화 사이트',
       line = '궁금한 건 뭐든 물어보세요!',
       descr = '복무·급여·전자결재·당직 등 모든 업무 규정을 근거와 함께 알려주고, 바뀐 지침은 AI가 알아서 최신으로 고쳐 주는 안내 사이트'
 where round_id = 'ax20-2' and no = 16
returning no, orig, sub;
