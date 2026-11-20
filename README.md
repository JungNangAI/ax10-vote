# AX10 선정위원 투표 사이트

AI파트너스가 행정AX 후보 30종 중 최대 7개를 고르는 투표 사이트예요. (2차 전 직원 투표에도 그대로 써요)

## 파일
- `index.html` 투표 화면 · `admin.html` 관리 화면(관리 열쇠 필요)
- `assets/config.js` Supabase 연결 정보 (비워 두면 미리보기 모드)
- `assets/candidates.json` 후보 30종 · `assets/char/` 3D 글주임 30종 그림 · `assets/hero.js` 실시간 3D 글주임
- `supabase/setup.sql` 표·함수 만들기(처음 한 번) · `supabase/seed.sql` 1차 투표·후보 넣기

## 차리는 순서 (약 15분)
1. Supabase(출석시스템 계정) → New project(Region: Seoul) → SQL Editor에서 `setup.sql` 전체 실행 → "Success"
2. `seed.sql`의 `여기에-관리열쇠`를 팀만 아는 긴 문장으로 바꾼 뒤 실행
3. Project Settings → API Keys에서 Project URL과 **publishable 키**를 `assets/config.js`에 넣기 (secret 키 금지)
4. GitHub `jungnangai` 계정에 새 저장소(예: `ax10-vote`)를 만들고 이 폴더를 올린 뒤 Settings → Pages → main / (root)
5. `https://jungnangai.github.io/ax10-vote/admin.html` 에서 관리 열쇠로 열고 → AI파트너스 명단 엑셀 올리기(이름·부서만 올라감)
6. 휴대폰으로 시험 투표 → 관리 화면에서 확인 → 시험 표는 Supabase에서 `delete from ax_vote where round_id='ax30-1';`

## 안전장치
- 명단은 Supabase에만 있고, 이름 검색은 두 글자 이상부터 돼요. 전화번호는 어디에도 올리지 않아요.
- 내가 고른 내용은 **투표한 그 휴대폰에서만** 다시 볼 수 있어요. 다른 사람이 이름을 골라도 남의 선택을 볼 수 없고 덮어쓸 수도 없어요.
- 한 휴대폰은 한 사람만 투표할 수 있어요. 휴대폰을 바꾼 분은 관리 화면 "한 사람 초기화"로 풀어 주세요.
- 카톡 미리보기 그림 주소(index.html의 og:image)는 저장소 주소가 `ax10-vote`가 아니면 바꿔 주세요.

## 운영
- 마감 연장·결과 공개는 관리 화면에서. 결과는 순위만 공개되고 표 수는 관리 화면에만 보여요.
- 투표자 화면에는 참여 인원이 보이지 않아요. 독려 문구는 관리 화면에서 복사해 카톡으로 보내요.
- 2차: 관리 화면 "2차 투표로 넘기기" → `config.js`의 `round`를 `ax20-2`로 바꾸기
- 투표가 끝나면 결과 CSV를 받아 두고 `delete from ax_round where id='ax30-1';`로 정리해요.
