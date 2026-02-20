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
  const MODAL_ID = "toxguard-stats-modal";
  const OVERLAY_ID = "toxguard-overlay";
  const MIN_TEXT_LENGTH = 10;
  const MAX_TEXT_LENGTH = 1000;

  // Store last scan results for the modal
  let lastScanData = null;

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

      /* ── Modal Overlay ── */
      #${OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(0, 0, 0, 0.6) !important;
        backdrop-filter: blur(4px) !important;
        z-index: 2147483640 !important;
        opacity: 0;
        transition: opacity 0.3s ease !important;
      }
      #${OVERLAY_ID}.tg-visible { opacity: 1; }

      /* ── Stats Modal ── */
      #${MODAL_ID} {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) scale(0.9) !important;
        width: 480px !important;
        max-height: 85vh !important;
        background: #13131a !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 16px !important;
        z-index: 2147483641 !important;
        font-family: 'Inter', -apple-system, sans-serif !important;
        color: #e2e8f0 !important;
        box-shadow: 0 25px 60px rgba(0,0,0,0.5) !important;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }
      #${MODAL_ID}.tg-visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) !important;
      }

      .tg-modal-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 20px 24px 16px !important;
        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      }
      .tg-modal-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .tg-modal-close {
        width: 28px !important;
        height: 28px !important;
        border-radius: 8px !important;
        border: none !important;
        background: rgba(255,255,255,0.06) !important;
        color: #94a3b8 !important;
        font-size: 16px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: background 0.2s !important;
      }
      .tg-modal-close:hover { background: rgba(255,255,255,0.12) !important; }

      .tg-modal-body {
        padding: 20px 24px !important;
        overflow-y: auto !important;
        flex: 1 !important;
      }

      /* ── Stat Cards Row ── */
      .tg-stat-row {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 12px !important;
        margin-bottom: 20px !important;
      }
      .tg-stat-card {
        background: rgba(255,255,255,0.04) !important;
        border: 1px solid rgba(255,255,255,0.06) !important;
        border-radius: 12px !important;
        padding: 14px !important;
        text-align: center !important;
      }
      .tg-stat-number {
        font-size: 28px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
      }
      .tg-stat-label {
        font-size: 11px !important;
        font-weight: 500 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        color: #94a3b8 !important;
        margin-top: 6px !important;
      }
      .tg-stat-number.toxic { color: #f87171 !important; }
      .tg-stat-number.medium { color: #fbbf24 !important; }
      .tg-stat-number.safe { color: #34d399 !important; }

      /* ── Category Bars ── */
      .tg-section-title {
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        color: #94a3b8 !important;
        margin-bottom: 12px !important;
      }
      .tg-category-list { margin-bottom: 20px !important; }
      .tg-category-item {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        margin-bottom: 10px !important;
      }
      .tg-cat-name {
        font-size: 12px !important;
        font-weight: 500 !important;
        width: 100px !important;
        flex-shrink: 0 !important;
        text-transform: capitalize !important;
        color: #cbd5e1 !important;
      }
      .tg-cat-bar-bg {
        flex: 1 !important;
        height: 8px !important;
        background: rgba(255,255,255,0.06) !important;
        border-radius: 4px !important;
        overflow: hidden !important;
      }
      .tg-cat-bar-fill {
        height: 100% !important;
        border-radius: 4px !important;
        transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1) !important;
        width: 0% !important;
      }
      .tg-cat-count {
        font-size: 12px !important;
        font-weight: 700 !important;
        width: 28px !important;
        text-align: right !important;
        flex-shrink: 0 !important;
      }

      /* ── Comment List ── */
      .tg-comment-list { margin-top: 4px !important; }
      .tg-comment-item {
        background: rgba(255,255,255,0.03) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
        border-radius: 10px !important;
        padding: 12px 14px !important;
        margin-bottom: 8px !important;
        cursor: pointer !important;
        transition: background 0.2s, border-color 0.2s !important;
      }
      .tg-comment-item:hover {
        background: rgba(255,255,255,0.06) !important;
        border-color: rgba(255,255,255,0.1) !important;
      }
      .tg-comment-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 6px !important;
      }
      .tg-comment-severity {
        font-size: 10px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        padding: 2px 8px !important;
        border-radius: 4px !important;
      }
      .tg-comment-severity.toxic {
        background: rgba(248, 113, 113, 0.15) !important;
        color: #f87171 !important;
      }
      .tg-comment-severity.medium {
        background: rgba(251, 191, 36, 0.15) !important;
        color: #fbbf24 !important;
      }
      .tg-comment-category {
        font-size: 11px !important;
        color: #64748b !important;
      }
      .tg-comment-text {
        font-size: 13px !important;
        line-height: 1.5 !important;
        color: #94a3b8 !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
      }

      /* ── Modal scrollbar ── */
      .tg-modal-body::-webkit-scrollbar { width: 4px !important; }
      .tg-modal-body::-webkit-scrollbar-track { background: transparent !important; }
      .tg-modal-body::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1) !important;
        border-radius: 2px !important;
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
    badge.addEventListener("click", () => showStatsModal());
    document.body.appendChild(badge);
  }

  // ── Stats Modal ────────────────────────────────────────────────────
  function showStatsModal() {
    if (!lastScanData) return;
    // Remove existing modal
    hideStatsModal();

    const { totalComments, toxicComments, mediumComments = 0, results } = lastScanData;
    const safeCount = totalComments - toxicComments - mediumComments;

    // Build category breakdown
    const categories = {};
    results.forEach(r => {
      const severity = r.severity || (r.is_toxic ? "toxic" : "safe");
      if (severity === "toxic" || severity === "medium") {
        Object.entries(r.scores).forEach(([cat, score]) => {
          if (score >= 0.3) {
            categories[cat] = (categories[cat] || 0) + 1;
          }
        });
      }
    });
    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const maxCatCount = sortedCats.length > 0 ? sortedCats[0][1] : 1;

    const catColors = {
      toxic: "#f87171", severe_toxic: "#ef4444", obscene: "#fb923c",
      threat: "#f43f5e", insult: "#a78bfa", identity_hate: "#f472b6"
    };

    // Build flagged comments list (toxic + medium only)
    const flagged = results
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => {
        const sev = r.severity || (r.is_toxic ? "toxic" : "safe");
        return sev === "toxic" || sev === "medium";
      });

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.addEventListener("click", hideStatsModal);
    document.body.appendChild(overlay);

    // Modal
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="tg-modal-header">
        <div class="tg-modal-title">🛡️ ToxGuard Report</div>
        <button class="tg-modal-close" id="tg-close-btn">✕</button>
      </div>
      <div class="tg-modal-body">
        <div class="tg-stat-row">
          <div class="tg-stat-card">
            <div class="tg-stat-number toxic">${toxicComments}</div>
            <div class="tg-stat-label">Toxic</div>
          </div>
          <div class="tg-stat-card">
            <div class="tg-stat-number medium">${mediumComments}</div>
            <div class="tg-stat-label">Medium</div>
          </div>
          <div class="tg-stat-card">
            <div class="tg-stat-number safe">${safeCount}</div>
            <div class="tg-stat-label">Safe</div>
          </div>
        </div>

        ${sortedCats.length > 0 ? `
          <div class="tg-section-title">Category Breakdown</div>
          <div class="tg-category-list">
            ${sortedCats.map(([cat, count]) => `
              <div class="tg-category-item">
                <span class="tg-cat-name">${cat.replace(/_/g, " ")}</span>
                <div class="tg-cat-bar-bg">
                  <div class="tg-cat-bar-fill" data-width="${(count / maxCatCount) * 100}" style="background: ${catColors[cat] || '#f87171'};"></div>
                </div>
                <span class="tg-cat-count" style="color: ${catColors[cat] || '#f87171'};">${count}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}

        ${flagged.length > 0 ? `
          <div class="tg-section-title">Flagged Comments (${flagged.length})</div>
          <div class="tg-comment-list">
            ${flagged.map(r => {
      const sev = r.severity || (r.is_toxic ? "toxic" : "safe");
      const topCat = Object.entries(r.scores).reduce(
        (max, [c, s]) => (s > max[1] ? [c, s] : max), ["", 0]
      );
      return `
                <div class="tg-comment-item" data-index="${r.index}">
                  <div class="tg-comment-header">
                    <span class="tg-comment-severity ${sev}">${sev}</span>
                    <span class="tg-comment-category">${topCat[0].replace(/_/g, " ")} · ${(topCat[1] * 100).toFixed(0)}%</span>
                  </div>
                  <div class="tg-comment-text">${escapeHtml(r.text)}</div>
                </div>
              `;
    }).join("")}
          </div>
        ` : ""}
      </div>
    `;
    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add("tg-visible");
      modal.classList.add("tg-visible");
      // Animate category bars
      modal.querySelectorAll(".tg-cat-bar-fill").forEach(bar => {
        bar.style.width = bar.dataset.width + "%";
      });
    });

    // Close button
    modal.querySelector("#tg-close-btn").addEventListener("click", hideStatsModal);
    // Click comment to scroll
    modal.querySelectorAll(".tg-comment-item").forEach(item => {
      item.addEventListener("click", () => {
        hideStatsModal();
        const allHighlighted = document.querySelectorAll(
          `.${TOXIC_CLASS}, .${MEDIUM_CLASS}`
        );
        const idx = parseInt(item.dataset.index);
        // Find the element matching this result index
        const target = allHighlighted[idx] || allHighlighted[0];
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    // ESC to close
    document.addEventListener("keydown", handleEsc);
  }

  function handleEsc(e) {
    if (e.key === "Escape") hideStatsModal();
  }

  function hideStatsModal() {
    document.removeEventListener("keydown", handleEsc);
    const overlay = document.getElementById(OVERLAY_ID);
    const modal = document.getElementById(MODAL_ID);
    if (overlay) overlay.remove();
    if (modal) modal.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
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
    // Remove modal
    hideStatsModal();
    lastScanData = null;
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

      // Store data for the stats modal
      lastScanData = {
        totalComments: elements.length,
        toxicComments: toxicCount,
        mediumComments: mediumCount,
        results: results
      };

      return {
        success: true,
        data: lastScanData
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
