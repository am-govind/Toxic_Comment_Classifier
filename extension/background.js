/**
 * Background Service Worker
 * Handles API communication between content script and the ToxGuard server.
 */

importScripts("config.js");

// ── First-run: open options page so user can set their API key ───────
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.runtime.openOptionsPage();
    }
});

/**
 * Get API configuration from chrome.storage (with fallback defaults).
 */
async function getApiConfig() {
    try {
        const result = await chrome.storage.local.get(["apiBase", "apiKey"]);
        return {
            base: result.apiBase || CONFIG.API_BASE,
            key: result.apiKey || CONFIG.API_KEY,
        };
    } catch {
        return { base: CONFIG.API_BASE, key: CONFIG.API_KEY };
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "classifyComments") {
        classifyComments(message.comments, message.threshold)
            .then(results => sendResponse({ success: true, results }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
});

/**
 * Send comments to the ToxGuard API for classification.
 */
async function classifyComments(comments, threshold = 0.5) {
    const config = await getApiConfig();

    if (!config.key) {
        throw new Error("API key not set. Right-click ToxGuard icon → Options to configure.");
    }

    const url = `${config.base}/predict`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": config.key,
            },
            body: JSON.stringify({
                comments: comments,
                threshold: threshold
            }),
            signal: AbortSignal.timeout(30000), // 30s timeout for cold starts
        });

        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`API ${response.status}: ${body || response.statusText}`);
        }

        const data = await response.json();
        return data.results;
    } catch (err) {
        if (err.name === "TimeoutError") {
            throw new Error("Server timed out (possibly waking from sleep). Try again.");
        }
        throw new Error(`${err.message} [URL: ${url}]`);
    }
}
