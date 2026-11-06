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
    if (!interacting && !document.hidden && comparison.complete && comparison.naturalWidth) {
      timer = setTimeout(showOtherArtwork, 6000);
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
  document.addEventListener("visibilitychange", schedule);
  comparison.addEventListener("load", schedule, { once: true });
  schedule();
})();

const copyWindowsCommand = document.querySelector("#copy-windows-command");
if (copyWindowsCommand && navigator.clipboard?.writeText) {
  const command = document.querySelector("#windows-command");
  const status = document.querySelector("#copy-windows-status");
  copyWindowsCommand.hidden = false;
  copyWindowsCommand.addEventListener("click", async () => {
    status.textContent = "";
    try {
      await navigator.clipboard.writeText(command.textContent);
      status.textContent = "Copied.";
    } catch {
      status.textContent = "Select the command to copy it manually.";
    }
  });
}

const canonical = document.querySelector('link[rel="canonical"]').href;
for (const button of document.querySelectorAll(".release-share")) {
  const release = button.closest(".release");
  const title = release.querySelector("h2").textContent.trim();
  const status = release.querySelector(".share-status");
  const url = new URL(canonical);
  url.hash = release.id;

  button.setAttribute("aria-label", `Share ${title}`);
  button.hidden = false;
  button.addEventListener("click", async () => {
    status.textContent = "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url: url.href });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = "Link copied.";
    } catch {
      status.textContent = url.href;
    }
  });
}
