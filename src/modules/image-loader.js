/**
 * High-performance image lazy loading, error fallback, and accessibility helpers.
 */

let observer = null;
let errorListenerBound = false;

export function initImageLazyLoading() {
  if (typeof window === "undefined") {
    return;
  }

  if (!errorListenerBound) {
    errorListenerBound = true;
    window.addEventListener(
      "error",
      (event) => {
        if (event.target && event.target.tagName === "IMG") {
          handleImageError(event.target);
        }
      },
      true
    );
  }

  if (!("IntersectionObserver" in window)) {
    return;
  }

  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
          }
          img.classList.add("img-visible");
          obs.unobserve(img);
        }
      });
    },
    { rootMargin: "250px 0px", threshold: 0.01 }
  );

  observeLazyImages(document);
}

export function observeLazyImages(container = document) {
  if (!observer) return;
  const lazyImages = container.querySelectorAll("img[data-src], img[loading='lazy']:not(.observed)");
  lazyImages.forEach((img) => {
    img.classList.add("observed");
    observer.observe(img);
  });
}

/**
 * Ensures descriptive accessible alt text or empty alt="" for decorative images
 */
export function getDescriptiveAlt({ title, subtitle, context = "poster", isDecorative = false }) {
  if (isDecorative) return "";
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) return "Media preview";

  switch (context) {
    case "poster":
      return `${cleanTitle} official poster`;
    case "episode":
      return `${cleanTitle}${subtitle ? ` - ${subtitle}` : ""} preview`;
    case "actor":
      return `${cleanTitle}`;
    case "sports":
      return `${cleanTitle} sports broadcast poster`;
    case "channel":
    case "provider":
      return `${cleanTitle} logo`;
    case "upload":
      return `${cleanTitle} video thumbnail`;
    default:
      return `${cleanTitle} preview`;
  }
}

/**
 * Global fallback for broken image URLs to prevent broken image icons
 */
export function handleImageError(img, fallbackSrc = "./assets/logo-mark.png") {
  if (!img || img.dataset.hasFailed) return;
  img.dataset.hasFailed = "true";

  const sportsCard = img.closest(".sports-match-card");
  if (sportsCard) {
    sportsCard.classList.remove("has-poster");
    img.style.display = "none";
    return;
  }

  if (img.classList.contains("poster-image")) {
    img.style.display = "none";
    return;
  }

  img.src = fallbackSrc;
  img.classList.add("image-fallback");
}
