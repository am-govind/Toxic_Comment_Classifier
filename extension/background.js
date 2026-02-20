/**
 * Background Service Worker
 * Handles API communication between content script and the ToxGuard server.
 */

const DEFAULT_API_BASE = "http://localhost:4000";
const DEFAULT_API_KEY = "toxguard-dev-key-change-me";

/**
 * Get API configuration from chrome.storage (with fallback defaults).
 */
async function getApiConfig() {
    try {
        const result = await chrome.storage.local.get(["apiBase", "apiKey"]);
        return {
            base: result.apiBase || DEFAULT_API_BASE,
            key: result.apiKey || DEFAULT_API_KEY,
        };
    } catch {
        return { base: DEFAULT_API_BASE, key: DEFAULT_API_KEY };
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

    const response = await fetch(`${config.base}/predict`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": config.key,
        },
        body: JSON.stringify({
            comments: comments,
            threshold: threshold
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
}
