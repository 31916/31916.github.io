"use strict";

const hurricaneCanvas = document.querySelector("[data-hurricane-canvas]");

if (hurricaneCanvas) {
  const context = hurricaneCanvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let pixelRatio = 1;

  const resize = () => {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    hurricaneCanvas.width = Math.round(width * pixelRatio);
    hurricaneCanvas.height = Math.round(height * pixelRatio);
    hurricaneCanvas.style.width = `${width}px`;
    hurricaneCanvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const traceWind = (time, arm, layer, color, opacity, lineWidth) => {
    const centerX = width * 0.62;
    const centerY = height * 0.52;
    const maximumRadius = Math.hypot(width, height) * (0.62 + layer * 0.07);
    const verticalScale = 0.72;
    const turns = 2.5 + layer * 0.18;
    const phase = time * (0.000055 + layer * 0.000006) + arm * ((Math.PI * 2) / 9);

    context.beginPath();
    for (let index = 0; index <= 180; index += 1) {
      const progress = index / 180;
      const radius = maximumRadius * (1 - progress) ** 1.05 + 18;
      const angle = phase + progress * Math.PI * 2 * turns + Math.sin(progress * 9 + arm) * 0.1;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * verticalScale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.globalAlpha = opacity;
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
  };

  const draw = (time) => {
    context.clearRect(0, 0, width, height);
    const centerX = width * 0.62;
    const centerY = height * 0.52;
    const radius = Math.hypot(width, height) * 0.34;

    const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    halo.addColorStop(0, "rgba(244, 253, 255, 0.36)");
    halo.addColorStop(0.18, "rgba(119, 225, 255, 0.2)");
    halo.addColorStop(0.65, "rgba(39, 119, 255, 0.08)");
    halo.addColorStop(1, "rgba(8, 29, 79, 0)");
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);

    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = "screen";
    context.filter = "blur(13px)";
    for (let layer = 0; layer < 4; layer += 1) {
      for (let arm = 0; arm < 9; arm += 1) {
        traceWind(time, arm, layer, layer % 2 ? "#1d6fd4" : "#76dfff", 0.08, 18 + layer * 7);
      }
    }

    context.filter = "none";
    for (let layer = 0; layer < 3; layer += 1) {
      for (let arm = 0; arm < 9; arm += 1) {
        traceWind(time, arm, layer, layer === 1 ? "#e7fbff" : "#6edcff", 0.24, 1.5 + layer * 1.4);
      }
    }

    const eye = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 110);
    eye.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    eye.addColorStop(0.18, "rgba(203, 248, 255, 0.9)");
    eye.addColorStop(0.52, "rgba(45, 140, 240, 0.76)");
    eye.addColorStop(1, "rgba(6, 21, 47, 0)");
    context.globalAlpha = 0.88;
    context.fillStyle = eye;
    context.beginPath();
    context.arc(centerX, centerY, 110, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  };

  const frame = (time) => {
    draw(time);
    if (!reducedMotion.matches && !document.hidden) window.requestAnimationFrame(frame);
  };

  resize();
  draw(0);
  if (!reducedMotion.matches) window.requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
  reducedMotion.addEventListener("change", () => {
    draw(0);
    if (!reducedMotion.matches) window.requestAnimationFrame(frame);
  });
}
