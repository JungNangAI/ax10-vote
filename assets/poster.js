// 결과 포스터 (관리자 화면용). 투표 사이트의 포스터와 같은 그림, 내부용은 표 수·참여율을 함께 넣음
(() => {
let cands = [], byNo = {};
const img = n => `assets/char/v${String(n).padStart(2, '0')}.webp`;
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const CAT = { L: { name: 'L · Life', full: '주민 생활', c: '#ff4fd8', ju: '말주임', type: '생활 혁신가형', desc: '주민 삶 가까이에서 AI를 쓰고 싶은 분' },
              O: { name: 'O · Office', full: '행정 업무', c: '#22e6ff', ju: '글주임', type: '행정 혁신가형', desc: '일하는 방식을 AI로 바꾸고 싶은 분' } };
const LEG = { doc: { type: '문서 혁신가형', c: '#22e6ff' }, law: { type: '근거 탐정형', c: '#ffbf4a' }, ops: { type: '업무 설계자형', c: '#4d8dff' }, civ: { type: '주민 소통가형', c: '#ff4fd8' } };
async function makeResultPoster(r, opt = {}) {
  try { await document.fonts.load('900 40px "Noto Sans KR"'); } catch (e) {}
  const top = r.items.slice(0, r.anon ? 10 : 20); const W = 1080;
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
  const lgo = await loadImg('assets/logo.png'); if (lgo) { g.shadowColor = 'rgba(255,212,59,.8)'; g.shadowBlur = 22; g.drawImage(lgo, 60, 40, 120, 120); g.shadowBlur = 0; g.fillStyle = '#ffd43b'; g.font = F(900, 30); g.fillText(r.anon ? '중랑구 AX10' : 'AI파트너스', 196, 100); g.fillStyle = '#22e6ff'; g.font = F(700, 18); g.fillText(r.anon ? 'ALL STAFF VOTE' : 'JUNGNANG AI PARTNERS', 196, 130); }
  g.textAlign = 'center';
  const tg = g.createLinearGradient(0, 430, 0, 520); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#22b8ff'); g.fillStyle = tg; g.shadowColor = 'rgba(34,230,255,.8)'; g.shadowBlur = 24; g.font = F(900, 96); g.fillText(r.anon ? 'AX20 → 10' : 'AX30 → 20', W / 2, 510); g.shadowBlur = 0;
  g.fillStyle = '#fff'; g.font = F(900, 44); g.fillText(r.anon ? '전 직원이 고른 AX10' : 'AI파트너스가 고른 20종', W / 2, 575);
  g.fillStyle = '#9fc6d8'; g.font = F(500, 24); const d0 = new Date(r.closes_at); g.fillText(`투표 ${r.closed ? '결과' : '중간 결과'} · ${d0.getMonth() + 1}. ${d0.getDate()}. 마감 · 1인 최대 ${r.max_pick || 7}개${opt.internal ? ` · 참여 ${r.voted}/${r.members}명(${r.rate}%)` : ''}`, W / 2, 615);
  g.textAlign = 'left';
  let y = 650;
  for (let i = 0; i < top.length; i++) { const it = top[i], cc = byNo[it.no] || {}, col = (CAT[cc.cat] || {}).c || '#22e6ff';
    g.fillStyle = i < 3 ? 'rgba(40,30,8,.75)' : 'rgba(14,40,78,.8)'; roundRect(g, 70, y, W - 140, 74, 16); g.fill();
    g.strokeStyle = i < 3 ? 'rgba(255,191,74,.9)' : col + '88'; g.lineWidth = i < 3 ? 3 : 1.5; roundRect(g, 70, y, W - 140, 74, 16); g.stroke();
    g.fillStyle = i < 3 ? '#ffbf4a' : '#fff'; g.font = F(900, 34); g.textAlign = 'center'; g.fillText(it.rank, 118, y + 49); g.textAlign = 'left';
    const ci = await loadImg(img(it.no)); if (ci) g.drawImage(ci, 150, y + 2, 70, 70);
    const bw = Math.max(40, Math.round((W - 140 - 250 - 30) * it.ratio / 100)); const bgd = g.createLinearGradient(240, 0, 240 + bw, 0); bgd.addColorStop(0, col + '33'); bgd.addColorStop(1, col + 'aa'); g.fillStyle = bgd; roundRect(g, 235, y + 12, bw, 50, 12); g.fill();
    g.fillStyle = '#fff'; g.font = F(800, 29); const t = cc.sub || ''; g.fillText(t.length > (opt.internal ? 16 : 19) ? t.slice(0, opt.internal ? 15 : 18) + '…' : t, 252, y + 46);
    if (opt.internal) { g.textAlign = 'right'; g.fillStyle = i < 3 ? '#ffbf4a' : '#d6ecf6'; g.font = F(900, 30); g.fillText(`${it.votes}표`, W - 96, y + 47); g.textAlign = 'left'; }
    y += 86; }
  // 분야별
  y += 30; g.fillStyle = '#ffbf4a'; g.font = F(900, 38); g.fillText('분야별 선정', 80, y + 20); y += 50;
  const ks = Object.keys(CAT); const bw4 = (W - 160 - (ks.length - 1) * 16) / ks.length;
  ks.forEach((k, i) => { const n = top.filter(t => (byNo[t.no] || {}).cat === k).length, all = cands.filter(x => x.cat === k).length, x = 80 + i * (bw4 + 16);
    g.fillStyle = 'rgba(14,40,78,.85)'; roundRect(g, x, y, bw4, 130, 18); g.fill(); g.strokeStyle = CAT[k].c; g.lineWidth = 2; roundRect(g, x, y, bw4, 130, 18); g.stroke();
    g.textAlign = 'center'; g.fillStyle = CAT[k].c; g.font = F(800, 24); g.fillText(CAT[k].name, x + bw4 / 2, y + 40); g.fillStyle = '#fff'; g.font = F(900, 50); g.fillText(`${n}`, x + bw4 / 2 - 20, y + 105); g.fillStyle = '#9fc6d8'; g.font = F(700, 24); g.fillText(`/${all}`, x + bw4 / 2 + 30, y + 105); g.textAlign = 'left'; });
  y += 170;
  // 유형 비율
  g.fillStyle = '#ffbf4a'; g.font = F(900, 38); g.fillText(r.anon ? '참여자 유형' : '선정위원 유형', 80, y + 20); y += 46;
  const T = { ...LEG, ...CAT, all: { type: '올라운더형', c: '#ffffff' } };
  const ents = Object.entries(r.types || {}).sort((p, q) => q[1] - p[1]).slice(0, 5);
  ents.forEach(([k, v]) => { const tt = T[k] || T.all; g.fillStyle = '#d6ecf6'; g.font = F(800, 26); g.fillText(tt.type, 80, y + 30); g.fillStyle = 'rgba(255,255,255,.08)'; roundRect(g, 300, y + 8, W - 460, 30, 15); g.fill(); g.fillStyle = tt.c; roundRect(g, 300, y + 8, Math.max(20, (W - 460) * v / 100), 30, 15); g.fill(); g.fillStyle = '#fff'; g.font = F(900, 26); g.fillText(v + '%', W - 145, y + 32); y += 50; });
  y += 30;
  if (cm.length) { g.fillStyle = '#ffbf4a'; g.font = F(900, 38); g.fillText(r.anon ? '직원 한마디' : '선정위원 한마디', 80, y + 20); y += 50;
    cm.forEach(t => { g.fillStyle = '#fff'; roundRect(g, 80, y, W - 160, 56, 16); g.fill(); g.fillStyle = '#1f1f24'; g.font = F(700, 25); const s = '“' + (t.length > 34 ? t.slice(0, 33) + '…' : t) + '”'; g.fillText(s, 104, y + 37); y += 70; }); y += 20; }
  // next
  g.fillStyle = 'rgba(34,230,255,.12)'; roundRect(g, 70, y, W - 140, 150, 22); g.fill(); g.strokeStyle = '#22e6ff'; g.lineWidth = 2; roundRect(g, 70, y, W - 140, 150, 22); g.stroke();
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = F(900, 36); g.fillText(r.anon ? '다음은 부서와 함께 만들기! AX10 구축·배포' : '다음은 전 직원 투표! 20종 → AX10', W / 2, y + 62); g.fillStyle = '#ffbf4a'; g.font = F(800, 30); g.fillText(r.anon ? '’26. 12.~ 완성되는 대로 배포' : '’26. 11. 24.(화) ~ 27.(금)', W / 2, y + 112);
  g.fillStyle = '#7fa3b6'; g.font = F(700, 22); g.fillText(r.anon ? '중랑구 기획예산과 중랑AI혁신팀 · #AX10 #중랑AX' : 'AI파트너스 · 중랑구 기획예산과 중랑AI혁신팀 · #AX10 #중랑AX', W / 2, H - 40); g.textAlign = 'left';
  return c.toDataURL('image/png');
}

window.AXPoster = { make: (r, list, opt) => { cands = list; byNo = {}; list.forEach(c => byNo[c.no] = c); return makeResultPoster(r, opt); } };
})();
