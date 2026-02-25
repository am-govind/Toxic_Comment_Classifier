/**
 * ToxGuard Popup Script
 * Manages the extension popup UI: server health checks, scan orchestration,
 * results display, CSV export, and theme toggling.
 *
 * @requires config.js — provides {@link CONFIG} with API_BASE
 */

/** @type {string} */
const API_BASE = CONFIG.API_BASE;

// ── DOM Elements ──────────────────────────────────────────────────────
/** @type {HTMLButtonElement} */
const scanBtn = document.getElementById("scanBtn");
/** @type {HTMLButtonElement} */
const clearBtn = document.getElementById("clearBtn");
/** @type {HTMLElement} */
const statusDot = document.getElementById("statusDot");
/** @type {HTMLElement} */
const statusText = document.getElementById("statusText");
/** @type {HTMLInputElement} */
const thresholdSlider = document.getElementById("thresholdSlider");
/** @type {HTMLElement} */
const thresholdValue = document.getElementById("thresholdValue");
/** @type {HTMLElement} */
const resultsSection = document.getElementById("resultsSection");
/** @type {HTMLElement} */
const loadingSection = document.getElementById("loadingSection");
/** @type {HTMLElement} */
const errorSection = document.getElementById("errorSection");
/** @type {HTMLElement} */
const errorText = document.getElementById("errorText");
/** @type {HTMLElement} */
const totalScanned = document.getElementById("totalScanned");
/** @type {HTMLElement} */
const toxicFound = document.getElementById("toxicFound");
/** @type {HTMLElement} */
const mediumFound = document.getElementById("mediumFound");
/** @type {HTMLElement} */
const safeFound = document.getElementById("safeFound");
/** @type {HTMLElement} */
const categoryBreakdown = document.getElementById("categoryBreakdown");
/** @type {HTMLButtonElement} */
const themeToggle = document.getElementById("themeToggle");
/** @type {HTMLButtonElement} */
const exportBtn = document.getElementById("exportBtn");

/**
 * Stores the last scan results for CSV export.
 * @type {ClassificationResult[]|null}
 */
let lastResults = null;

// ═══════════════════════════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════════════════════════

/**
 * Load the saved theme from chrome.storage and apply it.
 * Defaults to "dark" if no preference is stored.
 * @returns {Promise<void>}
 */
async function loadTheme() {
    try {
        const { theme } = await chrome.storage.local.get("theme");
        const isDark = theme !== "light";
        applyTheme(isDark ? "dark" : "light");
    } catch {
        applyTheme("dark");
    }
}

/**
 * Apply a theme to the popup UI.
 * @param {"dark"|"light"} theme
 */
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}

themeToggle.addEventListener("click", async () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    await chrome.storage.local.set({ theme: next });
});

// ═══════════════════════════════════════════════════════════════════════
//  SERVER HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if the ToxGuard server is reachable and healthy.
 * Updates the status dot and text in the popup UI.
 * @returns {Promise<boolean>} `true` if server is online
 */
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await response.json();
        if (data.status === "ok") {
            statusDot.className = "status-dot online";
            statusText.textContent = "Server Online";
            scanBtn.disabled = false;
            return true;
        }
    } catch (e) {
        // Server not reachable
    }
    statusDot.className = "status-dot offline";
    statusText.textContent = "Server Offline";
    scanBtn.disabled = true;
    return false;
}

// ═══════════════════════════════════════════════════════════════════════
//  THRESHOLD SLIDER
// ═══════════════════════════════════════════════════════════════════════

thresholdSlider.addEventListener("input", () => {
    thresholdValue.textContent = `${thresholdSlider.value}%`;
});

// ═══════════════════════════════════════════════════════════════════════
//  SCAN
// ═══════════════════════════════════════════════════════════════════════

scanBtn.addEventListener("click", async () => {
    const threshold = parseInt(thresholdSlider.value) / 100;

    // Show loading, hide others
    loadingSection.style.display = "flex";
    resultsSection.style.display = "none";
    errorSection.style.display = "none";
    clearBtn.style.display = "none";
    scanBtn.disabled = true;

    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Inject content scripts (dependencies first, then orchestrator)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content-styles.js", "platforms.js", "content.js"]
        });

        // Ask content script to scrape comments
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: "scrapeAndClassify",
            threshold: threshold
        });

        if (response && response.success) {
            displayResults(response.data);
        } else {
            showError(response?.error || "Failed to scan page. Try refreshing the page.");
        }
    } catch (err) {
        showError(`Scan failed: ${err.message}`);
    } finally {
        loadingSection.style.display = "none";
        scanBtn.disabled = false;
    }
});

// ═══════════════════════════════════════════════════════════════════════
//  CLEAR
// ═══════════════════════════════════════════════════════════════════════

clearBtn.addEventListener("click", async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: "clearHighlights" });
        resultsSection.style.display = "none";
        clearBtn.style.display = "none";
        lastResults = null;
    } catch (err) {
        // Silently fail
    }
});

// ═══════════════════════════════════════════════════════════════════════
//  RESULTS DISPLAY
// ═══════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ScanData
 * @property {number}                totalComments  - Total comments found on page
 * @property {number}                toxicComments  - Number of toxic comments
 * @property {number}                [mediumComments=0] - Number of medium-severity comments
 * @property {ClassificationResult[]} results       - Per-comment classification results
 */

/**
 * Populate the popup results section with scan data.
 * @param {ScanData} data - Scan results from the content script
 */
function displayResults(data) {
    const { totalComments, toxicComments, mediumComments = 0, results } = data;
    const safeCount = totalComments - toxicComments - mediumComments;

    // Store for export
    lastResults = results;

    totalScanned.textContent = totalComments;
    toxicFound.textContent = toxicComments;
    mediumFound.textContent = mediumComments;
    safeFound.textContent = safeCount;

    // Category breakdown
    /** @type {Record<string, number>} */
    const categories = {};
    results.forEach(r => {
        if (r.is_toxic) {
            Object.entries(r.scores).forEach(([cat, score]) => {
                if (score >= parseFloat(thresholdSlider.value) / 100) {
                    categories[cat] = (categories[cat] || 0) + 1;
                }
            });
        }
    });

    categoryBreakdown.innerHTML = "";
    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    sortedCats.forEach(([cat, count]) => {
        const item = document.createElement("div");
        item.className = "category-item";
        item.innerHTML = `
      <span class="category-name">${cat.replace(/_/g, " ")}</span>
      <span class="category-count">${count}</span>
    `;
        categoryBreakdown.appendChild(item);
    });

    resultsSection.style.display = "block";
    clearBtn.style.display = "flex";
}

// ═══════════════════════════════════════════════════════════════════════
//  CSV EXPORT
// ═══════════════════════════════════════════════════════════════════════

exportBtn.addEventListener("click", () => {
    if (!lastResults || lastResults.length === 0) return;

    const headers = ["text", "author", "severity", "flagged_categories", "toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"];
    const rows = lastResults.map(r => {
        const text = `"${(r.text || "").replace(/"/g, '""')}"`;
        const author = `"${(r.author || "Unknown").replace(/"/g, '""')}"`;
        return [
            text,
            author,
            r.severity || "unknown",
            r.flagged_categories || 0,
            r.scores?.toxic || 0,
            r.scores?.severe_toxic || 0,
            r.scores?.obscene || 0,
            r.scores?.threat || 0,
            r.scores?.insult || 0,
            r.scores?.identity_hate || 0,
        ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `toxguard_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
});

// ═══════════════════════════════════════════════════════════════════════
//  ERROR DISPLAY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Show an error message in the popup, auto-hides after 5 seconds.
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorText.textContent = message;
    errorSection.style.display = "block";
    setTimeout(() => {
        errorSection.style.display = "none";
    }, 5000);
}

// ═══════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════

loadTheme();
checkServerHealth();
