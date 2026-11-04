/**
 * Event delegation, throttling, and listener management utilities.
 * Eliminates listener duplication and memory leaks across dynamic lists and modals.
 */

/**
 * Attaches a single delegated event listener on a container
 */
export function delegate(container, eventType, selector, handler) {
  if (!container) return () => {};

  const listener = (event) => {
    const targetElement = event.target.closest(selector);
    if (targetElement && container.contains(targetElement)) {
      handler.call(targetElement, event, targetElement);
    }
  };

  container.addEventListener(eventType, listener);
  return () => container.removeEventListener(eventType, listener);
}

/**
 * Registers an event listener with passive: true where supported
 */
export function addPassiveListener(target, eventType, handler) {
  if (!target) return () => {};
  target.addEventListener(eventType, handler, { passive: true });
  return () => target.removeEventListener(eventType, handler);
}

/**
 * RequestAnimationFrame throttler for scroll, resize, or pointer tracking
 */
export function rafThrottle(fn) {
  let ticking = false;
  return function throttled(...args) {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
    }
  };
}

/**
 * Creates a manageable listener pool for safe component unmounting
 */
export function createListenerPool() {
  const listeners = [];

  return {
    add(target, type, handler, options) {
      if (!target) return;
      target.addEventListener(type, handler, options);
      listeners.push({ target, type, handler, options });
    },
    delegate(container, type, selector, handler) {
      const remove = delegate(container, type, selector, handler);
      listeners.push({ remove });
    },
    clear() {
      while (listeners.length > 0) {
        const item = listeners.pop();
        if (item.remove) {
          item.remove();
        } else if (item.target && item.target.removeEventListener) {
          item.target.removeEventListener(item.type, item.handler, item.options);
        }
      }
    }
  };
}
