/**
 * ToxGuard Options Page Script
 * Manages saving/loading API configuration to/from chrome.storage.local.
 * Opened automatically on first install and accessible via extension context menu.
 *
 * @requires config.js — provides {@link CONFIG} with default API_BASE
 */

/** @type {HTMLInputElement} */
const apiBaseInput = document.getElementById("apiBase");
/** @type {HTMLInputElement} */
const apiKeyInput = document.getElementById("apiKey");
/** @type {HTMLButtonElement} */
const resetBtn = document.getElementById("resetBtn");
/** @type {HTMLButtonElement} */
const toggleKey = document.getElementById("toggleKey");
/** @type {HTMLElement} */
const statusMsg = document.getElementById("statusMsg");

// ── Load saved settings ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const result = await chrome.storage.local.get(["apiBase", "apiKey"]);
        apiBaseInput.value = result.apiBase || CONFIG.API_BASE;
        apiKeyInput.value = result.apiKey || "";
    } catch {
        apiBaseInput.value = CONFIG.API_BASE;
    }
});

// ── Save settings ───────────────────────────────────────────────────
document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const apiBase = apiBaseInput.value.trim().replace(/\/+$/, "");
    const apiKey = apiKeyInput.value.trim();

    if (!apiBase) {
        showStatus("Please enter a valid API URL.", "error");
        return;
    }
    if (!apiKey) {
        showStatus("Please enter your API key.", "error");
        return;
    }

    await chrome.storage.local.set({ apiBase, apiKey });
    showStatus("✅ Settings saved! Extension is ready to use.", "success");
});

// ── Reset URL to default ────────────────────────────────────────────
resetBtn.addEventListener("click", async () => {
    apiBaseInput.value = CONFIG.API_BASE;
    await chrome.storage.local.set({ apiBase: CONFIG.API_BASE });
    showStatus("🔄 URL reset to default.", "success");
});

// ── Toggle key visibility ───────────────────────────────────────────
toggleKey.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleKey.textContent = isPassword ? "🙈" : "👁️";
});

/**
 * Display a temporary status message below the form.
 *
 * @param {string} message - Message text to display
 * @param {"success"|"error"} type - Visual style variant
 */
function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = `status-msg ${type}`;
    setTimeout(() => { statusMsg.className = "status-msg"; }, 3000);
}
