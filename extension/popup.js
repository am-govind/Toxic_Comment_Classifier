/**
 * Popup Script — handles UI interactions, server health checks,
 * and orchestrates the scan flow.
 */

const API_BASE = CONFIG.API_BASE;

// ── DOM Elements ──────────────────────────────────────────────────────
const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const thresholdSlider = document.getElementById("thresholdSlider");
const thresholdValue = document.getElementById("thresholdValue");
const resultsSection = document.getElementById("resultsSection");
const loadingSection = document.getElementById("loadingSection");
const errorSection = document.getElementById("errorSection");
const errorText = document.getElementById("errorText");
const totalScanned = document.getElementById("totalScanned");
const toxicFound = document.getElementById("toxicFound");
const mediumFound = document.getElementById("mediumFound");
const safeFound = document.getElementById("safeFound");
const categoryBreakdown = document.getElementById("categoryBreakdown");
const themeToggle = document.getElementById("themeToggle");
const exportBtn = document.getElementById("exportBtn");

// Store last scan results for export
let lastResults = null;

// ── Theme Toggle ──────────────────────────────────────────────────────
async function loadTheme() {
    try {
        const { theme } = await chrome.storage.local.get("theme");
        const isDark = theme !== "light";
        applyTheme(isDark ? "dark" : "light");
    } catch {
        applyTheme("dark");
    }
}

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

// ── Server Health Check ───────────────────────────────────────────────
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

// ── Threshold Slider ──────────────────────────────────────────────────
thresholdSlider.addEventListener("input", () => {
    thresholdValue.textContent = `${thresholdSlider.value}%`;
});

// ── Scan Button ───────────────────────────────────────────────────────
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

        // Inject content script
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
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

// ── Clear Button ──────────────────────────────────────────────────────
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

// ── Display Results ───────────────────────────────────────────────────
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

// ── Export CSV ─────────────────────────────────────────────────────────
exportBtn.addEventListener("click", () => {
    if (!lastResults || lastResults.length === 0) return;

    const headers = ["text", "severity", "flagged_categories", "toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"];
    const rows = lastResults.map(r => {
        const text = `"${(r.text || "").replace(/"/g, '""')}"`;
        return [
            text,
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

// ── Show Error ────────────────────────────────────────────────────────
function showError(message) {
    errorText.textContent = message;
    errorSection.style.display = "block";
    setTimeout(() => {
        errorSection.style.display = "none";
    }, 5000);
}

// ── Init ──────────────────────────────────────────────────────────────
loadTheme();
checkServerHealth();
