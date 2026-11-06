"use strict";

(() => {
  const intro = document.querySelector(".hurricane-intro");
  if (!intro) return;

  const scene = intro.querySelector(".hurricane-scene");
  const canvas = scene.querySelector("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tau = Math.PI * 2;
  const arms = [0, 1.02, 2.35, 3.83, 5.12];
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const smooth = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  let width = 0;
  let height = 0;
  let scrollDistance = 1;
  let frameId = null;
  let previousProgress = -1;

  function drawRibbon(radius, phase, breadth, offset, end) {
    const steps = 88;
    context.beginPath();
    for (const side of [-1, 1]) {
      for (let step = 0; step <= steps; step += 1) {
        const fraction = (side < 0 ? step : steps - step) / steps;
        const along = 0.045 + fraction * end;
        const taper = Math.sin(fraction * Math.PI) ** 0.72;
        const ripple = 0.78 + 0.22 * Math.cos(along * 29 + offset);
        const distance = radius * (along + side * taper * ripple * breadth);
        const angle = phase + 6.5 * along ** 0.76 + Math.sin(along * 12 + offset) * 0.12;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance * 0.71;
        if (side < 0 && step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
  }

  function draw(time, progress) {
    const drift = smooth((progress - 0.08) / 0.82);
    const size = Math.hypot(width, height) * (0.75 - drift * 0.43);
    const phase = -time * 0.00015 - progress * 2.6;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width * (0.55 + drift * 0.76), height * (0.51 - drift * 0.7));
    context.rotate(-0.2);
    context.globalAlpha = 1 - smooth((progress - 0.65) / 0.24);
    context.globalCompositeOperation = "screen";

    const haze = context.createRadialGradient(0, 0, 0, 0, 0, size * 0.77);
    haze.addColorStop(0, "rgba(228, 250, 255, 0.78)");
    haze.addColorStop(0.1, "rgba(130, 218, 255, 0.45)");
    haze.addColorStop(0.4, "rgba(65, 153, 242, 0.19)");
    haze.addColorStop(1, "rgba(16, 46, 97, 0)");
    context.fillStyle = haze;
    context.fillRect(-size, -size, size * 2, size * 2);

    const cloud = context.createRadialGradient(0, 0, 0, 0, 0, size);
    cloud.addColorStop(0, "rgba(249, 254, 255, 0.82)");
    cloud.addColorStop(0.2, "rgba(188, 234, 255, 0.56)");
    cloud.addColorStop(0.55, "rgba(96, 183, 255, 0.27)");
    cloud.addColorStop(1, "rgba(67, 140, 235, 0)");
    arms.forEach((arm, index) => {
      const angle = phase + arm;
      const end = 0.81 + (index % 3) * 0.07;
      context.fillStyle = cloud;
      drawRibbon(size, angle, 0.072, arm, end);
      drawRibbon(size, angle + 0.12, 0.032, arm + 3, end);
      drawRibbon(size, angle - 0.16, 0.014, arm + 8, end * 0.92);
    });

    context.strokeStyle = "rgba(206, 245, 255, 0.62)";
    context.lineWidth = 1.25;
    context.beginPath();
    for (let index = 0; index < 60; index += 1) {
      const along = 0.08 + ((index * 23) % 59) / 65;
      const radius = size * along;
      const angle = phase * 1.55 + index * 2.39996 + along * 6.5;
      context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.71);
      context.lineTo(Math.cos(angle - 0.017) * radius, Math.sin(angle - 0.017) * radius * 0.71);
    }
    context.stroke();
    context.restore();
  }

  function requestFrame() {
    if (frameId === null && !document.hidden && !intro.hidden) {
      frameId = window.requestAnimationFrame(render);
    }
  }

  function render(time) {
    frameId = null;
    const progress = clamp(
      (scene.getBoundingClientRect().top - intro.getBoundingClientRect().top) / scrollDistance,
    );
    if (progress !== previousProgress) {
      scene.style.setProperty("--storm-clear", smooth((progress - 0.6) / 0.31));
      previousProgress = progress;
    }
    if (progress < 0.91) {
      draw(time, progress);
      requestFrame();
    } else {
      context.clearRect(0, 0, width, height);
    }
  }

  function resize() {
    if (intro.hidden) return;
    width = scene.clientWidth;
    height = scene.clientHeight;
    scrollDistance = Math.max(1, intro.offsetHeight - height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    requestFrame();
  }

  function syncMotion() {
    intro.hidden = motion.matches;
    if (intro.hidden && frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    resize();
  }

  syncMotion();
  new ResizeObserver(resize).observe(scene);
  window.addEventListener("scroll", requestFrame, { passive: true });
  document.addEventListener("visibilitychange", requestFrame);
  motion.addEventListener("change", syncMotion);
})();
