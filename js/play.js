"use strict";

(() => {
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
  const section = document.getElementById("serve-scroll");
  const sticky = section.querySelector(".serve-sticky");
  const slider = document.getElementById("serve-progress");
  const toggle = document.getElementById("motion-toggle");
  const hint = document.getElementById("scroll-hint");
  const planet = document.querySelector(".planet-art");
  const orbit = document.getElementById("orbit");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const shortViewport = window.matchMedia("(max-height: 580px)");
  const isManualMode = () => reducedMotion.matches || shortViewport.matches;
  const parts = Object.fromEntries(
    [
      "leg-back",
      "leg-front",
      "shoe-back",
      "shoe-front",
      "torso",
      "shorts",
      "neck",
      "head-group",
      "arm-toss",
      "arm-racket",
      "racket",
      "tennis-ball",
      "ball-trail",
      "impact-mark",
      "player-shadow",
    ].map((id) => [id, document.getElementById(id)]),
  );
  const phases = [
    { name: "トス", caption: "ボールを、空へ。" },
    { name: "構え", caption: "少し沈んで、力をためる。" },
    { name: "インパクト", caption: "いちばん高いところで。" },
    { name: "振り抜き", caption: "振り抜いて、次の一球。" },
  ];
  // Original joint-based right-handed serve from this site's earlier design.
  // Pose interpolation remains reversible, with no autoplay or scroll hijacking.
  const poses = [
    {
      t: 0,
      head: [388, 251, -5],
      shoulder: [390, 287],
      hip: [387, 374],
      left: [436, 310, 460, 306],
      right: [413, 334, 450, 330],
      back: [356, 414, 344, 452],
      front: [414, 416, 432, 452],
      racket: 155,
      ball: [460, 306, 1],
    },
    {
      t: 0.24,
      head: [382, 235, -12],
      shoulder: [386, 273],
      hip: [387, 369],
      left: [421, 224, 454, 173],
      right: [348, 310, 368, 339],
      back: [349, 414, 344, 452],
      front: [417, 411, 432, 452],
      racket: 190,
      ball: [467, 139, 1],
    },
    {
      t: 0.45,
      head: [376, 234, -18],
      shoulder: [379, 272],
      hip: [386, 368],
      left: [427, 214, 456, 155],
      right: [333, 234, 356, 222],
      back: [347, 409, 344, 452],
      front: [431, 404, 439, 450],
      racket: 170,
      ball: [490, 75, 1],
    },
    {
      t: 0.57,
      head: [384, 214, -10],
      shoulder: [390, 249],
      hip: [398, 333],
      left: [429, 262, 411, 299],
      right: [397, 205, 423, 168],
      back: [365, 380, 353, 425],
      front: [434, 381, 443, 428],
      racket: 85,
      ball: [490, 81, 1],
    },
    {
      t: 0.65,
      head: [401, 211, 8],
      shoulder: [403, 247],
      hip: [408, 325],
      left: [435, 282, 420, 314],
      right: [435, 202, 466, 153],
      back: [375, 378, 362, 423],
      front: [434, 379, 440, 432],
      racket: 20,
      ball: [489, 94, 1],
    },
    {
      t: 0.81,
      head: [434, 266, 25],
      shoulder: [430, 301],
      hip: [412, 359],
      left: [437, 347, 464, 365],
      right: [474, 324, 424, 354],
      back: [377, 394, 360, 434],
      front: [451, 409, 465, 452],
      racket: -78,
      ball: [692, 231, 0.8],
    },
    {
      t: 1,
      head: [452, 281, 22],
      shoulder: [445, 317],
      hip: [430, 377],
      left: [452, 352, 482, 364],
      right: [478, 354, 453, 386],
      back: [400, 410, 375, 433],
      front: [468, 419, 497, 452],
      racket: -45,
      ball: [842, 412, 0.6],
    },
  ];
  let paused = false;
  let pendingFrame = 0;
  let lastProgress = -1;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const set = (id, name, value) => parts[id].setAttribute(name, value);
  const limb = (start, joints) =>
    `M${start[0]} ${start[1]} L${joints[0]} ${joints[1]} L${joints[2]} ${joints[3]}`;

  function render(progress) {
    const p = clamp(progress);
    if (Math.abs(p - lastProgress) < 0.0001) return;
    lastProgress = p;
    let end = poses.findIndex((pose) => pose.t >= p);
    if (end < 1) end = 1;
    const a = poses[end - 1];
    const b = poses[end];
    const amount = clamp((p - a.t) / (b.t - a.t));
    const blend = amount * amount * (3 - 2 * amount);
    const mix = (x, y) => x + (y - x) * blend;
    const pose = {};
    Object.keys(a).forEach((key) => {
      pose[key] = Array.isArray(a[key])
        ? a[key].map((v, i) => mix(v, b[key][i]))
        : mix(a[key], b[key]);
    });
    const [sx, sy] = pose.shoulder;
    const [hx, hy] = pose.hip;
    const [headX, headY, headAngle] = pose.head;
    set(
      "torso",
      "d",
      `M${sx - 13} ${sy - 4} Q${sx - 28} ${sy + 14} ${hx - 17} ${hy - 27} L${hx - 17} ${hy + 3} Q${hx} ${hy + 15} ${hx + 20} ${hy + 1} L${hx + 17} ${hy - 26} Q${sx + 29} ${sy + 12} ${sx + 11} ${sy - 3}Z`,
    );
    set(
      "shorts",
      "d",
      `M${hx - 18} ${hy - 12} L${hx + 18} ${hy - 13} ${hx + 26} ${hy + 14} ${hx + 4} ${hy + 22} ${hx - 3} ${hy + 13} ${hx - 21} ${hy + 15}Z`,
    );
    set("neck", "d", `M${headX} ${headY + 15} L${sx} ${sy + 3}`);
    set(
      "head-group",
      "transform",
      `translate(${headX} ${headY}) rotate(${headAngle})`,
    );
    set("leg-back", "d", limb([hx - 9, hy + 7], pose.back));
    set("leg-front", "d", limb([hx + 10, hy + 9], pose.front));
    set("shoe-back", "d", `M${pose.back[2] + 2} ${pose.back[3]} l-21 4`);
    set("shoe-front", "d", `M${pose.front[2] - 2} ${pose.front[3]} l23 4`);
    set("arm-toss", "d", limb([sx + 10, sy + 3], pose.left));
    set("arm-racket", "d", limb([sx - 10, sy + 3], pose.right));
    set(
      "racket",
      "transform",
      `translate(${pose.right[2]} ${pose.right[3]}) rotate(${pose.racket})`,
    );
    set(
      "tennis-ball",
      "transform",
      `translate(${pose.ball[0]} ${pose.ball[1]}) scale(${pose.ball[2]})`,
    );
    set(
      "player-shadow",
      "rx",
      85 - 22 * Math.max(0, 1 - Math.abs(p - 0.62) / 0.18),
    );
    set("ball-trail", "opacity", p > 0.65 ? 0.7 : 0);
    set(
      "ball-trail",
      "d",
      `M489 94 Q${(489 + pose.ball[0]) / 2} ${pose.ball[1] * 0.45} ${pose.ball[0]} ${pose.ball[1]}`,
    );
    set("impact-mark", "opacity", Math.max(0, 1 - Math.abs(p - 0.65) / 0.045));
    const phase = p < 0.3 ? 0 : p < 0.59 ? 1 : p < 0.72 ? 2 : 3;
    document.querySelectorAll("[data-phase]").forEach((node) => {
      const active = Number(node.dataset.phase) === phase;
      node.classList.toggle("active", active);
      if (active) node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    });
    document.getElementById("phase-counter").textContent = `0${phase + 1} / 04`;
    document.getElementById("phase-caption").textContent =
      phases[phase].caption;
    slider.value = String(Math.round(p * 100));
    slider.setAttribute(
      "aria-valuetext",
      `${phases[phase].name}、${Math.round(p * 100)}%`,
    );
    document.getElementById("tennis-scene").dataset.progress = p.toFixed(3);
  }

  function updateFromScroll() {
    pendingFrame = 0;
    if (paused || isManualMode()) return;
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight && rect.bottom >= 0) {
      const distance = section.offsetHeight - sticky.offsetHeight;
      render(distance > 0 ? -rect.top / distance : 0.65);
    }
    const orbitRect = orbit.getBoundingClientRect();
    if (orbitRect.top < window.innerHeight && orbitRect.bottom > 0) {
      const progress = clamp(
        (window.innerHeight - orbitRect.top) /
          (window.innerHeight + orbitRect.height),
      );
      planet.style.transform = `translateY(${(progress - 0.5) * -35}px) rotate(${(progress - 0.5) * 7}deg)`;
    }
  }
  function schedule() {
    if (!pendingFrame)
      pendingFrame = window.requestAnimationFrame(updateFromScroll);
  }
  function updateButton() {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.innerHTML = paused
      ? 'スクロール連動を再開 <span aria-hidden="true">▶</span>'
      : '動きを止める <span aria-hidden="true">Ⅱ</span>';
    hint.textContent = isManualMode()
      ? "スライダーでサーブを操作"
      : paused
        ? "PAUSED / 手動で操作できます"
        : "SCROLL TO SERVE ↓";
  }
  function applyMotionPreference() {
    const manual = isManualMode();
    // The stylesheet supplies a non-sticky, shorter scene below 580px.
    // Keep its layout class while disabling every scroll-linked effect here.
    document.body.classList.toggle("motion-enabled", !reducedMotion.matches);
    toggle.hidden = manual;
    if (manual) planet.style.transform = "";
    document.getElementById("tennis-description").textContent =
      reducedMotion.matches
        ? "右利きの人物のサーブのシルエット。動きを減らす設定に合わせてスクロール連動は停止しています。スライダーで各場面を選べます。"
        : shortViewport.matches
          ? "右利きの人物のサーブのシルエット。画面の高さに合わせて手動操作に切り替えています。スライダーで各場面を選べます。"
          : "濃紺の人物シルエットが、スクロールに合わせてトス、構え、インパクト、振り抜きの順に動きます。スライダーでの操作や、動きの停止もできます。";
    // Resizing must not reset a pose selected with the slider.
    if (lastProgress < 0) render(manual ? 0.65 : 0);
    updateButton();
    schedule();
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    updateButton();
    if (!paused) schedule();
  });
  slider.addEventListener("input", () => {
    paused = true;
    updateButton();
    render(Number(slider.value) / 100);
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", applyMotionPreference, { passive: true });
  window.addEventListener("pageshow", schedule);
  reducedMotion.addEventListener("change", applyMotionPreference);
  shortViewport.addEventListener("change", applyMotionPreference);
  document.querySelector(".serve-controls").hidden = false;
  applyMotionPreference();
})();
