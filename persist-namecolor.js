/* SSN - Persistent Forced Name Color (per user)
   Command: !namecolor <css-color>
   Examples:
     !namecolor #ff66cc
     !namecolor hotpink
     !namecolor rgb(255,0,255)
*/

(() => {
  const STORE_KEY = "ssn_forced_namecolor_v2";

  // Change command name here if you want (eg !colour, !color, !namecolour)
  const COMMAND = "!namecolor";

  // Hide the command message itself from appearing on stream
  const HIDE_COMMAND_MESSAGE = true;

  // Max length sanity check for CSS color strings
  const MAX_COLOR_LEN = 80;

  // --- persistence ---
  let map = {};
  try { map = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { map = {}; }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) {} };

  // Prefer stable userid; fallback to type+name
  const keyFor = (d) => {
    const type = (d?.type || "unknown").toLowerCase();
    if (d?.userid) return `${type}:uid:${d.userid}`;
    const name = (d?.chatname || "").trim().toLowerCase();
    return `${type}:name:${name}`;
  };

  const normalizeColor = (raw) => {
    if (!raw) return null;
    const c = String(raw).trim();
    if (!c || c.length > MAX_COLOR_LEN) return null;
    return c;
  };

  const isCommand = (msg) => {
    if (!msg) return null;
    const s = String(msg).trim();
    if (!s.toLowerCase().startsWith(COMMAND.toLowerCase())) return null;
    const rest = s.slice(COMMAND.length).trim();
    return rest || null;
  };

  // Force override of nameColor from our saved map (this is the “always win” bit)
  const forceColorIfSaved = (data) => {
    const k = keyFor(data);
    const forced = map[k];
    if (forced) data.nameColor = forced; // always override whatever was there
  };

  // Store new forced color if message is the command
  const handleMaybeCommand = (data) => {
    const colorPart = isCommand(data?.chatmessage);
    if (!colorPart) return false;

    const color = normalizeColor(colorPart);
    if (!color) return false;

    map[keyFor(data)] = color;
    save();

    // Also force it immediately on this message/user
    data.nameColor = color;
    return true;
  };

  // Wrap SSN’s processInput once it exists
  const wrap = () => {
    if (typeof window.processInput !== "function") return false;

    const original = window.processInput;

    window.processInput = function (data) {
      // 1) If this is the command, save it and force it
      let wasCommand = false;
      try {
        if (data?.chatname) {
          wasCommand = handleMaybeCommand(data);
          // Force always, even if not command
          forceColorIfSaved(data);
        }
      } catch (e) {}

      // 2) Run SSN’s normal processing/render pipeline
      const result = original.apply(this, arguments);

      // 3) Force again AFTER original, to override any other script that changed it
      try {
        if (data?.chatname) {
          forceColorIfSaved(data);
        }
      } catch (e) {}

      // 4) Optionally suppress showing the command message
      if (wasCommand && HIDE_COMMAND_MESSAGE) return;

      return result;
    };

    return true;
  };

  if (!wrap()) {
    const t = setInterval(() => { if (wrap()) clearInterval(t); }, 200);
  }

  // Helpful debug/reset tools
  window.__ssnForcedNameColorDump = () => ({ ...map });
  window.__ssnForcedNameColorResetAll = () => { map = {}; save(); };
})();
