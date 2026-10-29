/**
 * YouTube Direct Ad-Blocker & Sanitizer Scriptlet
 * Injected at Document Start before YouTube player initializes.
 */
(function() {
    'use strict';

    console.log('[AdBlocker] Initializing YouTube ad-blocking engine...');

    // 1. Sanitize ad data structures
    function sanitizePlayerResponse(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        if (obj.adPlacements) {
            delete obj.adPlacements;
        }
        if (obj.playerAds) {
            delete obj.playerAds;
        }
        if (obj.adSlots) {
            delete obj.adSlots;
        }
        if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers && obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel) {
            delete obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel;
        }

        return obj;
    }

    // Intercept ytInitialPlayerResponse definition
    let _playerResponse = undefined;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
            return _playerResponse;
        },
        set(val) {
            _playerResponse = sanitizePlayerResponse(val);
        },
        configurable: true
    });

    // 2. Intercept Fetch API requests to /youtubei/v1/player
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next')) {
                const clone = response.clone();
                const json = await clone.json();
                sanitizePlayerResponse(json);
                return new Response(JSON.stringify(json), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            }
        } catch (e) {
            // Passthrough if json parsing fails
        }
        return response;
    };

    // 3. Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = url;
        return originalOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(...args) {
        if (this._url && (this._url.includes('/youtubei/v1/player') || this._url.includes('/youtubei/v1/next'))) {
            this.addEventListener('readystatechange', function() {
                if (this.readyState === 4 && this.status === 200) {
                    try {
                        const data = JSON.parse(this.responseText);
                        sanitizePlayerResponse(data);
                        Object.defineProperty(this, 'responseText', {
                            value: JSON.stringify(data)
                        });
                        Object.defineProperty(this, 'response', {
                            value: JSON.stringify(data)
                        });
                    } catch (e) {}
                }
            });
        }
        return originalSend.apply(this, args);
    };

    // 4. Fallback Player Fast-Forward & Auto-Skip Monitor
    const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-overlay-close-button',
        'button.ytp-ad-skip-button-text',
        '.videoAdUiSkipButton',
        '[id^="skip-button:"] button'
    ];

    function checkAndSkipAds() {
        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        const video = document.querySelector('video');

        // Check if player indicates ad is playing
        if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
            if (video && !isNaN(video.duration) && video.duration > 0) {
                video.muted = true;
                video.playbackRate = 16.0;
                video.currentTime = video.duration;
            }
        }

        // Click skip buttons immediately
        for (const sel of skipSelectors) {
            const btn = document.querySelector(sel);
            if (btn && typeof btn.click === 'function') {
                btn.click();
                break;
            }
        }

        // Dismiss Anti-Adblock modal if it ever appears
        const dismissBtn = document.querySelector('tp-yt-paper-dialog #dismiss-button, ytd-enforcement-message-view-model button');
        if (dismissBtn) {
            dismissBtn.click();
        }
    }

    setInterval(checkAndSkipAds, 250);

    // 5. Keep background playback alive: override Visibility API
    try {
        Object.defineProperty(document, 'hidden', { get: () => false });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
        document.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true);
    } catch (e) {}

    console.log('[AdBlocker] Direct Ad-Blocker hooks installed successfully.');
})();
