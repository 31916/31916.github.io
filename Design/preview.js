"use strict";

(() => {
  const preview = document.getElementById("preview");
  const rotor = preview.querySelector(".artwork-rotor");
  const [front, back] = rotor.querySelectorAll(".artwork");
  const comparison = back.querySelector("img");
  const controls = preview.querySelector(".preview-controls");
  const flip = controls.querySelector("[data-preview-flip]");
  const pause = controls.querySelector("[data-preview-pause]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let flipped = false;
  let paused = reducedMotion.matches;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (!paused && !document.hidden && !rotor.contains(document.activeElement)) {
      timer = setTimeout(showOtherArtwork, 8000);
    }
  }

  function showOtherArtwork() {
    flipped = !flipped;
    rotor.classList.toggle("is-flipped", flipped);
    front.inert = flipped;
    back.inert = !flipped;
    flip.title = flipped ? "Show numeral 4 artwork" : "Show cursor comparison";
    flip.setAttribute("aria-label", flip.title);
    schedule();
  }

  function updatePause() {
    pause.dataset.paused = String(paused);
    pause.title = paused ? "Resume automatic previews" : "Pause automatic previews";
    pause.setAttribute("aria-label", pause.title);
    schedule();
  }

  function start() {
    controls.hidden = false;
    flip.addEventListener("click", showOtherArtwork);
    pause.addEventListener("click", () => {
      paused = !paused;
      updatePause();
    });
    rotor.addEventListener("focusin", schedule);
    rotor.addEventListener("focusout", () => queueMicrotask(schedule));
    document.addEventListener("visibilitychange", schedule);
    reducedMotion.addEventListener("change", (event) => {
      if (event.matches) {
        paused = true;
        updatePause();
      }
    });
    updatePause();
  }

  if (comparison.complete && comparison.naturalWidth) start();
  else comparison.addEventListener("load", start, { once: true });
})();
