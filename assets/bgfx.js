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
    const content = Math.min(1120, W - 80), gw = (W - content) / 2;
    const mid = g.createLinearGradient(0, 0, W, 0); const a = gw / W, b = (gw + content) / W;
    mid.addColorStop(0, 'rgba(1,6,16,0)'); mid.addColorStop(Math.max(0, a - .03), 'rgba(1,6,16,.05)'); mid.addColorStop(a + .02, 'rgba(2,9,22,.86)');
    mid.addColorStop(b - .02, 'rgba(2,9,22,.86)'); mid.addColorStop(Math.min(1, b + .03), 'rgba(1,6,16,.05)'); mid.addColorStop(1, 'rgba(1,6,16,0)');
    g.fillStyle = mid; g.fillRect(0, 0, W, H);
    // 양옆 홀로그램 AI
    if (gw > 120) [gw / 2, W - gw / 2].forEach((x, i) => holo(g, x, H * .62, Math.min(gw * .62, 190), i));
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
  const go = () => { clearTimeout(t); t = setTimeout(build, 150); };
  addEventListener('resize', go); mq.addEventListener && mq.addEventListener('change', go);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
})();
