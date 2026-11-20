(() => {
'use strict';
const CFG = window.AX_CONFIG || {}; const ROUND = CFG.round || 'ax30-1';
const DEMO = !(CFG.supabaseUrl && CFG.supabaseKey);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = { get(k, d) { try { const v = localStorage.getItem('ax10_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem('ax10_' + k, JSON.stringify(v)); } catch (e) {} } };
const CAT = { doc: { name: '문서 작성', c: '#22e6ff', ju: '글주임', type: '문서 혁신가형', desc: '쓰고 만드는 일을 AI로 바꾸고 싶은 선정위원' },
              law: { name: '법령·자료 찾기', c: '#ffbf4a', ju: '눈주임', type: '근거 탐정형', desc: '근거와 자료를 정확히 찾아내는 선정위원' },
              ops: { name: '업무 관리', c: '#4d8dff', ju: '길주임', type: '업무 설계자형', desc: '일하는 흐름을 똑똑하게 설계하는 선정위원' },
              civ: { name: '민원·의회·생활', c: '#ff4fd8', ju: '말주임', type: '주민 소통가형', desc: '주민과 의회 곁에서 소통을 바꾸는 선정위원' } };
const TAGS = { 1: 'hwp me', 2: 'hwp team', 3: 'me talk', 4: 'excel team', 5: 'hwp me field', 6: 'team', 7: 'excel hwp me', 8: 'ai me', 9: 'ai me', 10: 'ai citizen',
  11: 'me', 12: 'web team', 13: 'web team', 14: 'team', 15: 'web team', 16: 'web me', 17: 'web team', 18: 'web team', 19: 'web team', 20: 'excel me',
  21: 'team', 22: 'me', 23: 'web team', 24: 'me field', 25: 'citizen talk', 26: 'me talk', 27: 'team talk', 28: 'excel team', 29: 'web citizen field', 30: 'web citizen' };

// ───────── effects: vibration / sound / motion ─────────
const fx = Object.assign({ vib: true, snd: false, motion: !matchMedia('(prefers-reduced-motion: reduce)').matches }, store.get('fx', {}));
function paintFx() { $$('#fx [data-k]').forEach(b => b.classList.toggle('on', !!fx[b.dataset.k])); }
$('#gear').onclick = () => $('#fx').classList.toggle('open');
document.addEventListener('click', e => { if (!e.target.closest('#fx')) $('#fx').classList.remove('open'); });
$$('#fx [data-k]').forEach(b => b.onclick = () => { fx[b.dataset.k] = !fx[b.dataset.k]; store.set('fx', fx); paintFx(); if (b.dataset.k === 'vib' && fx.vib) buzz(20); if (b.dataset.k === 'snd' && fx.snd) blip(880, .08); });
paintFx();
const hap = $('#hap');
function buzz(p) { if (!fx.vib) return; try { if (navigator.vibrate && navigator.vibrate(p)) return; } catch (e) {} try { hap && hap.parentElement.click(); } catch (e) {} }
let ac; function blip(f = 660, d = .07, type = 'sine', v = .06) { if (!fx.snd) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.stop(ac.currentTime + d + .02); } catch (e) {} }
function toast(t, ms = 1800) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), ms); }

// ───────── data layer (Supabase or demo) ─────────
let sb = null; if (!DEMO && window.supabase) sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
const Demo = (() => {
  const db = store.get('demo', null) || { members: [], votes: {}, pub: false, closes: '2026-11-23T18:00:00+09:00' };
  if (!db.members.length) { const D = ['기획예산과', '재무과', '행정지원과', '민원여권과', '도시안전과', '건강증진과', '묵2동주민센터']; const N = ['김하늘', '이바다', '박구름', '최별', '정나래', '한결', '윤슬', '서아', '도윤', '하람', '지우', '은재', '유나', '시온'];
    N.forEach((n, i) => db.members.push({ id: 'm' + i, dept: D[i % D.length], name: n + (i > 6 ? '' : '') })); }
  const save = () => store.set('demo', db);
  let cands = [];
  return { setCands(c) { cands = c; }, db, save,
    ax_round_info: () => ({ id: ROUND, title: 'AX30 → 20', max_pick: 7, opens_at: '2026-11-20T00:00:00+09:00', closes_at: db.closes, results_public: db.pub, now: new Date().toISOString() }),
    ax_candidates: () => cands,
    ax_search_member: ({ p_q }) => db.members.filter(m => p_q.trim().length >= 2 && m.name.includes(p_q.trim())).slice(0, 10),
    ax_depts: () => [...new Set(db.members.map(m => m.dept))].sort().map(dept => ({ dept })),
    ax_members_by_dept: ({ p_dept }) => db.members.filter(m => m.dept === p_dept),
    ax_my_vote: ({ p_member, p_device }) => { const v = db.votes[p_member]; if (!v) return null; return (!v.device || v.device === p_device) ? v : { locked: true }; },
    ax_submit: ({ p_member, p_picks, p_comment, p_device }) => { const mine = db.votes[p_member]; if (mine && mine.device && mine.device !== p_device) return { ok: false, msg: '다른 휴대폰에서 이미 투표했어요. 바꾸려면 혁신팀(☎2837)에 초기화를 요청해 주세요.' }; const other = Object.entries(db.votes).find(([k, v]) => v.device === p_device && k !== p_member);
      if (other) return { ok: false, msg: '이 휴대폰으로는 이미 다른 선정위원이 투표했어요. (미리보기에서는 다른 이름 시험 시 이 안내가 떠요)' };
      db.votes[p_member] = { picks: p_picks, comment: p_comment || (db.votes[p_member] || {}).comment, device: p_device, updated_at: new Date().toISOString() }; save(); return { ok: true }; },
    ax_comment: ({ p_member, p_comment, p_device }) => { if (db.votes[p_member] && (!db.votes[p_member].device || db.votes[p_member].device === p_device)) { db.votes[p_member].comment = p_comment; save(); } return { ok: true }; },
    ax_results: () => { if (!db.pub) return { public: false }; const t = {}; cands.forEach(c => t[c.no] = 0); Object.values(db.votes).forEach(v => v.picks.forEach(n => t[n]++));
      const arr = cands.map(c => ({ no: c.no, v: t[c.no] })).sort((a, b) => b.v - a.v || a.no - b.no); const mx = Math.max(1, ...arr.map(a => a.v));
      const tc = {}; let tot = 0; Object.values(db.votes).forEach(v => { const c = {}; v.picks.forEach(n => { const k = (cands.find(x => x.no === n) || {}).cat; c[k] = (c[k] || 0) + 1; }); const s = Object.entries(c).sort((x, y) => y[1] - x[1]); if (!s.length) return; const k = s.length > 1 && s[0][1] === s[1][1] ? 'all' : s[0][0]; tc[k] = (tc[k] || 0) + 1; tot++; });
      const types = Object.fromEntries(Object.entries(tc).map(([k, v]) => [k, Math.round(v / Math.max(tot, 1) * 100)]));
      return { public: true, items: arr.map((a, i) => ({ no: a.no, rank: arr.findIndex(b => b.v === a.v) + 1, ratio: Math.round(a.v / mx * 100) })), types, comments: Object.values(db.votes).map(v => v.comment).filter(Boolean).slice(0, 12),
        title: 'AX30 → 20', opens_at: '2026-11-20T15:00:00+09:00', closes_at: db.closes, max_pick: 7, closed: new Date(db.closes) < new Date() }; } };
})();
window.AX_DEMO = Demo;
async function rpc(fn, args = {}) {
  if (DEMO) return Demo[fn](args);
  for (let i = 0; i < 3; i++) { const { data, error } = await sb.rpc(fn, args); if (!error) return data; if (i === 2) throw error; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
}
const device = (() => { let d = store.get('device', null); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); store.set('device', d); } return d; })();

// ───────── state ─────────
let info = null, cands = [], byNo = {}, me = null, picks = [], MAX = 7, filter = 'all', recoSet = new Set(), serverSkew = 0;
const ROUTES = { sCover: 'start', sWho: 'who', sVote: 'vote', sDone: 'done', sRes: 'result' };
let routing = false;
const show = id => { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); $('#core').style.display = id === 'sVote' ? 'flex' : 'none'; $('#rail').classList.toggle('on', id === 'sVote'); window.scrollTo(0, 0);
  if (!routing && location.hash !== '#' + ROUTES[id]) { try { history.pushState(null, '', '#' + ROUTES[id]); } catch (e) { location.hash = ROUTES[id]; } } };
window.addEventListener('popstate', () => { const h = location.hash.slice(1) || 'start'; const id = Object.keys(ROUTES).find(k => ROUTES[k] === h) || 'sCover';
  routing = true; if ((id === 'sVote' || id === 'sDone') && !me) show('sWho'); else if (id === 'sVote') enterVote(); else show(id); routing = false; });
const img = n => `assets/char/v${String(n).padStart(2, '0')}.webp`;

// ───────── 3D hero (light fallback) ─────────
let has3D = false;
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
function lowEnd() { return (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2); }
function mountHero() {
  const st = $('#stage');
  const still = new Image(); still.className = 'still'; still.src = img(0); still.alt = '글주임'; st.appendChild(still);
  if (!fx.motion || !webglOK() || lowEnd()) return;
  const load = () => { const s = document.createElement('script'); s.src = 'assets/hero.js?v=20261120c';
    s.onload = () => { has3D = true; still.remove(); try { G3D.floor(true); } catch (e) {} setTimeout(() => { try { G3D.say('안녕하세요, 선정위원님!'); } catch (e) {} }, 700); };
    document.body.appendChild(s); };
  (window.requestIdleCallback || (f => setTimeout(f, 600)))(load, { timeout: 1500 });
}

// ───────── cover ─────────
function fmtDate(iso) { const d = new Date(iso); const w = '일월화수목금토'[d.getDay()]; return `~ ${d.getMonth() + 1}. ${d.getDate()}.(${w}) ${d.getHours()}시`; }
function tick() {
  if (!info) return; const now = Date.now() + serverSkew, end = new Date(info.closes_at).getTime(), start = new Date(info.opens_at).getTime();
  const el = $('#count');
  if (now < start) { el.innerHTML = '투표 시작 전이에요'; $('#bStart').disabled = true; return; }
  if (now >= end) { el.innerHTML = '<b>투표가 마감됐어요</b> · 참여해 주셔서 고마워요'; $('#bStart').style.display = 'none'; return; }
  let s = Math.floor((end - now) / 1000); const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
  el.className = 'count' + (end - now < 86400000 ? ' hot' : '');
  el.innerHTML = `마감까지 <b class="mono">${d ? d + '일 ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</b>${end - now < 86400000 ? ' · 오늘이 마지막 날!' : ''}`;
}

// ───────── identity ─────────
function whoBtn(m) { const b = document.createElement('button'); b.className = 'who'; b.innerHTML = `<b>${esc(m.name)}</b><span>${esc(m.dept)}</span>`; b.onclick = () => confirmMe(m); return b; }
function confirmMe(m) {
  buzz(8);
  $('#infoSheet').innerHTML = `<h3 style="text-align:center;margin-top:6px">${esc(m.dept)}<br><span style="font-size:30px">${esc(m.name)}</span> 선정위원님이 맞나요?</h3>
    <p style="text-align:center">다른 사람 이름으로 투표하지 않도록 한 번만 확인할게요.</p><div class="row2"><button class="btn ghost" id="cNo">아니에요</button><button class="btn" id="cYes">네, 맞아요</button></div>`;
  openModal('#mInfo'); $('#cNo').onclick = () => closeModal('#mInfo'); $('#cYes').onclick = () => { closeModal('#mInfo'); choose(m); };
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let qT; $('#q').addEventListener('input', e => { clearTimeout(qT); const v = e.target.value.trim(); qT = setTimeout(async () => {
  const box = $('#hits'); box.innerHTML = ''; if (!v) return; if (v.length < 2) { box.innerHTML = '<div class="empty">두 글자 이상 입력해 주세요</div>'; return; } const r = await rpc('ax_search_member', { p_round: ROUND, p_q: v }).catch(() => []);
  if (!r || !r.length) { box.innerHTML = '<div class="empty">명단에서 찾지 못했어요. 부서에서 찾아보거나 혁신팀(☎2837)에 알려 주세요.</div>'; return; }
  r.forEach(m => box.appendChild(whoBtn(m))); }, 220); });
$('#dept').onchange = async e => { const box = $('#names'); box.innerHTML = ''; if (!e.target.value) return; const r = await rpc('ax_members_by_dept', { p_round: ROUND, p_dept: e.target.value }).catch(() => []);
  (r || []).forEach(m => { const b = document.createElement('button'); b.textContent = m.name; b.onclick = () => confirmMe(m); box.appendChild(b); }); };
async function choose(m) {
  me = m; store.set('me', m); buzz(15); blip(740);
  let mv = await rpc('ax_my_vote', { p_round: ROUND, p_member: m.id, p_device: device }).catch(() => null);
  if (mv && mv.locked) { toast('다른 휴대폰에서 이미 투표한 선정위원이에요. 본인 휴대폰으로 들어오거나 혁신팀(☎2837)에 초기화를 요청해 주세요.', 4200); buzz([40, 40, 40]); return; }
  picks = (mv && mv.picks) ? mv.picks.filter(n => byNo[n]).slice(0, MAX) : [];
  const draft = store.get('draft_' + m.id, null); let restored = false;
  if (draft && draft.length && (!mv || !mv.picks || draft.join() !== mv.picks.join())) { picks = draft.filter(n => byNo[n]).slice(0, MAX); restored = true; }
  if (mv && mv.comment) $('#cmt').value = mv.comment;
  const seen = store.get('booted_' + m.id, false);
  if (!seen && fx.motion) await boot(m, !!(mv && mv.picks)); else if (mv && mv.picks) toast(`${m.name} 파트너님, 이미 투표했어요. 고칠 수 있어요!`, 2400);
  store.set('booted_' + m.id, true);
  enterVote();
  if (restored) setTimeout(() => toast('고르던 내용을 이어서 보여 드려요. 제출해야 저장돼요!', 2600), 500);
}
function hello() { const h = new Date().getHours(); return h < 11 ? '좋은 아침이에요' : h < 14 ? '점심은 드셨어요?' : h < 18 ? '오후도 힘내요' : '퇴근길에도 고마워요'; }
function boot(m, voted) {
  return new Promise(res => {
    const ov = $('#ovBoot'), L = $('#bootLines'), H = $('#bootHello'); ov.classList.add('on'); L.innerHTML = ''; H.textContent = '';
    const lines = ['AX SYSTEM ONLINE', 'AI PARTNERS 인증 중…', '선정위원 인증 완료 ✓']; let i = 0, done = false;
    const finish = () => { if (done) return; done = true; ov.classList.remove('on'); res(); };
    $('#skipBoot').onclick = finish;
    const step = () => { if (done) return; if (i < lines.length) { L.innerHTML += (i ? '<br>' : '') + lines[i++]; blip(500 + i * 120, .05, 'square', .03); setTimeout(step, 420); }
      else { const t = `${m.name} 파트너님, ${voted ? '다시 오셨네요!' : hello() + '!'}`; let k = 0; const ty = setInterval(() => { H.textContent = t.slice(0, ++k); if (k >= t.length) { clearInterval(ty); buzz([10, 40, 10]); setTimeout(finish, 650); } }, 38); } };
    step();
  });
}

// ───────── vote screen ─────────
function enterVote() {
  $('#hi').innerHTML = `<img class="ap" src="assets/logo-sm.png" alt=""><b>${esc(me.name)}</b><span>님</span><span class="dept">· ${esc(me.dept)}</span><button class="swap" id="bSwap">바꾸기</button>`;
  $('#intro').innerHTML = `후보 <b>30종</b> 중 꼭 필요한 도구를 <b>최대 ${MAX}개</b> 골라 주세요. 오른쪽 막대로 위치를 볼 수 있어요.`;
  $('#bSwap').onclick = () => { me = null; store.set('me', null); picks = []; show('sWho'); };
  renderTabs(); renderCards(); renderCore(); show('sVote'); $('#rail').classList.add('on'); updateRail();
}
function renderTabs() {
  const t = $('#tabs'); t.innerHTML = '';
  [['all', '전체', '#22e6ff'], ...Object.entries(CAT).map(([k, v]) => [k, v.name, v.c]), ['mine', '내가 고른 것', '#ffbf4a']].forEach(([k, n, c]) => {
    const b = document.createElement('button'); b.textContent = n; b.style.setProperty('--c', c); b.classList.toggle('on', filter === k);
    b.onclick = () => { filter = k; renderTabs(); renderCards(); }; t.appendChild(b); });
}
let view = store.get('view', 'list');
function renderCards() {
  const q = $('#find').value.trim(); const box = $('#cards'); box.innerHTML = ''; box.classList.toggle('grid', view === 'grid');
  $('#bView').textContent = view === 'grid' ? '☰ 자세히' : '▦ 한눈에';
  let shown = 0;
  Object.entries(CAT).forEach(([k, v]) => {
    const list = cands.filter(c => c.cat === k && (filter === 'all' || filter === k || (filter === 'mine' && picks.includes(c.no))) &&
      (!q || [c.sub, c.orig, c.line, c.descr, c.dept, c.org, ...(c.detail || [])].join(' ').includes(q)));
    if (!list.length) return; shown += list.length;
    const mine = cands.filter(c => c.cat === k && picks.includes(c.no)).length;
    const h = document.createElement('div'); h.className = 'cat'; h.style.setProperty('--c', v.c); h.dataset.cat = k;
    h.innerHTML = `<img src="${img(list[0].no)}" alt=""><h3>${v.name}</h3>${mine ? `<i class="mine">고름 ${mine}</i>` : ''}<em>${v.ju} 계열 · ${cands.filter(c => c.cat === k).length}종</em>`; box.appendChild(h);
    const wrap = view === 'grid' ? Object.assign(document.createElement('div'), { className: 'gwrap' }) : box;
    if (wrap !== box) box.appendChild(wrap);
    list.forEach(c => wrap.appendChild(cardEl(c, v.c)));
  });
  if (!shown) box.innerHTML = '<div class="empty">찾는 후보가 없어요. 다른 낱말로 검색해 보세요.</div>';
  paintSel(); buildRail();
}
$('#bView').onclick = () => { view = view === 'grid' ? 'list' : 'grid'; store.set('view', view); renderCards(); buzz(8); toast(view === 'grid' ? '한눈에 보기: 30종을 작게 모아 봐요. 꾹 누르면 자세히!' : '자세히 보기로 바꿨어요'); };
// ── right rail: where am I (17/30), categories, my picks; drag to jump ──
function buildRail() {
  const tr = $('#rtrack'); const cs = $$('.card'); tr.innerHTML = ''; if (!cs.length) return;
  const counts = {}; cs.forEach(el => { const k = byNo[+el.dataset.no].cat; counts[k] = (counts[k] || 0) + 1; });
  Object.entries(CAT).forEach(([k, v]) => { if (!counts[k]) return; const i = document.createElement('i'); i.style.setProperty('--c', v.c); i.style.flex = counts[k]; tr.appendChild(i); });
  const thumb = document.createElement('b'); thumb.id = 'rthumb'; tr.appendChild(thumb); updateRail();
}
let railT;
function currentIdx() { const cs = $$('.card'); const topH = $('#top').getBoundingClientRect().bottom + 10; let idx = 0;
  for (let i = 0; i < cs.length; i++) { if (cs[i].getBoundingClientRect().bottom > topH) { idx = i; break; } idx = i; } return { idx, cs }; }
function updateRail(flash) {
  const rail = $('#rail'); if (!rail.classList.contains('on')) return; const { idx, cs } = currentIdx(); if (!cs.length) return;
  const f = cs.length > 1 ? idx / (cs.length - 1) : 0; const H = rail.clientHeight; const y = f * H;
  const th = $('#rthumb'); if (th) th.style.top = y + 'px';
  const no = +cs[idx].dataset.no; const bub = $('#rbub'); bub.style.top = y + 'px';
  bub.innerHTML = `${idx + 1}/${cs.length}<small>${esc(byNo[no].sub)}</small>`;
  if (flash) { rail.classList.add('show'); clearTimeout(railT); railT = setTimeout(() => rail.classList.remove('show'), 1100); }
}
let lastY = 0;
window.addEventListener('scroll', () => { if (!$('#sVote').classList.contains('on')) return; updateRail(true);
  const y = window.scrollY; $('#top').classList.toggle('compact', y > lastY + 4 && y > 220 && !$('#find').value); if (y < lastY - 4) $('#top').classList.remove('compact'); lastY = y; }, { passive: true });
(() => { const rail = $('#rail'); let drag = false;
  const go = e => { const r = rail.getBoundingClientRect(); const cy = (e.touches ? e.touches[0].clientY : e.clientY); const f = Math.min(1, Math.max(0, (cy - r.top) / r.height));
    const cs = $$('.card'); if (!cs.length) return; const el = cs[Math.round(f * (cs.length - 1))]; const topH = $('#top').getBoundingClientRect().height + 8;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topH, behavior: 'auto' }); updateRail(true); };
  rail.addEventListener('pointerdown', e => { drag = true; rail.classList.add('drag'); rail.setPointerCapture(e.pointerId); go(e); buzz(5); });
  rail.addEventListener('pointermove', e => { if (drag) go(e); });
  const end = () => { drag = false; rail.classList.remove('drag'); }; rail.addEventListener('pointerup', end); rail.addEventListener('pointercancel', end); })();
function cardEl(c, col) {
  const b = document.createElement('div'); b.className = 'card'; b.dataset.no = c.no; b.style.setProperty('--c', col);
  b.innerHTML = `<input type="checkbox" class="sr" aria-label="${esc(c.no + '번 ' + c.sub)} 고르기"><img class="ch" src="${img(c.no)}" alt="" loading="lazy"><div><div class="t">${esc(c.sub)}</div><div class="say">${esc(c.line)}</div><span class="o">${esc(c.orig)}${c.built ? ' <i class="built">이미 있음 · 확대 보급</i>' : ''}</span></div><div class="ck">✓</div><button class="info" aria-label="자세히">자세히 ⓘ</button>`;
  b.removeAttribute('role'); b.removeAttribute('tabindex');
  const cb = b.querySelector('.sr');
  b.onclick = e => { if (e.target.closest('.info')) { e.stopPropagation(); openInfo(c); return; } if (e.target === cb) return; toggle(c.no, b); };
  cb.onchange = () => toggle(c.no, b);
  b.addEventListener('contextmenu', e => { e.preventDefault(); openInfo(c); });
  let lp; b.addEventListener('touchstart', () => { lp = setTimeout(() => { openInfo(c); lp = null; }, 550); }, { passive: true });
  b.addEventListener('touchend', () => clearTimeout(lp)); b.addEventListener('touchmove', () => clearTimeout(lp), { passive: true });
  return b;
}
function paintSel() {
  $$('.card').forEach(el => { const n = +el.dataset.no; const on = picks.includes(n); el.classList.toggle('sel', on); el.classList.toggle('dim', !on && picks.length >= MAX); el.classList.toggle('reco', recoSet.has(n) && !on); const cb = el.querySelector('.sr'); if (cb) cb.checked = on; });
  $$('.cat').forEach(h => { const k = h.dataset.cat; const n = cands.filter(c => c.cat === k && picks.includes(c.no)).length; let m = h.querySelector('.mine'); if (n) { if (!m) { m = document.createElement('i'); m.className = 'mine'; h.querySelector('h3').after(m); } m.textContent = '고름 ' + n; } else if (m) m.remove(); });
}
function toggle(no, el) {
  const i = picks.indexOf(no);
  if (i >= 0) { picks.splice(i, 1); buzz(6); blip(420, .05); spark(el, false); }
  else { if (picks.length >= MAX) { toast(`최대 ${MAX}개까지 고를 수 있어요`); buzz([30, 30, 30]); blip(200, .12, 'sawtooth', .03); return; }
    picks.push(no); buzz(12); blip(640 + picks.length * 60, .06); spark(el, true);
    if (picks.length === MAX) setTimeout(() => { buzz([12, 60, 12]); blip(1046, .18, 'triangle'); toast(`AX 코어 완성! ${MAX}개를 모두 골랐어요`); }, 450); }
  if (me) store.set('draft_' + me.id, picks);
  paintSel(); setTimeout(renderCore, fx.motion ? 380 : 0);
  if (filter === 'mine') renderCards();
}
function spark(el, toCore) {
  if (!fx.motion || !el) return;
  const a = el.querySelector('.ch').getBoundingClientRect(); const slots = $$('.slot'); const idx = toCore ? picks.length - 1 : picks.length; const s = (slots[idx] || slots[slots.length - 1]).getBoundingClientRect();
  const p = document.createElement('div'); p.className = 'spark'; p.style.setProperty('--c', el.style.getPropertyValue('--c')); document.body.appendChild(p);
  const A = [a.left + a.width / 2 - 8, a.top + a.height / 2 - 8], B = [s.left + s.width / 2 - 8, s.top + s.height / 2 - 8];
  const [f, t] = toCore ? [A, B] : [B, A];
  const mid = [(f[0] + t[0]) / 2 + (Math.random() * 80 - 40), Math.min(f[1], t[1]) - 80];
  p.animate([{ transform: `translate(${f[0]}px,${f[1]}px) scale(1)` }, { transform: `translate(${mid[0]}px,${mid[1]}px) scale(1.4)` }, { transform: `translate(${t[0]}px,${t[1]}px) scale(.6)` }],
    { duration: 420, easing: 'cubic-bezier(.4,.1,.3,1)' }).onfinish = () => p.remove();
}
function renderCore() {
  const s = $('#slots'); s.innerHTML = '';
  for (let i = 0; i < MAX; i++) { const d = document.createElement('div'); d.className = 'slot'; const n = picks[i]; if (n) { d.classList.add('on'); d.style.setProperty('--c', CAT[byNo[n].cat].c); d.title = byNo[n].sub + ' (누르면 빼기)'; d.setAttribute('role', 'button'); d.setAttribute('aria-label', byNo[n].sub + ' 빼기'); d.onclick = () => toggle(n, document.querySelector(`.card[data-no="${n}"]`)); } s.appendChild(d); }
  $('#ncount').innerHTML = `<b>${picks.length}</b>/${MAX}`; $('#bGo').disabled = !picks.length; $('#core').classList.toggle('full', picks.length >= MAX);
}
$('#find').addEventListener('input', () => renderCards());
$('#cards').addEventListener('scroll', () => {}, { passive: true });

// modal helpers (Esc to close, focus inside)
let lastFocus = null;
function openModal(sel) { lastFocus = document.activeElement; const m = $(sel); m.classList.add('on'); m.onclick = e => { if (e.target === m) closeModal(sel); }; setTimeout(() => { const f = m.querySelector('button'); f && f.focus(); }, 30); }
function closeModal(sel) { $(sel).classList.remove('on'); lastFocus && lastFocus.focus && lastFocus.focus(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') ['#mInfo', '#mReco'].forEach(s => $(s).classList.contains('on') && closeModal(s)); });
// detail sheet
function openInfo(c) {
  const v = CAT[c.cat]; const on = picks.includes(c.no);
  $('#infoSheet').innerHTML = `<button class="x" aria-label="닫기">✕</button><span class="tag" style="color:${v.c};border-color:${v.c}">${v.name} · ${c.no}번</span>
    <h3>${esc(c.sub)}</h3><div class="meta">${esc(c.orig)} · ${esc(c.org || '')}</div>
    <div class="big"><img src="${img(c.no)}" alt=""><div class="bigsay">${esc(c.line)}</div></div>
    <div class="chips">${c.built ? '<span class="chip gold">이미 있는 도구 · 전 부서로 넓혀요</span>' : ''}<span class="chip">${c.dept === '공통' || !c.dept ? '전 직원 공통' : '함께할 부서 · ' + esc(c.dept)}</span></div>
    <p>${esc(c.descr || '')}</p>
    ${(c.detail || []).length ? `<ul class="det">${c.detail.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${c.feas ? `<div class="feas"><b>만들기</b><span>난이도 ${esc(c.feas.level)}</span><span>${esc(c.feas.period)}</span><span>${esc(c.feas.form)}</span></div>` : ''}
    <button class="btn ${on ? 'ghost' : ''}" id="infoPick">${on ? '고른 것에서 빼기' : '이 도구 고르기'}</button>`;
  openModal('#mInfo'); $('#infoSheet .x').onclick = () => closeModal('#mInfo');
  $('#infoPick').onclick = () => { closeModal('#mInfo'); toggle(c.no, document.querySelector(`.card[data-no="${c.no}"]`)); };
}
// recommendation questions
$('#bReco').onclick = () => {
  const Q = [['요즘 가장 시간이 많이 드는 일은?', [['문서 쓰기·정리', 'doc'], ['법령·자료 찾기', 'law'], ['일정·서무·관리', 'ops'], ['민원·의회 대응', 'civ']]],
             ['자주 쓰는 도구는?', [['한글 문서', 'hwp'], ['엑셀', 'excel'], ['웹·지도', 'web'], ['전화·대면', 'talk']]],
             ['누구를 가장 돕고 싶나요?', [['나 자신', 'me'], ['우리 팀', 'team'], ['구민', 'citizen'], ['현장 동료', 'field']]]];
  const ans = [];
  $('#recoSheet').innerHTML = `<button class="x">✕</button><h3>글주임의 추천 질문</h3><div class="meta">세 가지만 고르면 어울리는 후보에 불을 켜 드려요</div>` +
    Q.map((q, i) => `<div class="q"><b>${i + 1}. ${q[0]}</b><div class="opts">${q[1].map(o => `<button data-q="${i}" data-v="${o[1]}">${o[0]}</button>`).join('')}</div></div>`).join('') +
    `<button class="btn gold" id="recoGo" style="margin-top:8px">추천 받기</button>`;
  const m = $('#mReco'); openModal('#mReco'); m.querySelector('.x').onclick = () => closeModal('#mReco');
  $$('#recoSheet .opts button').forEach(b => b.onclick = () => { ans[b.dataset.q] = b.dataset.v; $$(`#recoSheet [data-q="${b.dataset.q}"]`).forEach(x => x.classList.toggle('on', x === b)); buzz(8); });
  $('#recoGo').onclick = () => {
    if (ans.filter(Boolean).length < 3) { toast('세 질문에 모두 답해 주세요'); return; }
    const sc = cands.map(c => ({ no: c.no, s: (c.cat === ans[0] ? 3 : 0) + ((TAGS[c.no] || '').includes(ans[1]) ? 2 : 0) + ((TAGS[c.no] || '').includes(ans[2]) ? 2 : 0) + Math.random() * .1 }))
      .sort((a, b) => b.s - a.s).slice(0, MAX);
    recoSet = new Set(sc.map(x => x.no)); closeModal('#mReco'); filter = 'all'; renderTabs(); renderCards(); buzz([10, 40, 10]);
    toast('추천 후보에 금빛 불이 켜졌어요. 마음에 드는 것만 골라 주세요!', 2600);
    const first = document.querySelector('.card.reco'); first && first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
};

// ───────── submit: transmission sequence ─────────
$('#bGo').onclick = async () => {
  if (!picks.length) return;
  const ov = $('#ovSend'), orb = $('#orbit'), beam = $('#beam'); $$('#orbit img:not(.orbitlogo)').forEach(x => x.remove()); beam.classList.remove('go');
  let skip = false; $('#skipSend').onclick = () => { skip = true; };
  const req = rpc('ax_submit', { p_round: ROUND, p_member: me.id, p_picks: picks, p_comment: null, p_device: device }).catch(e => ({ ok: false, msg: '연결이 불안정해요. 잠시 뒤 다시 제출해 주세요.' }));
  if (fx.motion) {
    ov.classList.add('on'); $('#sendTx').textContent = '선택한 도구를 전송하는 중…'; buzz(10); blip(520, .08);
    const els = picks.map((n, i) => { const im = new Image(); im.src = img(n); orb.appendChild(im); return im; });
    const t0 = performance.now();
    await new Promise(res => { const f = t => { const k = (t - t0) / 1000; els.forEach((im, i) => { const a = k * 2.4 + i / els.length * Math.PI * 2, r = 105 * Math.min(1, k * 1.5); im.style.transform = `translate(${Math.cos(a) * r}px,${Math.sin(a) * r * .55}px) scale(${.6 + .4 * Math.min(1, k * 2)})`; });
      if (k < 1.3 && !skip) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    if (!skip) { buzz(14); blip(660, .1); els.forEach(im => { im.style.transition = 'transform .35s ease-in, opacity .35s'; im.style.transform = 'translate(0,0) scale(.2)'; im.style.opacity = 0; });
      await new Promise(r => setTimeout(r, 360)); beam.classList.add('go'); buzz([20, 30, 60]); blip(880, .25, 'triangle', .07); $('#sendTx').textContent = '전송 완료!'; await new Promise(r => setTimeout(r, 900)); }
  }
  const r = await req; ov.classList.remove('on');
  if (r && r.ok) store.set('draft_' + me.id, null);
  if (!r || !r.ok) { toast((r && r.msg) || '제출하지 못했어요. 다시 시도해 주세요.', 3200); buzz([40, 40, 40]); return; }
  finish();
};

// ───────── done ─────────
function typeOf() { const cnt = {}; picks.forEach(n => cnt[byNo[n].cat] = (cnt[byNo[n].cat] || 0) + 1); const s = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  if (s.length > 1 && s[0][1] === s[1][1]) return { key: null, type: '올라운더형', desc: '분야를 가리지 않고 고르게 고른 선정위원', c: '#ffffff', ju: '글주임 패밀리' };
  const k = s[0][0]; return { key: k, ...CAT[k] }; }
async function finish() {
  const T = typeOf();
  $('#doneMsg').innerHTML = `${esc(me.name)} 파트너님 덕분에 중랑이 더 똑똑해져요!`;
  $('#typeBox').style.setProperty('--c', T.c);
  $('#typeBox').innerHTML = `<small>나의 선정위원 유형</small><h3>${T.type}</h3><p>${T.desc} · 대표 캐릭터 ${T.ju}</p>`;
  show('sDone'); buzz([15, 50, 15, 50, 40]);
  // move 3D hero into the done screen
  const st = $('#stage'); $('#doneStage').appendChild(st); window.dispatchEvent(new Event('resize'));
  if (has3D) { try { G3D.applyVariant(0); G3D.smile(); G3D.say('파트너님, 고마워요!'); } catch (e) {} }
  if (fx.motion) for (let i = 0; i < 3; i++) setTimeout(() => { const b = document.createElement('div'); b.className = 'burst'; b.style.borderColor = ['#ffbf4a', '#22e6ff', '#ff4fd8'][i]; document.body.appendChild(b); setTimeout(() => b.remove(), 1300); }, i * 250);
  const url = await makeCard(T); $('#cardImg').src = url; $('#bSave').href = url;
  try { const blob = await (await fetch(url)).blob(); const file = new File([blob], 'AX10_나의선정카드.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { const sh = $('#bShare'); sh.style.display = 'block';
      sh.onclick = () => navigator.share({ files: [file], title: 'AX10 선정위원', text: `나는 ${T.type} 선정위원! #AX10 #중랑AX` }).catch(() => {}); } } catch (e) {}
  checkResults();
}
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
async function makeCard(T) {
  try { await document.fonts.load('900 40px "Noto Sans KR"'); } catch (e) {}
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const F = (w, s) => `${w} ${s}px "Noto Sans KR", sans-serif`;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#071a36'); bg.addColorStop(1, '#020812'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(34,230,255,.07)'; g.lineWidth = 1; for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.save(); g.translate(270, 330); for (let r = 120; r < 250; r += 24) { g.strokeStyle = `rgba(255,191,74,${.25 + (r % 48 ? .3 : .5)})`; g.lineWidth = 3 + (r % 3); g.setLineDash([20 + r % 37, 14]); g.beginPath(); g.arc(0, 0, r, r * .01, r * .01 + 4.6); g.stroke(); } g.restore(); g.setLineDash([]);
  const ch = await loadImg(img(0)); if (ch) g.drawImage(ch, 100, 150, 340, 340);
  g.strokeStyle = '#22e6ff'; g.lineWidth = 4; g.strokeRect(30, 30, W - 60, H - 60);
  const lgo = await loadImg('assets/logo.png'); if (lgo) { g.shadowColor = 'rgba(255,212,59,.8)'; g.shadowBlur = 24; g.drawImage(lgo, W - 210, 60, 140, 140); g.shadowBlur = 0; }
  g.fillStyle = '#ffd43b'; g.font = F(900, 28); g.fillText('AI파트너스 · AX10 선정위원', 500, 140);
  g.fillStyle = '#fff'; g.font = F(900, 92); g.fillText(me.name, 500, 250);
  g.fillStyle = '#9fc6d8'; g.font = F(700, 34); g.fillText(me.dept, 500, 305);
  g.fillStyle = T.c; g.font = F(900, 50); g.fillText(T.type, 500, 395);
  g.fillStyle = '#d6ecf6'; g.font = F(500, 26); g.fillText(T.desc, 500, 440);
  g.fillStyle = '#ffbf4a'; g.font = F(900, 40); g.fillText(`내가 고른 AI 업무도구 ${picks.length}`, 80, 580);
  for (let i = 0; i < picks.length; i++) { const cc = byNo[picks[i]], y = 612 + i * 90, col = CAT[cc.cat].c;
    g.fillStyle = 'rgba(14,40,78,.85)'; g.fillRect(80, y, W - 160, 76); g.fillStyle = col; g.fillRect(80, y, 10, 76);
    const ci = await loadImg(img(cc.no)); if (ci) g.drawImage(ci, 100, y + 2, 72, 72);
    g.fillStyle = col; g.font = F(900, 26); g.fillText(String(cc.no).padStart(2, '0'), 190, y + 48);
    g.fillStyle = '#fff'; g.font = F(800, 32); g.fillText(cc.sub.length > 20 ? cc.sub.slice(0, 19) + '…' : cc.sub, 245, y + 50); }
  g.fillStyle = '#7fa3b6'; g.font = F(700, 24); g.fillText('중랑구 · 중랑AI혁신팀 · 2026', 80, H - 48);
  g.fillStyle = '#22e6ff'; g.font = F(900, 30); g.textAlign = 'right'; g.fillText('#AX10 #중랑AX', W - 80, H - 48); g.textAlign = 'left';
  return c.toDataURL('image/png');
}
$('#bEdit').onclick = () => { const st = $('#stage'); $('#sCover').insertBefore(st, $('#sCover').children[1]); enterVote(); };
$('#bCmt').onclick = async () => { const v = $('#cmt').value.trim(); if (!v) { toast('한마디를 적어 주세요'); return; } await rpc('ax_comment', { p_round: ROUND, p_member: me.id, p_comment: v, p_device: device }).catch(() => {}); toast('소중한 의견, 잘 받았어요!'); buzz(15); };

// ───────── results reveal ─────────
async function checkResults() { const r = await rpc('ax_results', { p_round: ROUND }).catch(() => null); const pub = !!(r && r.public); $('#bResults').style.display = pub ? 'block' : 'none'; $('#bResults2').style.display = pub ? 'block' : 'none'; return r; }
async function showResults() {
  const r = await checkResults(); if (!r || !r.public) { toast('결과는 마감 후 공개돼요'); return; }
  show('sRes'); const box = $('#resList'); box.innerHTML = '';
  const items = r.items.slice(0, 20).reverse();
  for (let i = 0; i < items.length; i++) {
    const it = items[i], c = byNo[it.no]; const d = document.createElement('div'); d.className = 'rbar'; d.style.setProperty('--c', CAT[c.cat].c);
    d.innerHTML = `<div class="rk">${it.rank}</div><img src="${img(it.no)}" alt=""><div class="bar"><i></i><span>${esc(c.sub)}</span></div>`;
    box.prepend(d); await new Promise(res => setTimeout(res, fx.motion ? 160 : 0)); d.classList.add('on'); d.querySelector('i').style.width = Math.max(8, it.ratio) + '%'; buzz(5); blip(400 + i * 25, .04);
  }
  const cut = document.createElement('div'); cut.className = 'cut'; cut.textContent = '— 여기까지 2차 전 직원 투표에 올라가요 —'; box.appendChild(cut);
  const wrap = document.createElement('div'); wrap.className = 'posterbox'; wrap.innerHTML = '<h3>결과 포스터</h3><p>결과를 한 장으로 정리했어요. 저장하거나 카톡으로 나눠 주세요.</p><img id="resPoster" alt="AX30 → 20 결과 포스터"><div class="row2"><a class="btn gold" id="resSave" download="AX30_20_결과포스터.png" style="text-align:center;text-decoration:none;font-size:16px;padding:14px">포스터 저장</a><button class="btn ghost" id="resShare">공유하기</button></div>';
  box.appendChild(wrap);
  const url = await makeResultPoster(r); $('#resPoster').src = url; $('#resSave').href = url;
  $('#resShare').onclick = async () => { try { const blob = await (await fetch(url)).blob(); const f = new File([blob], 'AX30_20_결과포스터.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'AX30 → 20 결과' }); else toast('이 기기에서는 공유가 안 돼요. 포스터를 길게 눌러 저장해 주세요'); } catch (e) {} };
  if (fx.motion) { const b = document.createElement('div'); b.className = 'burst'; document.body.appendChild(b); setTimeout(() => b.remove(), 1300); }
  buzz([20, 40, 60]);
}
async function makeResultPoster(r) {
  try { await document.fonts.load('900 40px "Noto Sans KR"'); } catch (e) {}
  const top = r.items.slice(0, 20); const W = 1080;
  const cm = (r.comments || []).slice(0, 6);
  const H = 640 + top.length * 86 + 120 + 360 + (cm.length ? 120 + cm.length * 70 : 0) + 330;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const F = (w, s) => `${w} ${s}px "Noto Sans KR", sans-serif`;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#061a38'); bg.addColorStop(.5, '#020a18'); bg.addColorStop(1, '#040b1d'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, 260, 20, W / 2, 260, 520); rg.addColorStop(0, 'rgba(255,170,60,.22)'); rg.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, 800);
  g.strokeStyle = 'rgba(34,230,255,.06)'; g.lineWidth = 1; for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  [['#ff3bd0', 22], ['#22e6ff', W - 28]].forEach(([col, x]) => { const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, col); lg.addColorStop(.5, '#22e6ff'); lg.addColorStop(1, col); g.fillStyle = lg; g.shadowColor = col; g.shadowBlur = 18; g.fillRect(x, 0, 6, H); g.shadowBlur = 0; });
  // holo ring + character
  g.save(); g.translate(W / 2, 235); for (let k = 0; k < 7; k++) { const rr = 118 + k * 19; g.strokeStyle = `rgba(255,191,74,${.35 + (k % 2) * .35})`; g.lineWidth = 2 + (k % 3) * 2; g.setLineDash([12 + k * 7, 10 + k * 3]); g.beginPath(); g.arc(0, 0, rr, k * .7, k * .7 + 4.4); g.stroke(); } g.restore(); g.setLineDash([]);
  const ch = await loadImg(img(0)); if (ch) g.drawImage(ch, W / 2 - 140, 95, 280, 280);
  const lgo = await loadImg('assets/logo.png'); if (lgo) { g.shadowColor = 'rgba(255,212,59,.8)'; g.shadowBlur = 22; g.drawImage(lgo, 60, 40, 120, 120); g.shadowBlur = 0; g.fillStyle = '#ffd43b'; g.font = F(900, 30); g.fillText('AI파트너스', 196, 100); g.fillStyle = '#22e6ff'; g.font = F(700, 18); g.fillText('JUNGNANG AI PARTNERS', 196, 130); }
  g.textAlign = 'center';
  const tg = g.createLinearGradient(0, 430, 0, 520); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#22b8ff'); g.fillStyle = tg; g.shadowColor = 'rgba(34,230,255,.8)'; g.shadowBlur = 24; g.font = F(900, 96); g.fillText('AX30 → 20', W / 2, 510); g.shadowBlur = 0;
  g.fillStyle = '#fff'; g.font = F(900, 44); g.fillText('AI파트너스가 고른 20종', W / 2, 575);
  g.fillStyle = '#9fc6d8'; g.font = F(500, 24); const d0 = new Date(r.closes_at); g.fillText(`투표 ${r.closed ? '결과' : '중간 결과'} · ${d0.getMonth() + 1}. ${d0.getDate()}. 마감 · 1인 최대 ${r.max_pick || 7}개`, W / 2, 615);
  g.textAlign = 'left';
  let y = 650;
  for (let i = 0; i < top.length; i++) { const it = top[i], cc = byNo[it.no] || {}, col = (CAT[cc.cat] || {}).c || '#22e6ff';
    g.fillStyle = i < 3 ? 'rgba(40,30,8,.75)' : 'rgba(14,40,78,.8)'; roundRect(g, 70, y, W - 140, 74, 16); g.fill();
    g.strokeStyle = i < 3 ? 'rgba(255,191,74,.9)' : col + '88'; g.lineWidth = i < 3 ? 3 : 1.5; roundRect(g, 70, y, W - 140, 74, 16); g.stroke();
    g.fillStyle = i < 3 ? '#ffbf4a' : '#fff'; g.font = F(900, 34); g.textAlign = 'center'; g.fillText(it.rank, 118, y + 49); g.textAlign = 'left';
    const ci = await loadImg(img(it.no)); if (ci) g.drawImage(ci, 150, y + 2, 70, 70);
    const bw = Math.max(40, Math.round((W - 140 - 250 - 30) * it.ratio / 100)); const bgd = g.createLinearGradient(240, 0, 240 + bw, 0); bgd.addColorStop(0, col + '33'); bgd.addColorStop(1, col + 'aa'); g.fillStyle = bgd; roundRect(g, 235, y + 12, bw, 50, 12); g.fill();
    g.fillStyle = '#fff'; g.font = F(800, 29); const t = cc.sub || ''; g.fillText(t.length > 19 ? t.slice(0, 18) + '…' : t, 252, y + 46);
    y += 86; }
  // 분야별
  y += 30; g.fillStyle = '#ffbf4a'; g.font = F(900, 38); g.fillText('분야별 선정', 80, y + 20); y += 50;
  const ks = Object.keys(CAT); const bw4 = (W - 160 - 3 * 16) / 4;
  ks.forEach((k, i) => { const n = top.filter(t => (byNo[t.no] || {}).cat === k).length, all = cands.filter(x => x.cat === k).length, x = 80 + i * (bw4 + 16);
    g.fillStyle = 'rgba(14,40,78,.85)'; roundRect(g, x, y, bw4, 130, 18); g.fill(); g.strokeStyle = CAT[k].c; g.lineWidth = 2; roundRect(g, x, y, bw4, 130, 18); g.stroke();
    g.textAlign = 'center'; g.fillStyle = CAT[k].c; g.font = F(800, 24); g.fillText(CAT[k].name, x + bw4 / 2, y + 40); g.fillStyle = '#fff'; g.font = F(900, 50); g.fillText(`${n}`, x + bw4 / 2 - 20, y + 105); g.fillStyle = '#9fc6d8'; g.font = F(700, 24); g.fillText(`/${all}`, x + bw4 / 2 + 30, y + 105); g.textAlign = 'left'; });
  y += 170;
  // 유형 비율
  g.fillStyle = '#ffbf4a'; g.font = F(900, 38); g.fillText('선정위원 유형', 80, y + 20); y += 46;
  const T = { doc: CAT.doc, law: CAT.law, ops: CAT.ops, civ: CAT.civ, all: { type: '올라운더형', c: '#ffffff' } };
  const ents = Object.entries(r.types || {}).sort((p, q) => q[1] - p[1]).slice(0, 5);
  ents.forEach(([k, v]) => { const tt = T[k] || T.all; g.fillStyle = '#d6ecf6'; g.font = F(800, 26); g.fillText(tt.type, 80, y + 30); g.fillStyle = 'rgba(255,255,255,.08)'; roundRect(g, 300, y + 8, W - 460, 30, 15); g.fill(); g.fillStyle = tt.c; roundRect(g, 300, y + 8, Math.max(20, (W - 460) * v / 100), 30, 15); g.fill(); g.fillStyle = '#fff'; g.font = F(900, 26); g.fillText(v + '%', W - 145, y + 32); y += 50; });
  y += 30;
  if (cm.length) { g.fillStyle = '#ffbf4a'; g.font = F(900, 38); g.fillText('선정위원 한마디', 80, y + 20); y += 50;
    cm.forEach(t => { g.fillStyle = '#fff'; roundRect(g, 80, y, W - 160, 56, 16); g.fill(); g.fillStyle = '#1f1f24'; g.font = F(700, 25); const s = '“' + (t.length > 34 ? t.slice(0, 33) + '…' : t) + '”'; g.fillText(s, 104, y + 37); y += 70; }); y += 20; }
  // next
  g.fillStyle = 'rgba(34,230,255,.12)'; roundRect(g, 70, y, W - 140, 150, 22); g.fill(); g.strokeStyle = '#22e6ff'; g.lineWidth = 2; roundRect(g, 70, y, W - 140, 150, 22); g.stroke();
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = F(900, 36); g.fillText('다음은 전 직원 투표! 20종 → AX10', W / 2, y + 62); g.fillStyle = '#ffbf4a'; g.font = F(800, 30); g.fillText('’26. 11. 24.(화) ~ 27.(금)', W / 2, y + 112);
  g.fillStyle = '#7fa3b6'; g.font = F(700, 22); g.fillText('AI파트너스 · 중랑구 기획예산과 중랑AI혁신팀 · #AX10 #중랑AX', W / 2, H - 40); g.textAlign = 'left';
  return c.toDataURL('image/png');
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
$('#bResults').onclick = showResults; $('#bResults2').onclick = showResults;
$('#bBack1').onclick = () => show('sCover'); $('#bBack2').onclick = () => show('sCover');
$('#bStart').onclick = () => { buzz(10); blip(600); show('sWho'); setTimeout(() => $('#q').focus(), 300); };

// ───────── init ─────────
(async function init() {
  $('#bStart').disabled = true; $('#count').textContent = '투표 정보를 불러오는 중…';
  if (DEMO) $('#demoTag').innerHTML = '<span class="demo">미리보기 모드 · 예시 명단(김하늘, 이바다 등)으로 시험해 보세요</span>';
  try {
    const cj = await fetch('assets/candidates.json').then(r => r.json()).catch(() => null);
    if (DEMO) Demo.setCands(cj || []);
    info = await rpc('ax_round_info', { p_round: ROUND });
    cands = (DEMO ? cj : await rpc('ax_candidates', { p_round: ROUND })) || [];
    if (!DEMO && cj) cands = cands.map(c => Object.assign({}, cj.find(x => x.no === c.no) || {}, c));
  } catch (e) { toast('투표 정보를 불러오지 못했어요. 새로고침해 주세요.', 4000); return; }
  if (!info) { toast('투표 설정을 찾지 못했어요.'); return; }
  byNo = Object.fromEntries(cands.map(c => [c.no, c])); MAX = info.max_pick || 7; $('#maxTxt').textContent = MAX;
  serverSkew = info.now ? new Date(info.now).getTime() - Date.now() : 0;
  $('#period').textContent = fmtDate(info.closes_at); $('#bStart').disabled = false; tick(); setInterval(tick, 1000);
  const depts = await rpc('ax_depts', { p_round: ROUND }).catch(() => []); (depts || []).forEach(d => { const o = document.createElement('option'); o.value = o.textContent = d.dept; $('#dept').appendChild(o); });
  const saved = store.get('me', null);
  if (saved) { const b = $('#bResume'); b.style.display = 'block'; b.textContent = `${saved.name} 선정위원으로 이어서 하기`; b.onclick = () => choose(saved); }
  checkResults(); mountHero();
  try { history.replaceState(null, '', '#start'); } catch (e) {}
})();
})();
