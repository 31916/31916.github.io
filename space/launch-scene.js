// All stage coordinates are in illustration units. Station x positions stay
// relative to the viewport, including while the launch camera rises.
(() => {
  const canvas = document.getElementById('launch-scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const duration = 6000;
  if (!ctx) {
    window.launchSequenceDone = new Promise(done => setTimeout(done, duration));
    return;
  }

  const paper = '#f5efe1', sand = '#e5d3af', mist = '#aec4d4', wine = '#790d16', ink = '#30241f';
  const atlas = new Image();
  const sprites = {
    // Source rectangle in the SVG viewBox, then original drawing origin.
    engine: [12, 102, 60, 60, 42, 160], body: [97, 51, 38, 55, 116, 160],
    nose: [170, 12, 32, 42, 186, 160], plume: [238, 9, 24, 56, 250, 10],
    gantry: [283, 9, 92, 172, 304, 170], wheel: [445, 14, 24, 24, 457, 26]
  };
  const clamp = v => Math.max(0, Math.min(1, v));
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const ease = v => v * v * (3 - 2 * v);
  const tau = Math.PI * 2;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const plate = document.createElement('canvas');
  let w, h, unit, density, deck, ground, texture;
  let started, lastTime = 0;

  function circle(c, x, y, r, fill) {
    c.fillStyle = fill;
    c.beginPath();
    c.arc(x, y, r, 0, tau);
    c.fill();
  }
  function lines(c, points, color, weight) {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) c.lineTo(x, y);
    c.strokeStyle = color; c.lineWidth = weight; c.stroke();
  }
  function polygon(c, points, color) {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) c.lineTo(x, y);
    c.closePath(); c.fillStyle = color; c.fill();
  }
  function rect(c, x, y, width, height, color) {
    c.fillStyle = color; c.fillRect(x, y, width, height);
  }
  function sprite(name, x, y) {
    const [sx, sy, width, height, ox, oy] = sprites[name];
    ctx.drawImage(atlas, sx * 3, sy * 3, width * 3, height * 3,
      x + sx - ox, y + sy - oy, width, height);
  }
  // Fixed grain, printed once. Randomness never changes between frames.
  function randomSource(seed) {
    return () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  }
  function paperTexture() {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 144;
    const c = tile.getContext('2d');
    const random = randomSource(31916);
    for (let i = 0; i < 1250; i++) {
      c.globalAlpha = random() * .12;
      rect(c, random() * 144, random() * 144, .5 + random() * 1.3, .6, ink);
    }
    return ctx.createPattern(tile, 'repeat');
  }

  function cloudLine(c, x, y, length) {
    const u = length / 100;
    c.save(); c.translate(x, y); c.scale(u, u);
    c.beginPath(); c.moveTo(-57, 1); c.lineTo(-24, 1);
    c.bezierCurveTo(-19, -3, -13, -4, -6, -3);
    c.bezierCurveTo(2, -14, 16, -12, 22, -5);
    c.bezierCurveTo(31, -7, 36, -4, 40, -2);
    c.lineTo(58, -1); c.lineTo(46, 1); c.closePath(); c.fillStyle = '#e4ddd0'; c.fill();
    rect(c, -39, 4, 64, .9, '#d7d1c6');
    c.restore();
  }
  function drawLandscape() {
    plate.width = canvas.width; plate.height = canvas.height;
    const c = plate.getContext('2d');
    c.setTransform(density, 0, 0, density, 0, 0);
    const horizon = deck - 16;
    // Low sun with horizontal paper knockouts, like a three-ink travel print.
    const sunX = w * .293, sunY = Math.min(h * .32, deck - 187);
    const radius = Math.min(w * .070, h * .102);
    c.save(); c.beginPath(); c.arc(sunX, sunY, radius, 0, tau); c.clip();
    rect(c, sunX - radius, sunY - radius, radius * 2, radius * 2, '#b47469');
    for (let i = 0; i < 9; i++) {
      c.clearRect(sunX - radius, sunY + radius * (.20 + i * .092), 2 * radius, radius * (.011 + i * .004));
    }
    c.restore();
    cloudLine(c, w * .16, sunY + radius * 1.35, Math.min(87, w * .12));
    cloudLine(c, w * .65, sunY + radius * .1, Math.min(115, w * .14));
    // Distant ranges share a horizon but have different silhouettes and inks.
    const ridge = (outline, color) => polygon(c, [
      [0, ground], ...outline.map(([x, y]) => [w * x, horizon - y]), [w, ground]
    ], color);
    ridge([[0, 19], [.06, 24], [.11, 20], [.17, 26], [.22, 32], [.28, 42], [.33, 36], [.39, 37],
      [.46, 54], [.52, 69], [.56, 62], [.60, 67], [.69, 42], [.75, 46], [.84, 24], [.94, 35], [1, 26]], '#d1d8d4');
    polygon(c, [[w * .52, horizon - 69], [w * .58, horizon - 41], [w * .555, horizon - 46],
      [w * .57, horizon - 35], [w * .51, horizon - 55], [w * .49, horizon - 52]], '#bfcdd0');
    ridge([[0, 30], [.07, 23], [.14, 33], [.19, 28], [.25, 41], [.32, 30], [.36, 33], [.44, 22],
      [.52, 25], [.59, 17], [.64, 23], [.69, 17], [.76, 24], [.83, 31], [.89, 26], [.95, 30], [1, 20]], '#e1cfad');
    ridge([[0, 9], [.09, 12], [.17, 6], [.25, 11], [.34, 8], [.42, 13], [.53, 10],
      [.64, 16], [.73, 9], [.86, 13], [.94, 11], [1, 13]], '#c6bcaa');
    // Low service buildings set the scale behind the moving line.
    for (const [x, size] of [[.035, .57], [.55, .42], [.91, .45]]) {
      c.save(); c.translate(w * x, horizon - 6); c.scale(size, size);
      polygon(c, [[0, 0], [0, -13], [8, -13], [8, -16], [34, -16], [43, -9], [75, -9], [75, 0]], '#999e98');
      rect(c, 49, -18, 4, 11, '#a1aaa4');
      for (let j = 0; j < 5; j++) rect(c, 4 + j * 7, -9, 4, 1.5, '#d8d3c4');
      c.restore();
    }
    rect(c, 0, horizon - 2, w, h - horizon + 2, '#e0cfaf');
    const random = randomSource(417);
    for (let j = 0; j < w * .56; j++) {
      const x = random() * w, y = horizon + 1 + random() * (h - horizon);
      rect(c, x, y, 1 + random() ** 3 * 17, .45 + random() * .35, '#c7b99f');
    }
  }

  function size() {
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    // A portrait scene keeps all four stations. Its rocket retains a readable silhouette.
    unit = Math.min(cw / (cw < ch ? 448 : 730), ch / 414);
    w = cw / unit; h = ch / unit; density = unit * dpr;
    deck = h * (cw < ch ? .705 : .742);
    ground = deck + Math.min(67, h * .13);
    texture = paperTexture();
    drawLandscape();
  }
  function drawBelt(phase) {
    const xEnd = w * .80 + 8, beltY = deck + 9;
    const braceTop = beltY + 16, braceBottom = ground - 3;
    const spacing = Math.max(62, xEnd / Math.ceil(xEnd / 94));
    // Foundations and triangulated steel legs support the conveyor and gantry.
    for (let x = 14; x < xEnd; x += spacing) {
      const right = Math.min(x + spacing - 3, xEnd);
      lines(ctx, [[x, braceBottom], [x, braceTop], [right, braceBottom], [right, braceTop]], '#75858a', 2.15);
      lines(ctx, [[x, braceBottom], [right, braceTop]], '#a8b6b6', 1.45);
      rect(ctx, x - 4, braceBottom, 9, 3, '#827c6d');
    }
    rect(ctx, -10, ground + 1, xEnd + 97, 1.1, '#aa9c84');
    rect(ctx, xEnd - 24, braceTop - 2, 88, 5, '#8c999b');
    rect(ctx, xEnd + 28, beltY - 3, 30, ground - beltY + 3, '#b7a98f');
    polygon(ctx, [[xEnd + 60, ground], [xEnd + 78, ground], [xEnd + 63, beltY - 2], [xEnd + 56, beltY - 2]], '#c9b99c');
    // Closed belt: the tread and bottom return travel in opposite directions.
    ctx.beginPath(); ctx.roundRect(-24, beltY - 1, xEnd + 37, 21, 10);
    ctx.fillStyle = '#53636a'; ctx.fill();
    rect(ctx, -4, beltY + 3, xEnd + 6, 12.5, '#9fafb4');
    const tread = phase % 13;
    for (let x = -13 + tread; x < xEnd + 4; x += 13)
      lines(ctx, [[x, beltY + .3], [x + 2, beltY + 2.2]], sand, 1.35);
    for (let x = -tread; x < xEnd + 4; x += 13)
      lines(ctx, [[x, beltY + 17], [x + 2, beltY + 18.5]], mist, 1);
    const count = Math.max(4, Math.ceil((xEnd + 18) / 46));
    for (let i = 0; i <= count; i++) {
      ctx.save(); ctx.translate(-14 + (xEnd + 17) * i / count, beltY + 9.5);
      ctx.rotate(phase / 9.5); ctx.scale(.89, .89); sprite('wheel', 0, 0); ctx.restore();
    }
    rect(ctx, -2, beltY + 4, xEnd, 1, '#68777b');
    sprite('gantry', w * .8, deck + .9);
  }

  function carriageX(t) {
    return w * (.2 + .2 * (ease(ramp(t, .83, 1.85)) + ease(ramp(t, 2.09, 3.12)) + ease(ramp(t, 3.40, 4.55))));
  }
  const stages = [
    { art: 'engine', station: .2, start: .015, land: .68, seam: 0 },
    { art: 'body', station: .4, start: 1.27, land: 1.95, seam: -56 },
    { art: 'nose', station: .6, start: 2.52, land: 3.24, seam: -108 }
  ];
  function drawStages(t, x, lift) {
    for (const stage of stages) {
      if (t < stage.start) continue;
      const p = ramp(t, stage.start, stage.land);
      const age = t - stage.land;
      // Align the incoming part vertically over its station while the base approaches.
      const sx = p < 1 ? w * stage.station : x;
      const settle = age >= 0 && age < .16 ? -Math.sin(Math.PI * age / .16) * (1 - age / .16) * 5 : 0;
      const sy = deck - lift - (1 - p * p) * (deck + stage.seam + 3) + settle;
      sprite(stage.art, sx, sy);
      if (age < 0 || age > .20) continue;
      const f = age / .20;
      for (const side of [-1, 1]) {
        ctx.globalAlpha = 1 - f;
        lines(ctx, [[sx + side * (18 + 7 * f), deck + stage.seam - 1 - f * 4],
          [sx + side * (21 + 10 * f), deck + stage.seam - 2 - f * 6]], '#947b69', 1.1);
      }
      ctx.globalAlpha = 1;
    }
  }
  function exhaust(t, x, lift) {
    const burn = ramp(t, 4.69, 4.97);
    if (!burn) return;
    // Two curving banks of exhaust roll out from under the launch shoe.
    const age = t - 4.69;
    ctx.save();
    for (let i = 0; i < 30; i++) {
      const life = age - (i % 15) * .039;
      if (life <= 0) continue;
      const side = i < 15 ? -1 : 1;
      const drift = life * (37 + (i % 4) * 19);
      const px = x + side * (5 + drift), py = deck + 2 - life * (8 + (i % 3) * 9) + Math.sin(i * 9) * 3;
      const radius = Math.min(26, 2 + life * 18) * (.75 + (i % 4) * .1);
      ctx.globalAlpha = Math.min(1, life * 11) * (1 - .7 * ramp(life, .35, 1.1));
      circle(ctx, px, py, radius, i % 4 ? '#c3c4b9' : '#b0bbba');
      circle(ctx, px - radius * .12, py - radius * .24, radius * .9, i % 3 ? '#e8dfca' : paper);
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, deck - lift - 1);
    ctx.scale(.9 + .13 * Math.sin(t * 59), burn * (1.2 + .16 * Math.sin(t * 47)));
    sprite('plume', 0, 0); ctx.restore();
  }

  function paint(time) {
    // Reduced motion shows the assembly as a sequence of still illustrations.
    const t = reduced.matches ? (time < 1.55 ? .81 : time < 2.95 ? 2.08 : time < 4.40 ? 3.4 : time < 5.85 ? 4.64 : 6) : time;
    const flight = ramp(t, 4.99, 5.96);
    const pan = (h - deck + 186) * ease(ramp(t, 5.23, 5.95));
    const lift = flight * flight * (h + 290);
    const x = carriageX(t);
    ctx.setTransform(density, 0, 0, density, 0, 0);
    rect(ctx, 0, 0, w, h, paper);
    const dusk = ease(ramp(t, 5.16, 5.98));
    if (dusk) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#17282f'); sky.addColorStop(1, '#3c5360');
      ctx.globalAlpha = dusk; rect(ctx, 0, 0, w, h, sky);
      const random = randomSource(241);
      for (let i = 0; i < 77; i++) {
        const sx = random() * w, sy = (random() * h + pan * .08) % h;
        ctx.globalAlpha = dusk * (.15 + random() * .65);
        circle(ctx, sx, sy, .35 + random() * .65, paper);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(0, pan);
    ctx.globalAlpha = 1 - dusk;
    ctx.drawImage(plate, 0, 0, w, h);
    ctx.globalAlpha = 1;
    drawBelt(t * 36 + x - w * .2);
    // The transport cradle stays behind when the rocket clears the pad.
    polygon(ctx, [[x - 28, deck + .5], [x + 28, deck + .5], [x + 25, deck + 6], [x - 25, deck + 6]], '#53636b');
    rect(ctx, x - 22, deck + 1, 44, 1.9, mist);
    for (const offset of [-18, 18]) circle(ctx, x + offset, deck + 6.3, 2.9, ink);
    exhaust(t, x, lift);
    drawStages(t, x, lift);
    ctx.restore();
    if (texture) {
      ctx.globalAlpha = 1 - dusk * .65;
      rect(ctx, 0, 0, w, h, texture);
      ctx.globalAlpha = 1;
    }
  }

  window.launchSequenceDone = new Promise(done => {
    function onResize() { size(); paint(lastTime); }
    function frame(now) {
      if (started === undefined) started = now;
      lastTime = Math.min(duration, now - started) / 1000;
      paint(lastTime);
      if (lastTime < duration / 1000) requestAnimationFrame(frame);
      else {
        window.removeEventListener('resize', onResize);
        plate.width = plate.height = 1;
        done();
      }
    }
    atlas.onload = () => {
      size();
      window.addEventListener('resize', onResize);
      requestAnimationFrame(frame);
    };
    atlas.onerror = () => done();
    atlas.src = '/space/launch-art.svg';
  });
})();
