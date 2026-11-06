"use strict";

(() => {
  const stage = document.querySelector("#preview .artwork-stage");
  const rotor = stage.querySelector(".artwork-rotor");
  const [front, back] = rotor.querySelectorAll(".artwork");
  const comparison = back.querySelector("img");
  const hovering = new Set();
  const pressed = new Set();
  let timer;

  function schedule() {
    clearTimeout(timer);
    const interacting = hovering.size > 0 || pressed.size > 0;
    stage.classList.toggle("is-interacting", interacting);
    if (!interacting && !document.hidden && !rotor.querySelector(":focus-visible") &&
        comparison.complete && comparison.naturalWidth) {
      timer = setTimeout(showOtherArtwork, 3000);
    }
  }

  function showOtherArtwork() {
    const flipped = rotor.classList.toggle("is-flipped");
    front.inert = flipped;
    back.inert = !flipped;
    schedule();
  }

  stage.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    hovering.add(event.pointerId);
    schedule();
  });
  stage.addEventListener("pointerleave", (event) => {
    if (hovering.delete(event.pointerId)) schedule();
  });
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    pressed.add(event.pointerId);
    schedule();
  });

  function releasePointer(event) {
    if (pressed.delete(event.pointerId)) schedule();
  }

  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  rotor.addEventListener("focusin", schedule);
  rotor.addEventListener("focusout", () => queueMicrotask(schedule));
  document.addEventListener("visibilitychange", schedule);
  comparison.addEventListener("load", schedule, { once: true });
  schedule();
})();
