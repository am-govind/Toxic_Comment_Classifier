/**
 * Content Script — Scrapes text from the page, sends to API for classification,
 * and highlights toxic comments with a glowing red border.
 */

(() => {
  // Prevent double-injection
  if (window.__toxGuardInjected) return;
  window.__toxGuardInjected = true;

  const API_BASE = "http://localhost:4000";
  const TOXIC_CLASS = "toxguard-toxic";
  const MEDIUM_CLASS = "toxguard-medium";
  const SAFE_CLASS = "toxguard-safe";
  const BADGE_ID = "toxguard-badge";
  const TOOLTIP_ID = "toxguard-floating-tooltip";
  const MIN_TEXT_LENGTH = 10;
  const MAX_TEXT_LENGTH = 1000;

  // ── Floating Tooltip ────────────────────────────────────────────────
  // Single tooltip element appended to <body> to avoid overflow:hidden clipping
  let floatingTooltip = null;

  function getFloatingTooltip() {
    if (floatingTooltip && document.body.contains(floatingTooltip)) return floatingTooltip;
    floatingTooltip = document.createElement("div");
    floatingTooltip.id = TOOLTIP_ID;
    document.body.appendChild(floatingTooltip);
    return floatingTooltip;
  }

  function showTooltip(element) {
    const tooltipText = element.getAttribute("data-toxguard-tooltip");
    const tooltipColor = element.getAttribute("data-toxguard-color") || "#f87171";
    const borderColor = element.getAttribute("data-toxguard-border") || "rgba(248, 113, 113, 0.3)";
    if (!tooltipText) return;

    const tip = getFloatingTooltip();
    tip.textContent = tooltipText;
    tip.style.cssText = `
            position: fixed !important;
            background: #1f1f2e !important;
            color: ${tooltipColor} !important;
            font-family: 'Inter', -apple-system, sans-serif !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            padding: 6px 12px !important;
            border-radius: 8px !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            z-index: 2147483647 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
            border: 1px solid ${borderColor} !important;
            opacity: 1 !important;
            transition: opacity 0.15s ease !important;
        `;

    const rect = element.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let top = rect.top - tipRect.height - 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    // If tooltip would go above viewport, show below element instead
    if (top < 4) {
      top = rect.bottom + 8;
    }
    // Keep within horizontal viewport bounds
    if (left < 4) left = 4;
    if (left + tipRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tipRect.width - 4;
    }

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function hideTooltip() {
    if (floatingTooltip) {
      floatingTooltip.style.opacity = "0";
      floatingTooltip.style.pointerEvents = "none";
    }
  }

  // ── CSS Injection ───────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("toxguard-styles")) return;
    const style = document.createElement("style");
    style.id = "toxguard-styles";
    style.textContent = `
      .${TOXIC_CLASS} {
        outline: 3px solid #ef4444 !important;
        outline-offset: 2px !important;
        background: rgba(239, 68, 68, 0.06) !important;
        border-radius: 4px !important;
        position: relative !important;
        animation: toxguard-glow 2s ease-in-out infinite alternate !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
      }

      @keyframes toxguard-glow {
        from { box-shadow: 0 0 5px rgba(239, 68, 68, 0.3), inset 0 0 5px rgba(239, 68, 68, 0.05); }
        to   { box-shadow: 0 0 15px rgba(239, 68, 68, 0.5), inset 0 0 10px rgba(239, 68, 68, 0.08); }
      }

      .${TOXIC_CLASS}:hover {
        outline-width: 4px !important;
      }

      /* ── Medium (Yellow) ── */
      .${MEDIUM_CLASS} {
        outline: 3px solid #eab308 !important;
        outline-offset: 2px !important;
        background: rgba(234, 179, 8, 0.06) !important;
        border-radius: 4px !important;
        position: relative !important;
        animation: toxguard-glow-medium 2s ease-in-out infinite alternate !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
      }

      @keyframes toxguard-glow-medium {
        from { box-shadow: 0 0 5px rgba(234, 179, 8, 0.3), inset 0 0 5px rgba(234, 179, 8, 0.05); }
        to   { box-shadow: 0 0 15px rgba(234, 179, 8, 0.5), inset 0 0 10px rgba(234, 179, 8, 0.08); }
      }

      .${MEDIUM_CLASS}:hover {
        outline-width: 4px !important;
      }

      /* ── Safe (Green) ── */
      .${SAFE_CLASS} {
        outline: 3px solid #34d399 !important;
        outline-offset: 2px !important;
        background: rgba(52, 211, 153, 0.06) !important;
        border-radius: 4px !important;
        position: relative !important;
        animation: toxguard-glow-safe 2s ease-in-out infinite alternate !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
      }

      @keyframes toxguard-glow-safe {
        from { box-shadow: 0 0 5px rgba(52, 211, 153, 0.3), inset 0 0 5px rgba(52, 211, 153, 0.05); }
        to   { box-shadow: 0 0 15px rgba(52, 211, 153, 0.5), inset 0 0 10px rgba(52, 211, 153, 0.08); }
      }

      .${SAFE_CLASS}:hover {
        outline-width: 4px !important;
      }

      /* ── Badge ── */
      #${BADGE_ID} {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        background: linear-gradient(135deg, #dc2626, #991b1b) !important;
        color: white !important;
        font-family: 'Inter', -apple-system, sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        padding: 10px 18px !important;
        border-radius: 50px !important;
        z-index: 999999 !important;
        box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4) !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        animation: toxguard-slideIn 0.5s ease !important;
      }

      #${BADGE_ID}:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 25px rgba(220, 38, 38, 0.5) !important;
      }

      @keyframes toxguard-slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      #${BADGE_ID} .badge-icon {
        font-size: 16px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Comment Extraction ──────────────────────────────────────────────
  function extractComments() {
    const commentElements = [];

    // Common comment selectors across popular websites
    const commentSelectors = [
      // YouTube
      "#content-text",
      "yt-formatted-string#content-text",
      // Reddit
      "[data-testid='comment'] p",
      ".Comment p",
      ".md p",
      // Twitter/X
      "[data-testid='tweetText']",
      // General comment sections
      ".comment-body", ".comment-text", ".comment-content",
      ".comment p", ".comments p",
      "[class*='comment'] p",
      "[class*='Comment'] p",
      // Forum-style
      ".post-body", ".post-content", ".message-body",
      ".reply-body", ".reply-content",
      // News sites
      ".article-comment", ".user-comment",
      // Generic text containers that might be comments
      "article p", ".feed-item p",
    ];

    // Try specific selectors first
    const selectorString = commentSelectors.join(", ");
    const specificElements = document.querySelectorAll(selectorString);

    specificElements.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH) {
        commentElements.push(el);
      }
    });

    // If no specific comments found, fall back to scanning all text-bearing elements
    if (commentElements.length === 0) {
      const allElements = document.querySelectorAll("p, span, div, li, td, blockquote");
      allElements.forEach(el => {
        const text = el.innerText?.trim();
        // Only consider leaf-ish elements (not containers with many children)
        if (
          text &&
          text.length >= MIN_TEXT_LENGTH &&
          text.length <= MAX_TEXT_LENGTH &&
          el.children.length <= 3 &&
          !el.closest("nav, header, footer, script, style, noscript")
        ) {
          commentElements.push(el);
        }
      });
    }

    // Deduplicate (child elements already covered by parent)
    const unique = [];
    commentElements.forEach(el => {
      const isChild = commentElements.some(
        other => other !== el && other.contains(el)
      );
      if (!isChild) unique.push(el);
    });

    return unique;
  }

  // ── Attach Tooltip Hover Listeners ──────────────────────────────────
  function attachTooltip(element, text, color, borderColor) {
    element.setAttribute("data-toxguard-tooltip", text);
    element.setAttribute("data-toxguard-color", color);
    element.setAttribute("data-toxguard-border", borderColor);
    element.addEventListener("mouseenter", () => showTooltip(element));
    element.addEventListener("mouseleave", hideTooltip);
  }

  // ── Highlight Toxic Comments ────────────────────────────────────────
  function highlightToxic(element, scores) {
    element.classList.add(TOXIC_CLASS);

    // Find the top toxic category
    const topCategory = Object.entries(scores).reduce(
      (max, [cat, score]) => (score > max[1] ? [cat, score] : max),
      ["", 0]
    );

    attachTooltip(
      element,
      `⚠️ ${topCategory[0].replace(/_/g, " ")} (${(topCategory[1] * 100).toFixed(0)}%)`,
      "#f87171",
      "rgba(248, 113, 113, 0.3)"
    );
  }

  // ── Highlight Medium Comments ───────────────────────────────────────
  function highlightMedium(element, scores) {
    element.classList.add(MEDIUM_CLASS);

    const topCategory = Object.entries(scores).reduce(
      (max, [cat, score]) => (score > max[1] ? [cat, score] : max),
      ["", 0]
    );

    attachTooltip(
      element,
      `⚠️ ${topCategory[0].replace(/_/g, " ")} (${(topCategory[1] * 100).toFixed(0)}%)`,
      "#eab308",
      "rgba(234, 179, 8, 0.3)"
    );
  }

  // ── Highlight Safe Comments ─────────────────────────────────────────
  function highlightSafe(element) {
    element.classList.add(SAFE_CLASS);

    attachTooltip(
      element,
      `✅ Safe`,
      "#34d399",
      "rgba(52, 211, 153, 0.3)"
    );
  }

  // ── Show Badge ──────────────────────────────────────────────────────
  function showBadge(count) {
    let badge = document.getElementById(BADGE_ID);
    if (badge) badge.remove();

    if (count === 0) return;

    badge = document.createElement("div");
    badge.id = BADGE_ID;
    badge.innerHTML = `<span class="badge-icon">🛡️</span> ${count} toxic comment${count !== 1 ? "s" : ""} found`;
    badge.addEventListener("click", () => {
      // Scroll to the first toxic comment
      const first = document.querySelector(`.${TOXIC_CLASS}`);
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    document.body.appendChild(badge);
  }

  // ── Clear Highlights ────────────────────────────────────────────────
  function clearHighlights() {
    document.querySelectorAll(`.${TOXIC_CLASS}, .${MEDIUM_CLASS}, .${SAFE_CLASS}`).forEach(el => {
      el.classList.remove(TOXIC_CLASS);
      el.classList.remove(MEDIUM_CLASS);
      el.classList.remove(SAFE_CLASS);
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.background = "";
      el.style.animation = "";
      el.style.boxShadow = "";
      el.removeAttribute("data-toxguard-tooltip");
      el.removeAttribute("data-toxguard-color");
      el.removeAttribute("data-toxguard-border");
    });
    const badge = document.getElementById(BADGE_ID);
    if (badge) badge.remove();
    // Remove floating tooltip
    const tip = document.getElementById(TOOLTIP_ID);
    if (tip) tip.remove();
    floatingTooltip = null;
  }

  // ── Main Scan Flow ──────────────────────────────────────────────────
  async function scanPage(threshold) {
    injectStyles();
    clearHighlights();

    const elements = extractComments();
    if (elements.length === 0) {
      return {
        success: true,
        data: { totalComments: 0, toxicComments: 0, results: [] }
      };
    }

    // Extract text from elements
    const texts = elements.map(el => el.innerText.trim());

    // Send to API via background script
    try {
      const response = await chrome.runtime.sendMessage({
        action: "classifyComments",
        comments: texts,
        threshold: threshold
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      const results = response.results;
      let toxicCount = 0;
      let mediumCount = 0;

      results.forEach((result, index) => {
        // Use severity from server (category-count based)
        const severity = result.severity || (result.is_toxic ? "toxic" : "safe");

        if (severity === "toxic") {
          toxicCount++;
          highlightToxic(elements[index], result.scores);
        } else if (severity === "medium") {
          mediumCount++;
          highlightMedium(elements[index], result.scores);
        } else {
          highlightSafe(elements[index]);
        }
      });

      showBadge(toxicCount + mediumCount);

      return {
        success: true,
        data: {
          totalComments: elements.length,
          toxicComments: toxicCount,
          mediumComments: mediumCount,
          results: results
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── Message Listener ────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapeAndClassify") {
      scanPage(message.threshold).then(sendResponse);
      return true; // async response
    }
    if (message.action === "clearHighlights") {
      clearHighlights();
      sendResponse({ success: true });
    }
  });
})();
