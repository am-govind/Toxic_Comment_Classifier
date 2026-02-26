/**
 * ToxGuard Configuration
 * Single source of truth for all extension settings.
 * Change values here — all scripts read from this file.
 *
 * @typedef {Object} ToxGuardConfig
 * @property {string}  API_BASE           - Base URL of the ToxGuard classification server
 * @property {number}  DEFAULT_THRESHOLD  - Default toxicity threshold (0–1)
 */

/** @type {Readonly<ToxGuardConfig>} */
const CONFIG = Object.freeze({
    API_BASE: "https://amgovind-toxguard.hf.space",
    DEFAULT_THRESHOLD: 0.5,
});
