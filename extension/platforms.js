/**
 * ToxGuard Platform Detection & Author Extraction
 * Platform-specific logic for extracting comment author IDs.
 *
 * Supported platforms:
 * - YouTube   → channel name from `ytd-comment-renderer`
 * - Reddit    → `u/username` from `shreddit-comment[author]`
 * - X/Twitter → `@handle` from `[data-testid='User-Name']`
 * - Generic   → falls back to "Unknown"
 *
 * @file Injected as a dependency before content.js
 */

/* eslint-disable no-unused-vars */

/**
 * @typedef {"youtube"|"reddit"|"x"|"generic"} Platform
 */

/**
 * Detect which platform the current page belongs to based on hostname.
 * @returns {Platform}
 */
function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("reddit.com")) return "reddit";
    if (host.includes("twitter.com") || host.includes("x.com")) return "x";
    return "generic";
}

/**
 * Extract the author/user ID for a comment element based on platform DOM structure.
 *
 * Each platform uses different DOM traversal strategies:
 * - **YouTube**: Walks up to `ytd-comment-view-model` or `ytd-comment-renderer`,
 *   then finds `#author-text`, `h3 a`, or channel links.
 * - **Reddit**: Prioritizes `shreddit-comment[author]` attribute (new Reddit),
 *   falls back to `.author` or `a[href*='/user/']` links (old Reddit).
 * - **X/Twitter**: Walks up to `article`, then finds `@handle` links in
 *   `[data-testid='User-Name']`.
 *
 * @param {Element}  element  - The comment text DOM element
 * @param {Platform} platform - Result of {@link detectPlatform}
 * @returns {string} Author name/handle (e.g. "JohnDoe", "u/username", "@handle") or "Unknown"
 */
function extractAuthor(element, platform) {
    try {
        switch (platform) {

            // ── YouTube ──────────────────────────────────────────────────────
            case "youtube": {
                const renderer = element.closest(
                    "ytd-comment-view-model, ytd-comment-renderer"
                );
                if (renderer) {
                    const authorLink =
                        renderer.querySelector("#author-text") ||
                        renderer.querySelector("h3 a") ||
                        renderer.querySelector("a[href*='/channel/'], a[href*='/@']");
                    if (authorLink) {
                        return authorLink.textContent.trim().replace(/^@/, "") || "Unknown";
                    }
                }
                return "Unknown";
            }

            // ── Reddit ──────────────────────────────────────────────────────
            case "reddit": {
                // New Reddit: shreddit-comment has author directly as attribute (most reliable)
                const shredditComment = element.closest("shreddit-comment");
                if (shredditComment && shredditComment.getAttribute("author")) {
                    return `u/${shredditComment.getAttribute("author")}`;
                }

                // Old Reddit / fallback
                const commentBlock =
                    element.closest("[data-testid='comment']") ||
                    element.closest(".Comment") ||
                    element.closest(".thing.comment");
                if (commentBlock) {
                    const authorEl =
                        commentBlock.querySelector(".author") ||
                        commentBlock.querySelector("[data-testid='comment_author_link']") ||
                        commentBlock.querySelector("a[href*='/user/']");
                    if (authorEl) {
                        /** @type {string} */
                        let name = authorEl.textContent.trim();
                        if (!name && authorEl.href) {
                            const match = authorEl.href.match(/\/user\/([^/?#]+)/);
                            if (match) name = match[1];
                        }
                        if (name) {
                            return name.startsWith("u/") ? name : `u/${name}`;
                        }
                    }
                }
                return "Unknown";
            }

            // ── X / Twitter ─────────────────────────────────────────────────
            case "x": {
                const tweet = element.closest("article");
                if (tweet) {
                    const userNameContainer = tweet.querySelector(
                        "[data-testid='User-Name']"
                    );
                    if (userNameContainer) {
                        const links = userNameContainer.querySelectorAll("a");
                        for (const link of links) {
                            const text = link.textContent.trim();
                            if (text.startsWith("@")) return text;
                        }
                        const displayName = userNameContainer.querySelector("span");
                        if (displayName) return displayName.textContent.trim();
                    }
                }
                return "Unknown";
            }

            // ── Generic ─────────────────────────────────────────────────────
            default:
                return "Unknown";
        }
    } catch {
        return "Unknown";
    }
}
