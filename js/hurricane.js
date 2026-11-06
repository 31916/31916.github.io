"use strict";

(() => {
  const intro = document.querySelector(".hurricane-intro");
  if (!intro) return;

  const scene = intro.querySelector(".hurricane-scene");
  const canvas = scene.querySelector("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const startTime = performance.now();
  const arms = [
    { angle: 0, reach: 0.97, width: 0.089, curl: 6.25, foam: 0.43 },
    { angle: 0.92, reach: 0.73, width: 0.049, curl: 6.67, foam: 0.29 },
    { angle: 2.26, reach: 0.99, width: 0.079, curl: 6.52, foam: 0.63 },
    { angle: 3.79, reach: 0.89, width: 0.067, curl: 5.99, foam: 0.37 },
    { angle: 5.15, reach: 0.81, width: 0.046, curl: 6.84, foam: 0.51 },
  ];
  // A stable seed keeps the pigment from flickering on each redraw.
  let seed = 31916;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const spray = Array.from({ length: 82 }, () => ({
    arm: Math.floor(random() * arms.length),
    radius: 0.14 + random() * 0.88,
    offset: (random() - 0.5) * 0.56,
    size: 0.7 + random() ** 2 * 3.8,
    speed: 0.25 + random() * 0.8,
  }));
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

  function makeGrain() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 128;
    const pigment = tile.getContext("2d");
    if (!pigment) return null;
    const image = pigment.createImageData(tile.width, tile.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const tone = random() < 0.51 ? 8 : 239;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = tone;
      image.data[i + 3] = Math.round(random() ** 2 * 56);
    }
    pigment.putImageData(image, 0, 0);
    return context.createPattern(tile, "repeat");
  }
  const grain = makeGrain();

  function drawRibbon(radius, angle, curl, breadth, start, end, variation) {
    const steps = 88;
    context.beginPath();
    for (const side of [-1, 1]) {
      for (let step = 0; step <= steps; step += 1) {
        const fraction = (side < 0 ? step : steps - step) / steps;
        const along = start + fraction * (end - start);
        const taper = Math.sin(fraction * Math.PI) ** 0.72;
        const edge = variation + side * 1.9;
        const ripple = 0.83 + 0.23 * Math.cos(along * 24 + edge)
          + 0.15 * Math.sin(along * 61 + edge) + 0.07 * Math.cos(along * 103 + edge);
        const distance = radius * (along + side * taper * ripple * breadth);
        const direction = angle + curl * along ** 0.76 + Math.sin(along * 13 + variation) * 0.12;
        const x = Math.cos(direction) * distance;
        const y = Math.sin(direction) * distance * 0.71;
        if (side < 0 && step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
  }

  function draw(time, progress) {
    const seconds = (time - startTime) / 1000;
    const drift = smooth((progress - 0.08) / 0.82);
    const size = Math.hypot(width, height) * (0.75 - drift * 0.43);
    const phase = -seconds * 0.13 - Math.sin(seconds * 0.64) * 0.17 - progress * 2.6;
    const opacity = 1 - smooth((progress - 0.65) / 0.24);
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(
      width * (0.55 + drift * 0.76 + Math.sin(seconds * 0.51) * 0.023),
      height * (0.51 - drift * 0.7 + Math.cos(seconds * 0.62) * 0.019),
    );
    context.rotate(-0.2 + Math.sin(seconds * 0.52) * 0.08);
    context.globalAlpha = opacity;

    const haze = context.createRadialGradient(0, 0, 0, 0, 0, size * 0.77);
    haze.addColorStop(0, "rgba(228, 250, 255, 0.45)");
    haze.addColorStop(0.1, "rgba(130, 218, 255, 0.34)");
    haze.addColorStop(0.4, "rgba(65, 153, 242, 0.19)");
    haze.addColorStop(1, "rgba(16, 46, 97, 0)");
    context.fillStyle = haze;
    context.fillRect(-size, -size, size * 2, size * 2);

    const cloud = context.createRadialGradient(0, 0, 0, 0, 0, size * 1.1);
    cloud.addColorStop(0, "rgba(228, 248, 255, 0.88)");
    cloud.addColorStop(0.22, "rgba(156, 217, 249, 0.89)");
    cloud.addColorStop(0.55, "rgba(71, 158, 218, 0.74)");
    cloud.addColorStop(1, "rgba(61, 133, 205, 0.33)");
    const foam = context.createRadialGradient(0, 0, 0, 0, 0, size);
    foam.addColorStop(0, "rgba(246, 253, 255, 0.97)");
    foam.addColorStop(0.4, "rgba(216, 242, 255, 0.92)");
    foam.addColorStop(1, "rgba(145, 210, 244, 0.42)");
    arms.forEach((arm, index) => {
      const sway = Math.sin(seconds * (0.45 + index * 0.17) + arm.angle);
      const angle = phase + arm.angle + sway * 0.17;
      const curl = arm.curl + sway * 0.2;
      const variation = arm.angle + seconds * (0.23 + index * 0.05);
      context.fillStyle = cloud;
      drawRibbon(size, angle, curl, arm.width * (1 + sway * 0.16), 0.045, arm.reach, variation);
      drawRibbon(size, angle - 0.18, curl, arm.width * 0.25, 0.22, arm.reach * 0.93, variation + 4);
      context.fillStyle = foam;
      drawRibbon(size, angle + 0.14, curl, arm.width * 0.51, 0.075, arm.reach * 0.82, variation + 2);
      drawRibbon(size, angle + 0.24, curl, arm.width * 0.23, arm.foam, arm.reach * 0.98, variation + 9);
    });

    for (const fleck of spray) {
      const arm = arms[fleck.arm];
      const along = fleck.radius + Math.sin(seconds * fleck.speed + fleck.radius * 21) * 0.026;
      const radius = size * along;
      const angle = phase + arm.angle + arm.curl * along ** 0.76 + fleck.offset;
      context.globalAlpha = opacity * (0.36 + Math.sin(fleck.radius * 56 + seconds * fleck.speed) * 0.23);
      context.fillStyle = "#e7f9ff";
      context.beginPath();
      context.ellipse(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.71,
        fleck.size * 1.6, fleck.size * 0.58, angle - 0.68, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    if (grain) {
      context.save();
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = grain;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
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
