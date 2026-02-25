/**
 * ToxGuard Configuration
 * Single source of truth for all extension settings.
 * Change values here — all scripts read from this file.
 *
 * @typedef {Object} ToxGuardConfig
 * @property {string}  API_BASE           - Base URL of the ToxGuard classification server
 * @property {string}  API_KEY            - Default API key (can be overridden via Options page → chrome.storage)
 * @property {number}  DEFAULT_THRESHOLD  - Default toxicity threshold (0–1)
 */

/** @type {Readonly<ToxGuardConfig>} */
const CONFIG = Object.freeze({
    API_BASE: "https://amgovind-toxguard.hf.space",
    API_KEY: "f6f520147510c0f82c5c26198a502607b3676ad80b9e279943af35cc82fb9f02",
    DEFAULT_THRESHOLD: 0.5,
});
