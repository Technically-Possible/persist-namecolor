/* persist-namecolor.js
   Social Stream Ninja: Persistent Forced Name Color (per user)

   Commands supported (editable below):
     !namecolor <css-color>
     !namecolour <css-color>
     !color <css-color>
     !colour <css-color>

   Examples:
     !namecolor #ff66cc
     !namecolor hotpink
     !namecolor rgb(255,0,255)

   Behavior:
   - Saves per-user chosen color to localStorage (persistent across streams)
   - Forces data.nameColor on every message from that user (overrides others)
   - Optionally hides the command message itself
*/

(() => {
  // -------------------------
  // SETTINGS
  // -------------------------
  const STORE_KEY = "ssn_forced_namecolor_v3";

  // Commands you want to accept:
  const COMMANDS = ["!namecolor", "!namecolour", "!color", "!colour"];

  // Hide the command message itself from showing in the overlay/dock:
  const HIDE_COMMAND_MESSAGE = true;

  // Safety cap on color string length:
  const MAX_COLOR_LEN = 80;

  // -------------------------
  // STORAGE
  // -------------------------
  let map = {};
  try {
    map = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch (e) {
    map = {};
  }

  const save = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(map));
    } catch (e) {}
  };

  // Prefer stable userid; fallback to platform + display name
  const keyFor = (d) => {
    const type = (d?.type || "unknown").toLowerCase();
    if (d?.userid) return `${type}:uid:${d.userid}`;
    const name = (d?.chatname || "").trim().toLowerCase();
    return `${type}:name:${name}`;
  };

  const normalizeColor = (raw) => {
    if (raw == null) return null;
    const c = String(raw).trim();
    if (!c) return null;
    if (c.length > MAX_COLOR_LEN) return null;
    return c;
  };

  const parseCommandColor = (msg) => {
    if (!msg) return null;
    const s = String(msg).trim();
    if (!s) return null;

    const lower = s.toLowerCase();
    const cmd = COMMANDS.find((c) => lower.startsWith(c.toLowerCase()));
    if (!cmd) return null;

    const rest = s.slice(cmd.length).trim();
    if (!rest) return null;

    return normalizeColor(rest);
  };

  // Always force the saved color (this is the “override everything” part)
  const forceSavedColor = (data) => {
    const k = keyFor(data);
    const forced = map[k];
    if (forced) data.nameColor = forced;
  };

  const handleCommandIfPresent = (data) => {
    const color = parseCommandColor(data?.chatmessage);
    if (!color) return false;

    const k = keyFor(data);
    map[k] = color;
    save();

    // Apply immediately
    data.nameColor = color;
    return true;
  };

  // -------------------------
  // HOOK SSN
  // -------------------------
  const wrapWhenReady = () => {
    if (typeof window.processInput !== "function") return false;

    const original = window.processInput;

    window.processInput = function (data) {
      let wasCommand = false;

      try {
        // 1) Check for command; store and set
        if (data?.chatname) {
          wasCommand = handleCommandIfPresent(data);
          // Force saved color (pre)
          forceSavedColor(data);
        }
      } catch (e) {}

      // 2) Run SSN's processing
      const result = original.apply(this, arguments);

      try {
        // 3) Force again (post) to beat any other modifications
        if (data?.chatname) forceSavedColor(data);
      } catch (e) {}

      // 4) Optionally hide the command message
      if (wasCommand && HIDE_COMMAND_MESSAGE) return;

      return result;
    };

    return true;
  };

  if (!wrapWhenReady()) {
    const t = setInterval(() => {
      if (wrapWhenReady()) clearInterval(t);
    }, 200);
  }

  // -------------------------
  // OPTIONAL DEBUG HELPERS
  // -------------------------
  window.__ssnForcedNameColorDump = () => ({ ...map });
  window.__ssnForcedNameColorResetAll = () => {
    map = {};
    save();
  };
})();
