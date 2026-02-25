/**
 * ToxGuard Configuration
 * Single source of truth for all extension settings.
 * Change values here — all scripts read from this file.
 */

const CONFIG = Object.freeze({
    API_BASE: "https://amgovind-toxguard.hf.space",
    API_KEY: "f6f520147510c0f82c5c26198a502607b3676ad80b9e279943af35cc82fb9f02",  // Set via Options page → stored in chrome.storage
    DEFAULT_THRESHOLD: 0.5,
});
