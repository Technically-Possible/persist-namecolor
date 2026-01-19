/* SSN Persistent Name Color - DOM override (works even if SSN internals differ)
   Command can appear anywhere in the line:
     @User !namecolor hotpink
     !namecolor #ff66cc
*/

(() => {
  const STORE_KEY = "ssn_namecolor_dom_v3";
  const CMD_RE = /!namecolor\s+(.+?)\s*$/i; // grab everything after !namecolor until end
  const HIDE_COMMAND_LINE = true;
  const MAX_COLOR_LEN = 80;

  // Load saved colors
  let map = {};
  try { map = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { map = {}; }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) {} };

  // Find the username element by heuristic: first element whose trimmed text starts with "@"
  function findUserEl(row) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_ELEMENT, null);
    let el = row;
    while (el) {
      const txt = (el.textContent || "").trim();
      // username in your screenshot looks like "@HackerJenn" (no spaces)
      if (txt.startsWith("@") && txt.length >= 2 && txt.length <= 40 && !txt.includes(" ")) {
        return el;
      }
      el = walker.nextNode();
    }
    return null;
  }

  function getUserKey(row) {
    const userEl = findUserEl(row);
    if (!userEl) return null;
    const name = (userEl.textContent || "").trim().toLowerCase();
    if (!name.startsWith("@")) return null;
    return name; // keep it simple: "@hackerjenn"
  }

  function normalizeColor(raw) {
    if (!raw) return null;
    const c = String(raw).trim();
    if (!c || c.length > MAX_COLOR_LEN) return null;
    return c;
  }

  function forceColor(row) {
    const userEl = findUserEl(row);
    const key = getUserKey(row);
    if (!userEl || !key) return;

    const color = map[key];
    if (!color) return;

    // Hard override
    userEl.style.setProperty("color", color, "important");
    // Also override nested spans/links inside the username
    userEl.querySelectorAll("*").forEach(child => {
      child.style.setProperty("color", color, "important");
    });
  }

  function handleCommand(row) {
    const key = getUserKey(row);
    if (!key) return false;

    const line = (row.textContent || "").trim();
    const m = line.match(CMD_RE);
    if (!m) return false;

    const picked = normalizeColor(m[1]);
    if (!picked) return false;

    map[key] = picked;
    save();

    // Apply immediately
    forceColor(row);

    if (HIDE_COMMAND_LINE) {
      row.style.setProperty("display", "none", "important");
    }
    return true;
  }

  function processRow(row) {
    if (!(row instanceof Element)) return;

    // First: if it contains a command, store it (and optionally hide it)
    handleCommand(row);

    // Always: force saved color onto the username
    forceColor(row);
  }

  // Observe for new chat rows
  const obs = new MutationObserver(muts => {
    for (const mu of muts) {
      for (const node of mu.addedNodes) {
        if (!(node instanceof Element)) continue;
        processRow(node);
        node.querySelectorAll?.("*")?.forEach(processRow);
      }
    }
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Initial pass for already-rendered lines
  document.querySelectorAll("*").forEach(processRow);

  // Debug helpers
  window.__ssnNameColorDump = () => ({ ...map });
  window.__ssnNameColorResetAll = () => { map = {}; save(); location.reload(); };
})();
