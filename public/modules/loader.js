// Ustream shared loading component.
//
// One loader for every place content loads: page transitions, catalog
// rows, search, details, "Where to watch", cast, episodes and the
// player. It reuses the startup loader's three pulsing dots
// (#startup-loader) so every loading state looks the same, and it is
// always announced to assistive tech (role="status", aria-live).
//
// Pure string builders + one DOM helper (withLoading), so the HTML can
// be unit-tested in Node without a DOM.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const DEFAULT_SLOW_AFTER_MS = 6000;
export const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Markup for the three-dot loader.
 * size: "sm" (inline, e.g. buttons), "md" (sections), "lg" (pages).
 */
export function loaderHtml({ label = "Loading…", size = "md", inline = false, id = "" } = {}) {
  const cls = ["ul-loader", `ul-loader--${size}`, inline ? "ul-loader--inline" : ""].filter(Boolean).join(" ");
  return `<div class="${cls}"${id ? ` id="${esc(id)}"` : ""} role="status" aria-live="polite" aria-busy="true">`
    + `<span class="ul-loader__dots" aria-hidden="true"><span></span><span></span><span></span></span>`
    + `<span class="ul-loader__label">${esc(label)}</span>`
    + `</div>`;
}

/**
 * Show the shared loader in a live container and update the status text
 * when a request is slow. Return `finish()` and call it in every success,
 * error and stale-request path. A newer loader on the same container
 * supersedes the older one.
 */
export function beginLoading(container, {
  label = "Loading…",
  slowLabel = "Still loading — this is taking longer than usual…",
  size = "md",
  slowAfterMs = DEFAULT_SLOW_AFTER_MS,
} = {}) {
  if (!container) return () => {};
  const token = Symbol("loader");
  container.__ulLoaderToken = token;
  container.setAttribute("aria-busy", "true");
  container.innerHTML = loaderHtml({ label, size });
  const timer = setTimeout(() => {
    if (container.__ulLoaderToken !== token) return;
    const labelEl = container.querySelector(".ul-loader__label");
    if (labelEl) labelEl.textContent = slowLabel;
  }, slowAfterMs);
  return () => {
    clearTimeout(timer);
    if (container.__ulLoaderToken === token) container.removeAttribute("aria-busy");
  };
}

/**
 * Markup for an empty or error state. Shown where the content would be.
 * kind: "empty" | "error" | "info"
 */
export function stateHtml({ kind = "empty", title = "", message = "", actionLabel = "", actionAttr = "data-loader-retry" } = {}) {
  const role = kind === "error" ? ` role="alert"` : ` role="status"`;
  const action = actionLabel
    ? `<button type="button" class="secondary-button ul-state__action" ${actionAttr}>${esc(actionLabel)}</button>`
    : "";
  return `<div class="ul-state ul-state--${esc(kind)}"${role}>`
    + (title ? `<p class="ul-state__title">${esc(title)}</p>` : "")
    + (message ? `<p class="ul-state__message">${esc(message)}</p>` : "")
    + action
    + `</div>`;
}

/** Human-readable reason for a failed request. */
export function describeLoadError(error) {
  if (!error) return "Something went wrong.";
  if (error.name === "AbortError" || error.code === "TIMEOUT") return "The request took too long.";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "You appear to be offline.";
  if (error.status === 429) return "The data provider is busy right now.";
  if (error.status === 404) return "This item could not be found.";
  if (error.status >= 500) return "The data provider is not responding.";
  return "The content could not be loaded.";
}

/**
 * Render a loader into `container`, run `task(signal)`, then let the
 * caller render the result. Handles slow requests (label changes after
 * slowAfterMs), timeouts, failures and retry.
 *
 * Returns the task's result, or undefined on failure / when superseded.
 * A newer withLoading() call on the same container supersedes an older
 * one, so stale responses never overwrite fresh content.
 */
export async function withLoading(container, task, {
  label = "Loading…",
  slowLabel = "Still loading — this is taking longer than usual…",
  size = "md",
  slowAfterMs = DEFAULT_SLOW_AFTER_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  errorTitle = "Couldn't load this",
  retryLabel = "Try again",
  onError = null,
} = {}) {
  if (!container) return undefined;
  const token = Symbol("load");
  container.__ulLoadToken = token;
  container.setAttribute("aria-busy", "true");
  container.innerHTML = loaderHtml({ label, size });

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const slowTimer = setTimeout(() => {
    if (container.__ulLoadToken !== token) return;
    const labelEl = container.querySelector(".ul-loader__label");
    if (labelEl) labelEl.textContent = slowLabel;
  }, slowAfterMs);
  let timedOut = false;
  const timeoutTimer = timeoutMs > 0
    ? setTimeout(() => { timedOut = true; controller?.abort(); }, timeoutMs)
    : null;

  try {
    const result = await task(controller ? controller.signal : undefined);
    if (container.__ulLoadToken !== token) return undefined;
    container.removeAttribute("aria-busy");
    return result;
  } catch (error) {
    if (container.__ulLoadToken !== token) return undefined;
    container.removeAttribute("aria-busy");
    const err = timedOut ? Object.assign(new Error("timeout"), { code: "TIMEOUT" }) : error;
    if (typeof onError === "function") onError(err);
    container.innerHTML = stateHtml({
      kind: "error",
      title: errorTitle,
      message: `${describeLoadError(err)} Check your connection and try again.`,
      actionLabel: retryLabel,
    });
    const retryBtn = container.querySelector("[data-loader-retry]");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        void withLoading(container, task, { label, slowLabel, size, slowAfterMs, timeoutMs, errorTitle, retryLabel, onError })
          .then((value) => { container.dispatchEvent(new CustomEvent("ul-retry-result", { detail: value })); });
      }, { once: true });
    }
    return undefined;
  } finally {
    clearTimeout(slowTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }
}

/**
 * fetch() with a timeout and bounded retries for transient failures
 * (network errors, 429, 5xx). Honours Retry-After (seconds, capped).
 * Never retries 4xx other than 429. Throws an Error carrying `status`.
 */
export async function fetchWithRetry(url, {
  timeoutMs = 8000,
  retries = 2,
  backoffMs = 600,
  signal,
  headers = { Accept: "application/json" },
  fetchImpl = (typeof fetch !== "undefined" ? fetch : null),
} = {}) {
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const onAbort = () => controller?.abort();
    signal?.addEventListener?.("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller?.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, { headers, signal: controller ? controller.signal : undefined });
    } catch (error) {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      if (signal?.aborted) throw error;
      if (attempt >= retries) throw Object.assign(new Error(error?.message || "network error"), { status: 0, cause: error });
      await sleep(backoffMs * 2 ** attempt);
      attempt += 1;
      continue;
    }
    clearTimeout(timer);
    signal?.removeEventListener?.("abort", onAbort);
    if (res.ok) return res;
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= retries) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, response: res });
    }
    const retryAfter = Number(res.headers?.get?.("Retry-After"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : backoffMs * 2 ** attempt;
    await sleep(wait);
    attempt += 1;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
