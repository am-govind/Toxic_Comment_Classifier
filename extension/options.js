/**
 * ToxGuard Options Page Script
 * Manages saving/loading API server URL to/from chrome.storage.local.
 * Accessible via extension context menu.
 *
 * @requires config.js — provides {@link CONFIG} with default API_BASE
 */

/** @type {HTMLInputElement} */
const apiBaseInput = document.getElementById("apiBase");
/** @type {HTMLButtonElement} */
const resetBtn = document.getElementById("resetBtn");
/** @type {HTMLElement} */
const statusMsg = document.getElementById("statusMsg");

// ── Load saved settings ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const result = await chrome.storage.local.get(["apiBase"]);
        apiBaseInput.value = result.apiBase || CONFIG.API_BASE;
    } catch {
        apiBaseInput.value = CONFIG.API_BASE;
    }
});

// ── Save settings ───────────────────────────────────────────────────
document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const apiBase = apiBaseInput.value.trim().replace(/\/+$/, "");

    if (!apiBase) {
        showStatus("Please enter a valid API URL.", "error");
        return;
    }

    await chrome.storage.local.set({ apiBase });
    showStatus("✅ Settings saved! Extension is ready to use.", "success");
});

// ── Reset URL to default ────────────────────────────────────────────
resetBtn.addEventListener("click", async () => {
    apiBaseInput.value = CONFIG.API_BASE;
    await chrome.storage.local.set({ apiBase: CONFIG.API_BASE });
    showStatus("🔄 URL reset to default.", "success");
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

