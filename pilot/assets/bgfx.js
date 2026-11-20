// PC 양옆 빈 곳 배경: 빛나는 회로 칩 바닥 + 홀로그램 'AI' (직접 그린 그림, 한 번만 그려서 가볍게)
(() => {
  const mq = matchMedia('(min-width:1200px) and (hover:hover)');
  let cv, wrap, t;
  function build() {
    if (!mq.matches) { if (wrap) wrap.style.display = 'none'; return; }
    if (!wrap) {
      wrap = document.createElement('div'); wrap.id = 'bgfx'; wrap.setAttribute('aria-hidden', 'true');
      cv = document.createElement('canvas'); wrap.appendChild(cv);
      const sweep = document.createElement('i'); sweep.className = 'sweep'; wrap.appendChild(sweep);
      document.body.prepend(wrap);
    }
    wrap.style.display = 'block';
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 하늘: 깊은 남색
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#01060f'); bg.addColorStop(.45, '#03122a'); bg.addColorStop(1, '#020a18');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 원근감 있는 칩 바닥
    const hor = H * .36, cx = W / 2; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const Wt = W * .075;
    for (let r = 0; r < 60; r++) {
      const z0 = 1 + r * .32, z1 = z0 + .32; const bot = hor + (H - hor) / z0, top = hor + (H - hor) / z1;
      if (bot - top < 1.2) break;
      const cols = Math.ceil(W / (Wt / z0) / 2) + 2;
      for (let c = -cols; c <= cols; c++) {
        const xL0 = cx + (c - .5) * Wt / z0, xR0 = cx + (c + .5) * Wt / z0, xL1 = cx + (c - .5) * Wt / z1, xR1 = cx + (c + .5) * Wt / z1, k = z0 / z1;
        const gap = (xR0 - xL0) * .09, gv = (bot - top) * .12;
        const p = [[xL1 + gap * k, top + gv], [xR1 - gap * k, top + gv], [xR0 - gap, bot - gv], [xL0 + gap, bot - gv]];
        if (p[2][0] < -50 || p[3][0] > W + 50) continue;
        const near = Math.max(0, 1 - r / 22);
        g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
        const tf = g.createLinearGradient(0, top, 0, bot); tf.addColorStop(0, `rgba(14,34,66,${.55 + near * .3})`); tf.addColorStop(1, `rgba(8,20,42,${.7 + near * .25})`);
        g.fillStyle = tf; g.fill();
        g.strokeStyle = `rgba(40,160,255,${.12 + near * .35})`; g.lineWidth = .6 + near * .9; g.stroke();
        // 칩 앞면 아래 빛줄
        if (rnd() < .55) { g.strokeStyle = `rgba(60,200,255,${.25 + near * .5})`; g.lineWidth = .8 + near * 1.6; g.shadowColor = '#39c6ff'; g.shadowBlur = 8 * near + 2;
          g.beginPath(); g.moveTo(p[3][0], p[3][1] + gv * .6); g.lineTo(p[2][0], p[2][1] + gv * .6); g.stroke(); g.shadowBlur = 0; }
        // 칩 위 작은 LED
        if (rnd() < .35) { const lx = (p[0][0] + p[2][0]) / 2 + (rnd() - .5) * (xR0 - xL0) * .4, ly = (top + bot) / 2 + (rnd() - .5) * (bot - top) * .3;
          g.fillStyle = `rgba(120,230,255,${.4 + near * .6})`; g.shadowColor = '#5fe0ff'; g.shadowBlur = 6; g.fillRect(lx, ly, 1.4 + near * 2, 1.4 + near * 2); g.shadowBlur = 0; }
      }
    }
    // 멀리 흐린 빛
    const fog = g.createRadialGradient(cx, hor, 10, cx, hor, W * .7); fog.addColorStop(0, 'rgba(30,120,255,.28)'); fog.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fog; g.fillRect(0, 0, W, H);
    // 가운데(투표 내용)는 어둡게 눌러서 글자가 잘 보이게
    const content = W >= 1280 ? Math.min(1120, Math.max(760, W - 520)) : Math.min(1120, W - 80), gw = (W - content) / 2;
    const mid = g.createLinearGradient(0, 0, W, 0); const a = gw / W, b = (gw + content) / W;
    mid.addColorStop(0, 'rgba(1,6,16,0)'); mid.addColorStop(Math.max(0, a - .03), 'rgba(1,6,16,.05)'); mid.addColorStop(a + .02, 'rgba(2,9,22,.86)');
    mid.addColorStop(b - .02, 'rgba(2,9,22,.86)'); mid.addColorStop(Math.min(1, b + .03), 'rgba(1,6,16,.05)'); mid.addColorStop(1, 'rgba(1,6,16,0)');
    g.fillStyle = mid; g.fillRect(0, 0, W, H);
    // 양옆 홀로그램 AI
    if (gw > 120) [gw / 2, W - gw / 2].forEach((x, i) => holo(g, x, H * .62, Math.min(gw * .62, 190), i));
    overlay(W, H, gw);
  }
  function holo(g, x, y, s, flip) {
    const font = `900 ${s}px "Noto Sans KR", system-ui, sans-serif`; g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    // 받침대
    g.save(); g.translate(x, y + s * .08); g.scale(1, .32);
    const pad = g.createRadialGradient(0, 0, 4, 0, 0, s * .9); pad.addColorStop(0, 'rgba(80,210,255,.55)'); pad.addColorStop(.5, 'rgba(30,120,255,.18)'); pad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = pad; g.beginPath(); g.arc(0, 0, s * .9, 0, Math.PI * 2); g.fill(); g.restore();
    // 겹친 윤곽선 (뒤에서 앞으로)
    for (let k = 4; k >= 0; k--) {
      const dx = (flip ? -1 : 1) * k * s * .035, dy = -k * s * .02;
      g.lineWidth = k ? 1.2 : 2.4; g.strokeStyle = `rgba(${k ? 60 : 150},${k ? 170 : 235},255,${k ? .22 + (4 - k) * .08 : .95})`;
      g.shadowColor = '#3cc8ff'; g.shadowBlur = k ? 6 : 22; g.strokeText('AI', x + dx, y + dy);
    }
    g.shadowBlur = 0;
    // 글자 안의 데이터 점
    g.save(); g.beginPath(); g.font = font;
    const off = document.createElement('canvas'); const ow = Math.ceil(s * 1.6), oh = Math.ceil(s * 1.1); off.width = ow; off.height = oh;
    const o = off.getContext('2d'); o.font = font; o.textAlign = 'center'; o.fillStyle = '#fff'; o.fillText('AI', ow / 2, oh * .86);
    o.globalCompositeOperation = 'source-in'; o.fillStyle = 'rgba(0,0,0,0)'; o.fillRect(0, 0, ow, oh);
    let sd = 3 + flip; const r2 = () => (sd = (sd * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < s * 9; i++) { o.fillStyle = `rgba(${90 + r2() * 120},${200 + r2() * 55},255,${.25 + r2() * .7})`; o.fillRect(r2() * ow, r2() * oh, 1 + r2() * 3.2, 1 + r2() * 2); }
    g.globalAlpha = .9; g.drawImage(off, x - ow / 2, y - oh * .86); g.globalAlpha = 1; g.restore();
    // 바닥 반사
    g.save(); g.translate(0, (y + s * .04) * 2); g.scale(1, -1); g.globalAlpha = .18; g.drawImage(off, x - ow / 2, y - oh * .86); g.restore(); g.globalAlpha = 1;
  }

  // ── 움직이는 층: AI 글자 테두리에 DRL 빛 흐름 + 두근거리는 인공지능 뇌 ──
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, at, kids) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); (kids || []).forEach(c => e.appendChild(c)); return e; };
  const BRAIN = 'M70 200C40 170 40 112 80 86C94 52 138 34 174 44C200 24 250 24 276 44C312 40 350 64 356 104C382 124 382 176 356 196C350 226 320 246 290 240C274 262 240 268 214 254C186 262 150 260 128 246C100 244 72 226 70 200Z';
  const GYRI = ['M96 120C120 104 140 116 160 100', 'M112 160C136 146 150 160 168 150', 'M250 70C266 88 290 80 304 96', 'M300 130C320 140 334 132 350 146', 'M96 196C118 186 132 200 150 192', 'M270 206C290 196 306 210 330 198', 'M190 58C200 74 222 74 232 60', 'M330 170C342 180 352 176 362 182'];
  function brainSVG(id) {
    const s = el('svg', { viewBox: '0 0 420 340', class: 'brain' });
    const d = el('defs');
    const gr = el('radialGradient', { id: id + 'f', cx: '50%', cy: '45%', r: '60%' }, [el('stop', { offset: '0', 'stop-color': '#4fd8ff', 'stop-opacity': '.55' }), el('stop', { offset: '.6', 'stop-color': '#1a6dff', 'stop-opacity': '.22' }), el('stop', { offset: '1', 'stop-color': '#0a2a7a', 'stop-opacity': '.05' })]);
    const cp = el('clipPath', { id: id + 'c' }, [el('path', { d: BRAIN })]);
    const bl = el('filter', { id: id + 'g', x: '-30%', y: '-30%', width: '160%', height: '160%' }, [el('feGaussianBlur', { stdDeviation: '4', result: 'b' }), el('feMerge', {}, [el('feMergeNode', { in: 'b' }), el('feMergeNode', { in: 'SourceGraphic' })])]);
    d.append(gr, cp, bl); s.appendChild(d);
    const beat = el('g', { class: 'beat' });
    beat.appendChild(el('path', { d: BRAIN, fill: `url(#${id}f)`, stroke: '#7fe6ff', 'stroke-width': '2.5', filter: `url(#${id}g)` }));
    beat.appendChild(el('ellipse', { cx: 300, cy: 236, rx: 46, ry: 22, fill: 'rgba(60,170,255,.18)', stroke: 'rgba(127,230,255,.6)', 'stroke-width': '1.5' }));
    beat.appendChild(el('path', { d: 'M206 252C210 272 214 290 212 312', stroke: 'rgba(127,230,255,.7)', 'stroke-width': '10', 'stroke-linecap': 'round', fill: 'none' }));
    const inner = el('g', { 'clip-path': `url(#${id}c)` });
    GYRI.forEach(q => inner.appendChild(el('path', { d: q, stroke: 'rgba(150,230,255,.35)', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round' })));
    // 칩에서 뻗는 회로선 + 흐르는 신호
    let sd = id.length * 97 + 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const C = { x: 172, y: 112, w: 76, h: 76 };
    for (let i = 0; i < 26; i++) {
      const side = i % 4, t = (Math.floor(i / 4) + 1) / 8;
      let x = side === 0 ? C.x + C.w * t : side === 1 ? C.x + C.w : side === 2 ? C.x + C.w * t : C.x, y = side === 0 ? C.y : side === 1 ? C.y + C.h * t : side === 2 ? C.y + C.h : C.y + C.h * t;
      const dx = side === 1 ? 1 : side === 3 ? -1 : 0, dy = side === 0 ? -1 : side === 2 ? 1 : 0; const L1 = 14 + r() * 24, L2 = 24 + r() * 60, turn = r() < .5 ? -1 : 1;
      const x1 = x + dx * L1, y1 = y + dy * L1; const x2 = x1 + (dx || turn) * L2 * .7, y2 = y1 + (dy || turn) * L2 * .7; const x3 = x2 + dx * L2 * .5, y3 = y2 + dy * L2 * .5;
      const dd = `M${x} ${y}L${x1} ${y1}L${x2} ${y2}L${x3} ${y3}`;
      inner.appendChild(el('path', { d: dd, stroke: 'rgba(120,220,255,.55)', 'stroke-width': '1.6', fill: 'none' }));
      const sig = el('path', { d: dd, class: 'sig', pathLength: '100', stroke: '#e6fbff', 'stroke-width': '2.6', fill: 'none', 'stroke-linecap': 'round' });
      sig.style.animationDelay = (r() * 2.2).toFixed(2) + 's'; inner.appendChild(sig);
      const n = el('circle', { cx: x3, cy: y3, r: 3.2, class: 'node', fill: '#bff4ff' }); n.style.animationDelay = (r() * 1.1).toFixed(2) + 's'; inner.appendChild(n);
    }
    // 신경망 점
    for (let i = 0; i < 40; i++) { const c = el('circle', { cx: 60 + r() * 300, cy: 40 + r() * 220, r: .8 + r() * 1.8, fill: 'rgba(200,245,255,.7)', class: 'spark' }); c.style.animationDelay = (r() * 3).toFixed(2) + 's'; inner.appendChild(c); }
    beat.appendChild(inner);
    // 칩
    const chip = el('g', { class: 'chip' });
    for (let k = 0; k < 9; k++) { const o = C.x + 8 + k * 7.5; chip.appendChild(el('path', { d: `M${o} ${C.y - 6}V${C.y}M${o} ${C.y + C.h}V${C.y + C.h + 6}M${C.x - 6} ${C.y + 8 + k * 7.5}H${C.x}M${C.x + C.w} ${C.y + 8 + k * 7.5}H${C.x + C.w + 6}`, stroke: '#9eeeff', 'stroke-width': '2' })); }
    chip.appendChild(el('rect', { x: C.x, y: C.y, width: C.w, height: C.h, rx: 8, fill: 'rgba(20,90,180,.85)', stroke: '#c9f6ff', 'stroke-width': '2.5', filter: `url(#${id}g)` }));
    const tx = el('text', { x: C.x + C.w / 2, y: C.y + C.h / 2 + 13, 'text-anchor': 'middle', 'font-size': '38', 'font-weight': '900', fill: '#eafcff', 'font-family': 'Noto Sans KR, sans-serif' }); tx.textContent = 'AI'; chip.appendChild(tx);
    beat.appendChild(chip); s.appendChild(beat);
    return s;
  }
  function overlay(W, H, gw) {
    let ov = document.getElementById('bgov'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'bgov'; wrap.appendChild(ov);
    if (gw <= 120) return;
    const s = Math.min(gw * .62, 190);
    [gw / 2, W - gw / 2].forEach((x, i) => {
      // AI 글자 테두리 DRL
      const sv = el('svg', { class: 'aidrl', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      const base = { x, y: H * .62, 'text-anchor': 'middle', 'font-size': s, 'font-weight': '900', 'font-family': 'Noto Sans KR, system-ui, sans-serif', fill: 'none' };
      const t1 = el('text', { ...base, class: 'flow', stroke: '#eaffff', 'stroke-width': '3' }); t1.textContent = 'AI';
      const t2 = el('text', { ...base, class: 'flow f2', stroke: '#6fe3ff', 'stroke-width': '5' }); t2.textContent = 'AI';
      if (i) { t1.style.animationDelay = '-1.4s'; t2.style.animationDelay = '-2.6s'; }
      sv.append(t2, t1); ov.appendChild(sv);
      // 인공지능 뇌 (위쪽 빈 곳)
      const bw = Math.min(gw * .86, 340); if (bw < 120) return;
      const box = document.createElement('div'); box.className = 'brainbox'; box.style.cssText = `left:${x - bw / 2}px;top:${H * .2 - bw * .28}px;width:${bw}px;height:${bw * .95}px`;
      box.innerHTML = '<i class="halo"></i><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i>' + Array.from({ length: 10 }, (_, k) => `<b class="pt" style="left:${20 + Math.random() * 60}%;animation-delay:${(k * .37).toFixed(2)}s"></b>`).join('');
      const b = brainSVG('br' + i); box.appendChild(b); ov.appendChild(box);
    });
  }
  const go = () => { clearTimeout(t); t = setTimeout(build, 150); };
  addEventListener('resize', go); mq.addEventListener && mq.addEventListener('change', go);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
})();
