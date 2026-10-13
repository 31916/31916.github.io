// The build renders the configured logo into HTML before the page is served.
// Only the optional home illustration needs progressive enhancement at runtime.
async function applyIdentity() {
  const artwork = document.querySelector("[data-site-hero]");
  if (!artwork) return;
  try {
    const response = await fetch("/assets/identity.json", {
      cache: "no-cache",
    });
    if (!response.ok) return;
    const identity = await response.json();
    const localImage = (entry) =>
      typeof entry?.src === "string" &&
      /^\/assets\/identity\/[^?#\\%]+\.(svg|png|jpe?g|webp|gif|avif)$/i.test(
        entry.src,
      ) &&
      !entry.src.split("/").includes("..");

    if (localImage(identity.hero)) {
      const image = artwork.querySelector("img");
      image.alt =
        typeof identity.hero.alt === "string" ? identity.hero.alt : "";
      image.addEventListener(
        "load",
        () => {
          artwork.hidden = false;
          artwork.closest(".intro").classList.add("has-hero-art");
        },
        { once: true },
      );
      image.src = identity.hero.src;
    }
  } catch {
    // The optional illustration must not affect navigation or the header logo.
  }
}

applyIdentity();
