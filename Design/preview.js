"use strict";

(() => {
  const rotor = document.querySelector("#preview .artwork-rotor");
  const [front, back] = rotor.querySelectorAll(".artwork");
  const comparison = back.querySelector("img");
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (!document.hidden && !rotor.contains(document.activeElement)) {
      timer = setTimeout(showOtherArtwork, 3000);
    }
  }

  function showOtherArtwork() {
    const flipped = rotor.classList.toggle("is-flipped");
    front.inert = flipped;
    back.inert = !flipped;
    schedule();
  }

  function start() {
    rotor.addEventListener("focusin", schedule);
    rotor.addEventListener("focusout", () => queueMicrotask(schedule));
    document.addEventListener("visibilitychange", schedule);
    schedule();
  }

  if (comparison.complete && comparison.naturalWidth) start();
  else comparison.addEventListener("load", start, { once: true });
})();
