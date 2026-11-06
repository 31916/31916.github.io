"use strict";

const hobbyLoader = document.querySelector(".hobby-loader");
if (hobbyLoader) {
  const status = hobbyLoader.querySelector(".hobby-loader-status");
  const phases = ["Warming up", "Finding rhythm", "Let’s play"];
  let phase = 0;
  const phaseTimer = window.setInterval(() => {
    phase = (phase + 1) % phases.length;
    status.innerHTML = `${phases[phase]}<span>...</span>`;
  }, 550);

  window.setTimeout(() => {
    window.clearInterval(phaseTimer);
    document.body.classList.remove("hobbies-pending");
    document.body.classList.add("hobbies-ready");
  }, 2300);
}
