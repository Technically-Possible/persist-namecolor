/* SSN Persistent Name Color (theme-specific: highlight-chat / hl-name / hl-message)
   - Persistent per user (localStorage)
   - Command anywhere: "!namecolor <color>" or "@User !namecolor <color>"
   - Hard override of name color via CSS !important
*/

(() => {
  const STORE_KEY = "ssn_persist_namecolor_final_v1";

  // Accepts:
  //   !namecolor hotpink
  //   @Someone !namecolor #FF007F
  const CMD_RE = /!namecolor\s+(.+?)\s*$/i;

  const HIDE_COMMAND_LINE = true;
  const MAX_COLOR_LEN = 80;

  // Load saved map
  let map = {};
  try { map = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { map = {}; }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) {} };

  // Build a stable per-platform key
  function userKeyFromRow(row) {
    const name = (row.getAttribute("data-chatname") || "").trim().toLowerCase();
    const src  = (row.getAttribute("data-source-type") || "unknown").trim().toLowerCase();
    if (!name) return null;
    return `${src}:${name}`; // e.g. "youtube:@hackerjenn"
  }

  function normalizeColor(raw) {
    if (!raw) return null;
    const c = String(raw).trim();
    if (!c || c.length > MAX_COLOR_LEN) return null;
    return c;
  }

  function forceApply(row) {
    const key = userKeyFromRow(row);
    if (!key) return;

    const color = map[key];
    if (!color) return;

    const nameEl = row.querySelector(".hl-name");
    if (!nameEl) return;

    // Hard override (beats theme styles)
    nameEl.style.setProperty("color", color, "important");
    nameEl.style.setProperty("-webkit-text-fill-color", color, "important");

    // Sometimes badges/nested spans inherit differently; force all children too
    nameEl.querySelectorAll("*").forEach(el => {
      el.style.setProperty("color", color, "important");
      el.style.setProperty("-webkit-text-fill-color", color, "important");
    });
  }

  function handleCommand(row) {
    const msgEl = row.querySelector(".hl-message");
    if (!msgEl) return false;

    const txt = (msgEl.textContent || "").trim();
    const m = txt.match(CMD_RE);
    if (!m) return false;

    const picked = normalizeColor(m[1]);
    if (!picked) return false;

    const key = userKeyFromRow(row);
    if (!key) return false;

    map[key] = picked;
    save();

    if (HIDE_COMMAND_LINE) {
      row.style.setProperty("display", "none", "important");
    }

    return true;
  }

  function processRow(row) {
    if (!(row instanceof Element)) return;
    if (!row.classList.contains("highlight-chat")) return;

    // Save if command
    handleCommand(row);

    // Always override afterwards
    forceApply(row);
  }

  // Initial pass
  document.querySelectorAll(".highlight-chat").forEach(processRow);

  // Watch for new rows
  const obs = new MutationObserver(muts => {
    for (const mu of muts) {
      for (const node of mu.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.classList?.contains("highlight-chat")) processRow(node);
        node.querySelectorAll?.(".highlight-chat")?.forEach(processRow);
      }
    }
  });

  const out = document.getElementById("output") || document.documentElement;
  obs.observe(out, { childList: true, subtree: true });

  // Debug helpers
  window.__ssnNameColorDump = () => ({ ...map });
  window.__ssnNameColorResetAll = () => { map = {}; save(); location.reload(); };
})();
