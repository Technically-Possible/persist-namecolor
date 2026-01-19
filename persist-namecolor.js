/* SSN persistent forced nameColor (ES5-safe)
   Commands: !namecolor / !namecolour / !color / !colour  <css-color>
*/
(function () {
  var STORE_KEY = "ssn_forced_namecolor_v4";
  var COMMANDS = ["!namecolor", "!namecolour", "!color", "!colour"];
  var HIDE_COMMAND_MESSAGE = true;
  var MAX_COLOR_LEN = 80;

  var map = {};
  try { map = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { map = {}; }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) {}
  }

  function trim(s) { return String(s).replace(/^\s+|\s+$/g, ""); }

  function keyFor(d) {
    var type = (d && d.type ? String(d.type).toLowerCase() : "unknown");
    if (d && d.userid) return type + ":uid:" + String(d.userid);
    var name = (d && d.chatname ? trim(d.chatname).toLowerCase() : "");
    return type + ":name:" + name;
  }

  function normalizeColor(raw) {
    if (raw === null || raw === undefined) return null;
    var c = trim(raw);
    if (!c) return null;
    if (c.length > MAX_COLOR_LEN) return null;
    return c;
  }

  function parseCommandColor(msg) {
    if (!msg) return null;
    var s = trim(msg);
    if (!s) return null;
    var lower = s.toLowerCase();
    for (var i = 0; i < COMMANDS.length; i++) {
      var cmd = COMMANDS[i];
      if (lower.indexOf(cmd) === 0) {
        var rest = trim(s.slice(cmd.length));
        return normalizeColor(rest);
      }
    }
    return null;
  }

  function forceSavedColor(data) {
    var k = keyFor(data);
    var forced = map[k];
    if (forced) data.nameColor = forced; // always override
  }

  function handleCommandIfPresent(data) {
    var color = parseCommandColor(data && data.chatmessage);
    if (!color) return false;
    var k = keyFor(data);
    map[k] = color;
    save();
    data.nameColor = color;
    return true;
  }

  function wrap() {
    if (typeof window.processInput !== "function") return false;

    var original = window.processInput;
    window.processInput = function (data) {
      var wasCommand = false;

      try {
        if (data && data.chatname) {
          wasCommand = handleCommandIfPresent(data);
          forceSavedColor(data); // pre
        }
      } catch (e) {}

      var result = original.apply(this, arguments);

      try {
        if (data && data.chatname) {
          forceSavedColor(data); // post (wins last)
        }
      } catch (e) {}

      if (wasCommand && HIDE_COMMAND_MESSAGE) return;
      return result;
    };

    return true;
  }

  if (!wrap()) {
    var t = setInterval(function () {
      if (wrap()) clearInterval(t);
    }, 200);
  }

  window.__ssnForcedNameColorResetAll = function () { map = {}; save(); };
})();
