/**
 * ToxGuard Configuration
 * Single source of truth for all extension settings.
 * Change values here — all scripts read from this file.
 */

const CONFIG = Object.freeze({
    API_BASE: "https://amgovind-toxguard.hf.space",
    API_KEY: "",  // Set via Options page → stored in chrome.storage
    DEFAULT_THRESHOLD: 0.5,
});
