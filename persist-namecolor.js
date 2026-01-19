/* SSN Persistent Name Color (DOM-based, hard override)
   Command: !namecolor <css color>
   Examples:
     !namecolor #ff66cc
     !namecolor hotpink
     !namecolor rgb(255,0,255)
*/

(() => {
  const STORE_KEY = "ssn_namecolor_dom_v1";
  const COMMAND_RE = /(?:^|\s)!namecolor\s+(.+)\s*$/i;

  const HIDE_COMMAND_LINE = true;  // set false if you want the command to show
  const MAX_COLOR_LEN = 80;

  // Common username selectors across SSN themes (we try several)
  const USER_SELECTORS = [
    ".chatname", ".username", ".name", ".author", ".from", "[data-username]"
  ];

  // Common message text selectors across SSN themes (we try several)
  const MSG_SELECTORS = [
    ".message", ".chatmessage", ".text", ".msg", ".content"
  ];

  // Load/save map
  let map = {};
  try { map = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) {}
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) {} };

  // Helper: find first matching element under root
  const findFirst = (root, selectors) => {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  // Extract a stable-ish user key (platform + username)
  const getUserKey = (rowEl) => {
    const userEl = findFirst(rowEl, USER_SELECTORS);
    if (!userEl) return null;

    const rawName =
      (userEl.getAttribute("data-username") || userEl.textContent || "").trim();
    if (!rawName) return null;

    // Best-effort platform id from attributes/classes
    const platform =
      (rowEl.getAttribute("data-type") ||
       rowEl.getAttribute("data-platform") ||
       rowEl.className.match(/\b(youtube|twitch|kick|tiktok)\b/i)?.[1] ||
       "unknown").toLowerCase();

    return `${platform}:${rawName.toLowerCase()}`;
  };

  const normalizeColor = (c) => {
    if (!c) return null;
    const v = String(c).trim();
    if (!v || v.length > MAX_COLOR_LEN) return null;
    return v;
  };

  const getMessageText = (rowEl) => {
    const msgEl = findFirst(rowEl, MSG_SELECTORS);
    const txt = (msgEl?.textContent || "").trim();
    return txt || null;
  };

  const applyColorToRow = (rowEl) => {
    const key = getUserKey(rowEl);
    if (!key) return;

    const color = map[key];
    if (!color) return;

    const userEl = findFirst(rowEl, USER_SELECTORS);
    if (!userEl) return;

    // Hard override: color + (often needed) text-shadow reset
    userEl.style.setProperty("color", color, "important");

    // Some themes color via nested spans/links too
    for (const child of userEl.querySelectorAll("*")) {
      child.style.setProperty("color", color, "important");
    }
  };

  const handleCommandIfPresent = (rowEl) => {
    const key = getUserKey(rowEl);
    if (!key) return false;

    const msg = getMessageText(rowEl);
    if (!msg) return false;

    const m = msg.match(COMMAND_RE);
    if (!m) return false;

    const picked = normalizeColor(m[1]);
    if (!picked) return false;

    map[key] = picked;
    save();

    // Apply immediately
    applyColorToRow(rowEl);

    // Hide the command line if desired
    if (HIDE_COMMAND_LINE) {
      rowEl.style.setProperty("display", "none", "important");
    }

    return true;
  };

  // Process a row: save command if it is one, then always force color
  const processRow = (rowEl) => {
    if (!(rowEl instanceof Element)) return;

    // Some themes wrap rows differently; try to handle both row and its children
    handleCommandIfPresent(rowEl);
    applyColorToRow(rowEl);
  };

  // Observe the whole document for new chat lines
  const obs = new MutationObserver((mutations) => {
    for (const mu of mutations) {
      for (const node of mu.addedNodes) {
        if (!(node instanceof Element)) continue;
        processRow(node);

        // Also process any descendants that might be chat rows
        node.querySelectorAll?.("*")?.forEach(processRow);
      }
    }
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Initial pass (if chat already on screen)
  document.querySelectorAll("*").forEach(processRow);

  // Debug helpers
  window.__ssnNameColorDump = () => ({ ...map });
  window.__ssnNameColorResetAll = () => { map = {}; save(); location.reload(); };
})();
