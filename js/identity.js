// A single public configuration controls the optional logo and home illustration.
// Empty or unavailable images leave the text identity and photo-free layout intact.
async function applyIdentity() {
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

    if (localImage(identity.logo)) {
      document.querySelectorAll("[data-site-logo]").forEach((link) => {
        const image = new Image();
        image.alt = identity.logo.alt || "31916";
        image.decoding = "async";
        image.addEventListener("load", () => link.replaceChildren(image), {
          once: true,
        });
        image.src = identity.logo.src;
      });
    }

    const artwork = document.querySelector("[data-site-hero]");
    if (artwork && localImage(identity.hero)) {
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
    // Branding is progressive enhancement; navigation never depends on it.
  }
}

applyIdentity();
