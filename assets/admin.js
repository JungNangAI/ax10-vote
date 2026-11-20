(() => {
const CFG = window.AX_CONFIG || {}; const ROUND = CFG.round || 'ax30-1'; const DEMO = !(CFG.supabaseUrl && CFG.supabaseKey);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CATC = { doc: '#22e6ff', law: '#ffbf4a', ops: '#4d8dff', civ: '#ff4fd8' };
function toast(t, ms = 2000) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), ms); }
const sbRpc = async (fn, args) => { const r = await fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) }); const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; } return r.ok ? { data: d, error: null } : { data: null, error: d || { message: 'HTTP ' + r.status } }; };
const sb = DEMO ? null : { rpc: sbRpc };
let KEY = ''; try { KEY = sessionStorage.getItem('ax10_admin') || ''; } catch (e) {}
let cands = [];
// demo backend shares the voting page's demo store in this browser
const ds = () => { try { return JSON.parse(localStorage.getItem('ax10_demo')) || { members: [], votes: {}, pub: false, closes: '2026-11-23T18:00:00+09:00' }; } catch (e) { return { members: [], votes: {}, pub: false, closes: '2026-11-23T18:00:00+09:00' }; } };
const dsave = d => { try { localStorage.setItem('ax10_demo', JSON.stringify(d)); } catch (e) {} };
const Demo = {
  ax_admin_overview: () => { const d = ds(); const t = {}; cands.forEach(c => t[c.no] = 0); Object.values(d.votes).forEach(v => v.picks.forEach(n => t[n]++));
    return { ok: true, round: { closes_at: d.closes, opens_at: '2026-11-20T15:00:00+09:00', results_public: d.pub, max_pick: 7, now: new Date().toISOString() }, ballots: Object.values(d.votes).map(v => v.picks),
      members: d.members.map(m => ({ ...m, voted: !!d.votes[m.id], at: d.votes[m.id]?.updated_at, device: d.votes[m.id]?.device })),
      tally: cands.map(c => ({ no: c.no, sub: c.sub, cat: c.cat, votes: t[c.no] })).sort((a, b) => b.votes - a.votes || a.no - b.no),
      comments: d.members.filter(m => d.votes[m.id]?.comment).map(m => ({ dept: m.dept, name: m.name, comment: d.votes[m.id].comment, picks: d.votes[m.id].picks })) }; },
  ax_admin_set: ({ p_closes, p_public }) => { const d = ds(); if (p_closes) d.closes = p_closes; if (p_public != null) d.pub = p_public; dsave(d); return { ok: true }; },
  ax_admin_members: ({ p_list }) => { const d = ds(); let n = 0; p_list.forEach(e => { if (!d.members.some(m => m.dept === e.dept && m.name === e.name)) { d.members.push({ id: 'u' + Date.now() + n, dept: e.dept, name: e.name }); n++; } }); dsave(d); return { ok: true, added: n }; },
  ax_admin_promote: () => ({ ok: true }),
  ax_admin_member_del: ({ p_member }) => { const d = ds(); const n = d.members.length; d.members = d.members.filter(m => m.id !== p_member); delete d.votes[p_member]; dsave(d); return { ok: d.members.length < n }; },
  ax_admin_reset: ({ p_member }) => { const d = ds(); delete d.votes[p_member]; dsave(d); return { ok: true }; } };
async function rpc(fn, args) { if (DEMO) return Demo[fn](args); const { data, error } = await sb.rpc(fn, args); if (error) throw error; return data; }
if (DEMO) $('#demoNote').textContent = '미리보기 모드: 아무 열쇠나 넣으면 열려요. 같은 브라우저의 미리보기 투표 결과가 보여요.';
let ov = null, timer = null;
async function load() {
  try { ov = await rpc('ax_admin_overview', { p_round: ROUND, p_key: KEY }); } catch (e) { toast('불러오지 못했어요'); return; }
  if (!ov || !ov.ok) { toast('관리 열쇠가 맞지 않아요'); $('#login').style.display = 'block'; $('#main').style.display = 'none'; return; }
  try { sessionStorage.setItem('ax10_admin', KEY); } catch (e) {}
  $('#login').style.display = 'none'; $('#main').style.display = 'block';
  const ms = ov.members, v = ms.filter(m => m.voted).length;
  $('#kV').textContent = v; $('#kT').textContent = ms.length; $('#kP').textContent = ms.length ? Math.round(v / ms.length * 100) + '%' : '0%';
  const left = new Date(ov.round.closes_at) - Date.now(); $('#kD').textContent = left > 0 ? `${Math.floor(left / 864e5)}일 ${Math.floor(left % 864e5 / 36e5)}시간` : '마감';
  $('#seats').innerHTML = ms.map(m => `<div class="seat ${m.voted ? 'on' : ''}" title="${esc(m.dept)} ${esc(m.name)}${m.voted ? ' · 투표함' : ''}"></div>`).join('');
  const not = ms.filter(m => !m.voted);
  $('#notYet').innerHTML = not.length ? not.map(m => `${esc(m.name)} <span style="color:var(--mut)">(${esc(m.dept)})</span>`).join(' · ') : '모두 투표했어요!';
  $('#nudge').value = `[AX10 선정위원 투표 안내]\n선정위원님, 우리 구 AI 업무도구를 고르는 투표가 ${new Date(ov.round.closes_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric' })}에 마감돼요.\n3분이면 끝나요! 꼭 필요한 도구를 최대 ${ov.round.max_pick || 7}개 골라 주세요 🙂\n▶ 투표하기: ${location.href.replace(/admin\.html.*/, '')}`;
  const vot = ms.filter(m => m.voted);
  $('#voted').innerHTML = vot.length ? vot.map(m => `<span style="display:inline-flex;gap:6px;align-items:center;margin-right:12px">${esc(m.name)} <span style="color:var(--mut)">(${esc(m.dept)})</span><button class="sbtn ghost" data-reset="${m.id}" style="padding:3px 8px;font-size:12px">초기화</button></span>`).join('') : '아직 없어요';
  document.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => { if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = '한 번 더 누르면 초기화'; b.classList.add('gold'); setTimeout(() => { delete b.dataset.arm; b.textContent = '초기화'; b.classList.remove('gold'); }, 3000); return; }
    const r = await rpc('ax_admin_reset', { p_round: ROUND, p_key: KEY, p_member: b.dataset.reset }); toast(r && r.ok ? '초기화했어요' : '초기화하지 못했어요'); load(); });
  const devs = {}; ms.filter(m => m.device).forEach(m => (devs[m.device] = devs[m.device] || []).push(m));
  const dups = Object.values(devs).filter(a => a.length > 1);
  $('#dup').innerHTML = dups.length ? dups.map(a => a.map(m => `${esc(m.name)}(${esc(m.dept)})`).join(', ')).join('<br>') : '없음';
  $('#tally').innerHTML = '<tr><th>순위</th><th>번호</th><th>후보</th><th>표</th></tr>' + ov.tally.map((t, i) => {
    const rank = ov.tally.findIndex(x => x.votes === t.votes) + 1;
    return `<tr class="${i === 19 ? 'cutline' : ''}"><td>${rank}</td><td><span class="pill" style="background:${CATC[t.cat]}">${t.no}</span></td><td>${esc(t.sub)}</td><td><b>${t.votes}</b></td></tr>`; }).join('');
  $('#cmts').innerHTML = ov.comments.length ? ov.comments.map(c => `<div>“${esc(c.comment)}” <span style="color:var(--mut)">— ${esc(c.name)}, ${esc(c.dept)}</span></div>`).join('') : '아직 없어요';
  renderRoster();
  const pub = !!ov.round.results_public; $('#bPub').textContent = pub ? '공개 중 · 누르면 숨김' : '비공개 · 누르면 공개'; $('#bPub').className = 'sbtn' + (pub ? ' gold' : ' ghost');
  const d = new Date(ov.round.closes_at); const p = n => String(n).padStart(2, '0');
  $('#closes').value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  clearTimeout(timer); timer = setTimeout(load, 30000);
}
$('#bLogin').onclick = () => { KEY = $('#key').value.trim(); if (!KEY) return toast('관리 열쇠를 넣어 주세요'); load(); };
$('#key').onkeydown = e => { if (e.key === 'Enter') $('#bLogin').click(); };
$('#bRefresh').onclick = load;
$('#bCopy').onclick = async () => { try { await navigator.clipboard.writeText($('#nudge').value); toast('복사했어요. 카톡에 붙여 넣으세요'); } catch (e) { $('#nudge').select(); toast('문구를 선택했어요. 길게 눌러 복사해 주세요'); } };
$('#bCloses').onclick = async () => { const v = $('#closes').value; if (!v) return; await rpc('ax_admin_set', { p_round: ROUND, p_key: KEY, p_closes: new Date(v).toISOString(), p_opens: null, p_public: null }); toast('마감 시각을 바꿨어요'); load(); };
$('#bCloseNow').onclick = async () => { await rpc('ax_admin_set', { p_round: ROUND, p_key: KEY, p_closes: new Date().toISOString(), p_opens: null, p_public: null }); toast('투표를 마감했어요'); load(); };
$('#bPub').onclick = async () => { await rpc('ax_admin_set', { p_round: ROUND, p_key: KEY, p_closes: null, p_opens: null, p_public: !ov.round.results_public }); load(); };
$('#bCsv').onclick = async () => { const cj = no => cands.find(c => c.no === no) || {};
  const rows = [['순위', '번호', '후보', '표', '원본', '관련 기관', '관련 부서', '이미 있음', '원본 링크']].concat(ov.tally.map((t, i) => [ov.tally.findIndex(x => x.votes === t.votes) + 1, t.no, t.sub, t.votes, cj(t.no).orig, cj(t.no).org, cj(t.no).dept, cj(t.no).built ? '예' : '', (cj(t.no).links || []).join(' ')]));
  rows.push([], ['이름', '부서', '한 줄 의견', '고른 번호']); ov.comments.forEach(c => rows.push([c.name, c.dept, c.comment, (c.picks || []).join(' ')]));
  const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  try { await navigator.clipboard.writeText(csv); toast('CSV를 복사했어요. 엑셀에 붙여 넣으세요'); } catch (e) { $('#nudge').value = csv; toast('독려 문구 칸에 CSV를 넣었어요. 복사해 주세요'); } };
let upList = [];
$('#xls').onchange = async e => { const f = e.target.files[0]; if (!f) return;
  const wb = XLSX.read(await f.arrayBuffer()); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  upList = rows.map(r => { const keys = Object.keys(r); const dk = keys.find(k => /부서/.test(k)), nk = keys.find(k => /성명|이름/.test(k));
    let name = String(r[nk] || '').trim(); const m = name.match(/^([가-힣]{2,5})/); name = m && !/급/.test(m[1]) ? m[1] : '';
    let dept = String(r[dk] || '').trim().split(/\s+/)[0]; return { dept, name, raw: r[nk] }; });
  const ok = upList.filter(x => x.name && x.dept), bad = upList.filter(x => !(x.name && x.dept));
  $('#upPrev').innerHTML = `올릴 사람 <b>${ok.length}명</b>: ${ok.map(x => esc(x.name) + '(' + esc(x.dept) + ')').join(', ')}` + (bad.length ? `<br><span style="color:#ff8a8a">이름을 못 찾은 ${bad.length}건: ${bad.map(x => esc(x.raw) || '(빈칸)').join(', ')} → 엑셀에서 이름을 채운 뒤 다시 올려 주세요</span>` : '');
  upList = ok; $('#bUp').disabled = !ok.length;
  const key = x => x.dept + '|' + x.name; const inFile = new Set(ok.map(key)); const have = new Set((ov ? ov.members : []).map(key));
  const adds = ok.filter(x => !have.has(key(x))); syncDel = (ov ? ov.members : []).filter(m => !inFile.has(key(m)));
  $('#upPrev').innerHTML += `<div style="margin-top:6px">새로 더할 사람 <b>${adds.length}명</b>${adds.length ? ': ' + adds.map(x => esc(x.name) + '(' + esc(x.dept) + ')').join(', ') : ''}<br>엑셀에 없어서 빠질 사람 <b>${syncDel.length}명</b>${syncDel.length ? ': ' + syncDel.map(m => esc(m.name) + '(' + esc(m.dept) + ')' + (m.voted ? ' <b style="color:#ff8a8a">투표함</b>' : '')).join(', ') : ''}</div>`;
  $('#bSync').disabled = !ok.length || (!adds.length && !syncDel.length); };
let syncDel = [];
$('#bUp').onclick = async () => { const r = await rpc('ax_admin_members', { p_round: ROUND, p_key: KEY, p_list: upList.map(({ dept, name }) => ({ dept, name })) }); toast(r && r.ok ? `${r.added}명을 새로 올렸어요` : '올리지 못했어요'); load(); };
$('#bSync').onclick = async () => { const b = $('#bSync');
  if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = `한 번 더 누르면 ${syncDel.length}명 빼고 맞춰요`; b.classList.add('gold'); setTimeout(() => { delete b.dataset.arm; b.textContent = '엑셀과 똑같이 맞추기'; b.classList.remove('gold'); }, 4000); return; }
  delete b.dataset.arm; b.textContent = '엑셀과 똑같이 맞추기'; b.classList.remove('gold');
  let added = 0, removed = 0, fail = 0;
  try { const r = await rpc('ax_admin_members', { p_round: ROUND, p_key: KEY, p_list: upList.map(({ dept, name }) => ({ dept, name })) }); added = r && r.ok ? r.added : 0; } catch (e) { fail++; }
  for (const m of syncDel) { try { const r = await rpc('ax_admin_member_del', { p_round: ROUND, p_key: KEY, p_member: m.id }); r && r.ok ? removed++ : fail++; } catch (e) { fail++; } }
  toast(fail ? `더함 ${added}명 · 뺌 ${removed}명 · ${fail}건 실패 (빼기 SQL을 실행했는지 확인해 주세요)` : `엑셀 명단으로 맞췄어요 · 더함 ${added}명 · 뺌 ${removed}명`, 3500);
  syncDel = []; $('#bSync').disabled = true; load(); };
// ── 명단 관리: 한 명 추가 · 빼기 · 엑셀로 받기 ──
function renderRoster() {
  const ms = [...ov.members].sort((a, b) => a.dept.localeCompare(b.dept, 'ko') || a.name.localeCompare(b.name, 'ko'));
  const by = {}; ms.forEach(m => (by[m.dept] = by[m.dept] || []).push(m));
  $('#deptList').innerHTML = Object.keys(by).map(d => `<option value="${esc(d)}">`).join('');
  $('#rosterN').textContent = ms.length;
  $('#roster').innerHTML = Object.entries(by).map(([d, list]) => `<div class="rdept"><b>${esc(d)}</b>${list.map(m => `<span class="rm">${esc(m.name)}${m.voted ? '<i title="투표함">✓</i>' : ''}<button class="sbtn ghost" data-del="${m.id}" data-nm="${esc(m.name)}" data-v="${m.voted ? 1 : ''}">빼기</button></span>`).join('')}</div>`).join('') || '명단이 비어 있어요';
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = b.dataset.v ? '표도 지워져요 · 한 번 더' : '한 번 더 누르면 빼기'; b.classList.add('gold'); setTimeout(() => { if (b.isConnected) { delete b.dataset.arm; b.textContent = '빼기'; b.classList.remove('gold'); } }, 3000); return; }
    clearTimeout(timer);
    let r; try { r = await rpc('ax_admin_member_del', { p_round: ROUND, p_key: KEY, p_member: b.dataset.del }); } catch (e) { r = null; }
    toast(r && r.ok ? `${b.dataset.nm}님을 명단에서 뺐어요` : '빼지 못했어요. 빼기 SQL을 먼저 실행해 주세요', 3000); load(); });
}
$('#bAdd').onclick = async () => { const dept = $('#aDept').value.trim(), name = $('#aName').value.trim();
  if (!dept || !name) return toast('부서와 이름을 모두 넣어 주세요');
  if (ov && ov.members.some(m => m.dept === dept && m.name === name)) return toast('이미 명단에 있어요');
  const r = await rpc('ax_admin_members', { p_round: ROUND, p_key: KEY, p_list: [{ dept, name }] });
  toast(r && r.ok && r.added ? `${name}님(${dept})을 더했어요` : '더하지 못했어요'); $('#aName').value = ''; $('#aName').focus(); load(); };
$('#aName').onkeydown = e => { if (e.key === 'Enter') $('#bAdd').click(); };
$('#bDown').onclick = () => { if (!ov || !window.XLSX) return toast('잠시 뒤 다시 눌러 주세요');
  const rows = [...ov.members].sort((a, b) => a.dept.localeCompare(b.dept, 'ko') || a.name.localeCompare(b.name, 'ko')).map((m, i) => ({ 연번: i + 1, 부서: m.dept, 성명: m.name }));
  const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 10 }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'AI파트너스 명단');
  try { XLSX.writeFile(wb, 'AI파트너스_명단_현재.xlsx'); toast('현재 명단을 받았어요. 고친 뒤 아래에 다시 올리면 돼요'); } catch (e) { toast('이 화면에서는 내려받기가 막혀 있어요'); } };
$('#bPromote').onclick = async () => { const k = $('#pKey').value.trim(); if (!k) return toast('2차 관리 열쇠를 정해 주세요');
  const r = await rpc('ax_admin_promote', { p_round: ROUND, p_key: KEY, p_new: $('#pNew').value.trim(), p_title: '2차 전 직원 투표', p_top: +$('#pTop').value, p_max: +$('#pMax').value, p_closes: new Date($('#pCloses').value).toISOString(), p_new_key: k });
  toast(r && r.ok ? '2차 투표를 만들었어요. config.js의 round 값을 바꾸면 2차로 전환돼요' : '만들지 못했어요', 3500); };
// ───────── 결과보고서 ─────────
const CATN = { doc: '문서 작성', law: '법령·자료 찾기', ops: '업무 관리', civ: '민원·의회·생활' };
const TYPEN = { doc: '문서 혁신가형', law: '근거 탐정형', ops: '업무 설계자형', civ: '주민 소통가형' };
const W = '일월화수목금토';
const fd = (iso, t = true) => { const d = new Date(iso); return `’${String(d.getFullYear()).slice(2)}. ${d.getMonth() + 1}. ${d.getDate()}.(${W[d.getDay()]})${t ? ' ' + d.getHours() + '시' + (d.getMinutes() ? ' ' + d.getMinutes() + '분' : '') : ''}`; };
function buildReport() {
  const cj = no => cands.find(c => c.no === no) || {};
  const ms = ov.members, voted = ms.filter(m => m.voted).length, rate = ms.length ? Math.round(voted / ms.length * 100) : 0;
  const closed = new Date(ov.round.closes_at) <= new Date(ov.round.now || Date.now());
  const tally = ov.tally.map((t, i) => ({ ...t, rank: ov.tally.findIndex(x => x.votes === t.votes) + 1 }));
  const top = tally.slice(0, 20), cutVotes = top.length ? top[top.length - 1].votes : 0;
  const tiesOut = tally.slice(20).filter(t => t.votes === cutVotes && cutVotes > 0);
  const totalPicks = tally.reduce((a, t) => a + t.votes, 0) || 1;
  const byCat = {}; Object.keys(CATN).forEach(k => byCat[k] = { sel: 0, votes: 0, all: tally.filter(t => t.cat === k).length });
  tally.forEach(t => { byCat[t.cat].votes += t.votes; }); top.forEach(t => byCat[t.cat].sel++);
  const types = {}; (ov.ballots || []).forEach(b => { const c = {}; b.forEach(n => { const k = cj(n).cat; c[k] = (c[k] || 0) + 1; }); const s = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const k = s.length > 1 && s[0][1] === s[1][1] ? 'all' : s[0] && s[0][0]; types[k] = (types[k] || 0) + 1; });
  const avg = (ov.ballots || []).length ? ((ov.ballots.reduce((a, b) => a + b.length, 0)) / ov.ballots.length).toFixed(1) : '0';
  const built = top.filter(t => cj(t.no).built).map(t => t.sub);
  const first = top[0] ? `${top[0].sub}(${cj(top[0].no).orig})` : '-';
  const title = `AX30 → 20 AI파트너스 선정 투표 ${closed ? '결과' : '중간 결과'} 보고`;
  const summary = `AI파트너스 ${ms.length}명 중 ${voted}명(${rate}%)이 참여하여 행정AX 우수사례 30종 중 20종을 선정함. 최다 득표는 「${first}」이며, 선정 20종은 ${fd('2026-11-24T00:00:00+09:00', false)}부터 전 직원 투표에 올림`;
  const T = [];
  T.push(title, '', summary, '', '□ 투표 개요',
    ` ㅇ (기간) ${fd(ov.round.opens_at)} ~ ${fd(ov.round.closes_at)}`,
    ` ㅇ (대상) AI파트너스 ${ms.length}명 / 참여 ${voted}명(참여율 ${rate}%)`,
    ` ㅇ (방법) 자체 투표 사이트, 1인 최대 ${ov.round.max_pick || 7}개 복수 선택(1인 평균 ${avg}개)`,
    '', '□ 투표 결과 : 상위 20종 선정');
  top.forEach(t => T.push(` ${String(t.rank).padStart(2)}위 ${t.no}. ${cj(t.no).orig} "${t.sub}" ${t.votes}표 (${CATN[t.cat]})`));
  if (tiesOut.length) T.push(` ※ 20위 동점 ${tiesOut.length}종(${tiesOut.map(t => t.sub).join(', ')}) → 혁신팀 결정 필요`);
  T.push('', '□ 분야별 현황');
  Object.entries(byCat).forEach(([k, v]) => T.push(` ㅇ ${CATN[k]} : ${v.all}종 중 ${v.sel}종 선정, 득표 비중 ${Math.round(v.votes / totalPicks * 100)}%`));
  if (built.length) T.push(` ※ 이미 구축된 도구 중 선정 : ${built.join(', ')} → 전 부서 확대 보급 대상`);
  T.push('', '□ 선정위원 유형');
  T.push(' ㅇ ' + Object.entries(types).map(([k, v]) => `${k === 'all' ? '올라운더형' : TYPEN[k]} ${v}명`).join(', '));
  if (ov.comments.length) { T.push('', '□ 선정위원 의견(일부)'); ov.comments.slice(0, 6).forEach(c => T.push(` ㅇ “${c.comment}” (${c.dept})`)); }
  T.push('', '□ 향후 계획', ' ㅇ 전 직원 투표(선정 20종 → AX10) ’26. 11. 24.(화) ~ 27.(금)', ' ㅇ AX10 확정 및 방침서 작성 ’26. 11. 말', ' ㅇ 프로그램 구축·배포 및 결과보고 ~’27. 1. 8.');
  const text = T.join('\n');
  const rows = top.map((t, i) => `<tr class="${i === top.length - 1 ? 'cut' : ''}"><td>${t.rank}</td><td>${t.no}</td><td class="l"><b>${esc(t.sub)}</b><br><span class="note">${esc(cj(t.no).orig)}${cj(t.no).built ? ' · 이미 구축' : ''}</span></td><td>${CATN[t.cat]}</td><td class="l"><span class="bar" style="width:${Math.round(t.votes / (top[0].votes || 1) * 70)}px"></span>${t.votes}</td><td>${esc(cj(t.no).dept || '')}</td></tr>`).join('');
  const html = `<h1>${title}</h1><div class="dt">${fd(new Date().toISOString(), false)} · 기획예산과 중랑AI혁신팀</div><div class="sum">${esc(summary)}</div>
  <h2>□ 투표 개요</h2><ul><li>ㅇ (기간) ${fd(ov.round.opens_at)} ~ ${fd(ov.round.closes_at)}</li><li>ㅇ (대상) AI파트너스 ${ms.length}명 / 참여 ${voted}명(참여율 ${rate}%)</li><li>ㅇ (방법) 자체 투표 사이트, 1인 최대 ${ov.round.max_pick || 7}개 복수 선택(1인 평균 ${avg}개)</li></ul>
  <h2>□ 투표 결과 : 상위 20종 선정</h2><table><tr><th>순위</th><th>번호</th><th>도구</th><th>분야</th><th>득표</th><th>관련 부서</th></tr>${rows}</table>
  ${tiesOut.length ? `<p class="note">※ 20위 동점 ${tiesOut.length}종(${esc(tiesOut.map(t => t.sub).join(', '))}) → 혁신팀 결정 필요</p>` : ''}
  <h2>□ 분야별 현황</h2><table><tr><th>분야</th><th>후보</th><th>선정</th><th>득표 비중</th></tr>${Object.entries(byCat).map(([k, v]) => `<tr><td>${CATN[k]}</td><td>${v.all}종</td><td>${v.sel}종</td><td class="l"><span class="bar" style="width:${Math.round(v.votes / totalPicks * 120)}px"></span>${Math.round(v.votes / totalPicks * 100)}%</td></tr>`).join('')}</table>
  ${built.length ? `<p class="note">※ 이미 구축된 도구 중 선정 : ${esc(built.join(', '))} → 전 부서 확대 보급 대상</p>` : ''}
  <h2>□ 선정위원 유형</h2><ul><li>ㅇ ${Object.entries(types).map(([k, v]) => `${k === 'all' ? '올라운더형' : TYPEN[k]} ${v}명`).join(', ') || '-'}</li></ul>
  ${ov.comments.length ? `<h2>□ 선정위원 의견(일부)</h2><ul>${ov.comments.slice(0, 6).map(c => `<li>ㅇ “${esc(c.comment)}” (${esc(c.dept)})</li>`).join('')}</ul>` : ''}
  <h2>□ 향후 계획</h2><ul><li>ㅇ 전 직원 투표(선정 20종 → AX10) ’26. 11. 24.(화) ~ 27.(금)</li><li>ㅇ AX10 확정 및 방침서 작성 ’26. 11. 말</li><li>ㅇ 프로그램 구축·배포 및 결과보고 ~’27. 1. 8.</li></ul>
  <p class="note" style="margin-top:14px">※ 개인별 선택 내용은 공개하지 않으며, 투표 자료는 결과 정리 후 삭제</p>`;
  const data = { title, closed, members: ms.length, voted, rate, avg, opens: ov.round.opens_at, closes: ov.round.closes_at, top: top.map(t => ({ rank: t.rank, no: t.no, sub: t.sub, orig: cj(t.no).orig, cat: CATN[t.cat], votes: t.votes, dept: cj(t.no).dept, built: !!cj(t.no).built })), ties: tiesOut.map(t => t.sub), byCat, types, comments: ov.comments.map(c => ({ comment: c.comment, dept: c.dept })) };
  return { html, text, data };
}
async function copyText(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg); } catch (e) { const ta = $('#rText'); ta.value = t; ta.select(); try { document.execCommand('copy'); toast(msg); } catch (x) { toast('복사가 막혔어요. 길게 눌러 복사해 주세요'); } } }
$('#bReport').onclick = () => { if (!ov) return; const r = buildReport(); $('#paper').innerHTML = r.html; $('#rep').classList.add('on');
  $('#rCopy').onclick = () => copyText(r.text, '개조식 문구를 복사했어요. 한글에 붙여 넣으세요');
  $('#rData').onclick = () => copyText(JSON.stringify(r.data, null, 1), '데이터를 복사했어요. Claude에게 붙여 넣으면 한글 파일로 만들어 드려요');
  $('#rPrint').onclick = () => { try { window.print(); } catch (e) { toast('이 화면에서는 인쇄가 막혀 있어요. 실제 사이트에서 눌러 주세요'); } };
  $('#rClose').onclick = () => $('#rep').classList.remove('on'); };
fetch('assets/candidates.json?v=20261120q').then(r => r.json()).then(c => { cands = c; if (KEY) load(); }).catch(() => {});
})();
