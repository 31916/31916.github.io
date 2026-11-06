"use strict";

(() => {
  const intro = document.querySelector(".hurricane-intro");
  if (!intro) return;

  const scene = intro.querySelector(".hurricane-scene");
  const stickers = [...scene.querySelectorAll(".storm-sticker")];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tau = 2 * Math.PI;
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const smooth = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const layers = [
    { name: "ink", paint: drawInk, delay: 0, period: 12, release: 0.23, grain: 0.6 },
    { name: "glaze", paint: drawGlaze, delay: 0.16, period: 9, release: 0.17, grain: 0.24 },
    { name: "foam", paint: drawFoam, delay: 0.31, period: 7, release: 0.1, grain: 0.82 },
    { name: "spray", paint: drawSpray, delay: 0.48, period: 5, release: 0.04, grain: 0 },
  ].map((layer, index) => {
    const canvas = scene.querySelector(`[data-wave="${layer.name}"]`);
    return { ...layer, index, canvas, context: canvas.getContext("2d") };
  });
  if (layers.some((layer) => !layer.context)) return;

  // Profiles are [angle, curl, breadth, start, reach]. Each material has its own silhouette.
  const inkArms = [
    [-0.27, 6.08, 0.14, 0.04, 1.02],
    [1.55, 5.68, 0.126, 0.17, 0.97],
    [3.04, 6.18, 0.115, 0.03, 1.15],
    [4.68, 5.73, 0.145, 0.14, 1.09],
  ];
  const glazeArms = [
    [0.35, 6.23, 0.069, 0.08, 1.09],
    [1.57, 6.47, 0.079, 0.06, 0.86],
    [2.63, 5.82, 0.053, 0.17, 1.05],
    [3.93, 6.07, 0.074, 0.09, 1.13],
    [5.16, 6.52, 0.042, 0.21, 1.01],
  ];
  const foamArms = [
    [0.15, 6.09, 0.073, 0.045, 0.73],
    [0.67, 6.38, 0.035, 0.49, 1.11],
    [1.75, 5.94, 0.046, 0.12, 0.87],
    [2.85, 6.23, 0.064, 0.04, 0.92],
    [3.7, 5.68, 0.032, 0.46, 1.13],
    [4.34, 6.17, 0.05, 0.14, 0.92],
    [5.19, 6.5, 0.031, 0.34, 0.81],
  ];

  // Keep the flecks and paper grain stable between frames.
  let seed = 31916;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const flecks = Array.from({ length: 105 }, () => ({
    angle: random() * tau,
    radius: 0.17 + random() * 0.95,
    size: 0.65 + random() ** 2 * 3.2,
    pulse: random() * tau,
  }));
  const texture = makeTexture();
  let width = 0;
  let height = 0;
  let scrollDistance = 1;
  let frameId = null;
  let startedAt = null;
  let cleared = false;

  function makeTexture() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 144;
    const context = tile.getContext("2d");
    if (!context) return null;
    const pixels = context.createImageData(tile.width, tile.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const tone = random() < 0.54 ? 10 : 248;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = tone;
      pixels.data[i + 3] = Math.round(random() ** 2 * 72);
    }
    context.putImageData(pixels, 0, 0);
    return layers[0].context.createPattern(tile, "repeat");
  }

  function ribbon(context, pose, profile, index, roughness) {
    const [offset, curl, breadth, start, end] = profile;
    const flutter = Math.sin(pose.loop * (index % 2 + 1) + offset);
    const extent = end * (0.65 + 0.35 * pose.birth) * (1 - pose.peel * 0.22);
    const twist = curl + flutter * 0.24 + (1 - pose.birth) * 1.8 + pose.peel * 2.4;
    const angle = pose.spin + offset + flutter * 0.1;
    const steps = 68;
    context.beginPath();
    for (const side of [-1, 1]) {
      for (let step = 0; step <= steps; step += 1) {
        const fraction = (side < 0 ? step : steps - step) / steps;
        const along = start + fraction * (extent - start);
        const taper = Math.sin(fraction * Math.PI) ** 0.68;
        const edge = offset + side * 2.1 + pose.loop;
        const ripple = 1 + roughness * (
          Math.cos(along * 27 + edge) + 0.48 * Math.sin(along * 59 + edge)
          + 0.27 * Math.cos(along * 111 + edge)
        );
        const distance = pose.radius * (along + side * taper * ripple * breadth);
        const direction = angle + twist * along ** 0.76 + Math.sin(along * 13 + edge) * roughness * 0.36;
        const x = Math.cos(direction) * distance;
        const y = Math.sin(direction) * distance * 0.74;
        if (side < 0 && step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
  }

  function drawInk(context, pose) {
    const wash = context.createRadialGradient(0, 0, 0, 0, 0, pose.radius * 1.15);
    wash.addColorStop(0, "#397eb7");
    wash.addColorStop(0.42, "#215a92");
    wash.addColorStop(0.78, "#1c4072");
    wash.addColorStop(1, "rgba(9, 26, 54, 0.35)");
    context.fillStyle = wash;
    inkArms.forEach((arm, index) => ribbon(context, pose, arm, index, 0.28));
  }

  function drawGlaze(context, pose) {
    const glaze = context.createLinearGradient(-pose.radius, -pose.radius * 0.5, pose.radius, pose.radius * 0.7);
    glaze.addColorStop(0, "rgba(49, 115, 190, 0.45)");
    glaze.addColorStop(0.38, "rgba(102, 188, 239, 0.86)");
    glaze.addColorStop(0.61, "rgba(172, 225, 251, 0.77)");
    glaze.addColorStop(1, "rgba(80, 152, 223, 0.42)");
    context.fillStyle = glaze;
    glazeArms.forEach((arm, index) => ribbon(context, pose, arm, index, 0.09));
  }

  function drawFoam(context, pose) {
    const foam = context.createRadialGradient(0, 0, 0, 0, 0, pose.radius);
    foam.addColorStop(0, "#f8fdff");
    foam.addColorStop(0.48, "#dcf3ff");
    foam.addColorStop(0.83, "rgba(160, 215, 246, 0.86)");
    foam.addColorStop(1, "rgba(125, 188, 238, 0.5)");
    context.fillStyle = foam;
    foamArms.forEach((arm, index) => ribbon(context, pose, arm, index, 0.39));
  }

  function drawSpray(context, pose) {
    context.fillStyle = "rgba(218, 245, 255, 0.52)";
    context.beginPath();
    for (const fleck of flecks) {
      const along = fleck.radius + Math.sin(pose.loop + fleck.pulse) * 0.045;
      const distance = pose.radius * along;
      const angle = pose.spin + fleck.angle + along * (5.9 + pose.peel * 2.2);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * 0.75;
      const size = fleck.size * (0.72 + 0.28 * Math.cos(pose.loop + fleck.pulse));
      const slant = angle + 0.9;
      context.moveTo(x + Math.cos(slant) * size * 1.55, y + Math.sin(slant) * size * 1.55);
      context.ellipse(x, y, size * 1.55, size * 0.56, slant, 0, tau);
    }
    context.fill();

    context.fillStyle = "rgba(190, 231, 255, 0.62)";
    ribbon(context, pose, [1.62, 5.58, 0.006, 0.34, 0.97], 0, 0.19);
    ribbon(context, pose, [4.85, 6.16, 0.008, 0.49, 1.08], 1, 0.13);
  }

  function drawLayer(layer, seconds, progress) {
    const { context, index } = layer;
    context.clearRect(0, 0, width, height);

    // The timed entrance, repeating swells, and scroll-driven peel are independent.
    const birth = smooth((seconds - layer.delay) / (0.97 + index * 0.09));
    const loop = seconds * tau / layer.period;
    const peel = smooth((progress - layer.release) / (0.95 - layer.release));
    const opacity = birth * (1 - smooth((peel - 0.64) / 0.36));
    if (opacity <= 0) return;

    const radius = Math.hypot(width, height) * (0.75 + Math.sin(loop) * 0.018)
      * (0.43 + birth * 0.57) * (1 - peel * 0.38);
    const spin = -seconds * 0.16 + Math.sin(loop) * 0.1 + (1 - birth) * 1.18 - peel * 2.2;
    context.save();
    context.translate(
      width * (0.52 + Math.sin(loop) * 0.023 + peel * (0.66 + index * 0.07)),
      height * (0.5 + Math.cos(loop) * 0.022 - peel * (0.53 + index * 0.06)),
    );
    context.rotate(-0.23 - peel * (0.26 + index * 0.08));
    context.scale(1 + peel * 0.7, 1 - peel * 0.46);
    context.globalAlpha = opacity;
    layer.paint(context, { radius, spin, loop, birth, peel });
    context.restore();

    if (layer.grain && texture) {
      context.save();
      context.globalCompositeOperation = "source-atop";
      context.globalAlpha = layer.grain;
      context.fillStyle = texture;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }

  function positionStickers(seconds, progress) {
    stickers.forEach((sticker, index) => {
      const birth = smooth((seconds - 0.42 - index * 0.07) / 0.83);
      const peel = smooth((progress - index * 0.018) / 0.8);
      const sway = seconds * (0.75 + index * 0.09) + index * 1.8;
      const x = Math.cos(sway) * 8 + (1 - birth) * (index % 2 ? 45 : -45)
        + peel * width * (index % 2 ? 0.43 : 0.29);
      const y = Math.sin(sway) * 12 + (1 - birth) * 35 - peel * height * (0.33 + index * 0.04);
      const tilt = Math.sin(sway * 0.81) * 6 - peel * (22 + index * 5);
      const scale = (0.59 + birth * 0.41) * (1 - peel * 0.38);
      sticker.style.opacity = birth * (1 - smooth((peel - 0.33) / 0.61));
      sticker.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(calc(var(--tilt) + ${tilt}deg)) scale(${scale})`;
    });
  }

  function requestFrame() {
    if (frameId === null && !document.hidden && !intro.hidden) {
      frameId = window.requestAnimationFrame(render);
    }
  }

  function render(time) {
    frameId = null;
    startedAt ??= time;
    const seconds = (time - startedAt) / 1000;
    const progress = clamp(
      (scene.getBoundingClientRect().top - intro.getBoundingClientRect().top) / scrollDistance,
    );
    scene.style.setProperty("--storm-clear", smooth((progress - 0.76) / 0.20));
    if (progress >= 0.96) {
      if (!cleared) {
        layers.forEach(({ context }) => context.clearRect(0, 0, width, height));
        stickers.forEach((sticker) => { sticker.style.opacity = 0; });
        cleared = true;
      }
      return;
    }
    cleared = false;
    layers.forEach((layer) => drawLayer(layer, seconds, progress));
    positionStickers(seconds, progress);
    requestFrame();
  }

  function resize() {
    if (intro.hidden) return;
    width = scene.clientWidth;
    height = scene.clientHeight;
    scrollDistance = Math.max(1, intro.offsetHeight - height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const { canvas, context } of layers) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
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
