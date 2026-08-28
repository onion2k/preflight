// Saving, loading and sharing a run.
//
// The app has two users — a person ticking boxes and an agent recording evidence — and they
// are often in different browsers, where localStorage cannot reach across. This turns a run
// into a blob: copy it, save it to a file, or carry it in a link that opens the app with the
// agent's findings already in place.
//
// Built on the public window.Preflight interface, so it knows nothing about how results are
// stored, and window.PreflightState is what the WebMCP tools call.
(function () {
  "use strict";

  const P = window.Preflight;
  if (!P) return;

  const FORMAT = 1;
  const HASH_KEY = "results=";
  const MAX_LINK = 30000; // beyond this a link stops being reliable; use the file instead

  // ---------- encoding ----------

  function bytesToBase64url(bytes) {
    let binary = "";
    bytes.forEach(function (b) { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64urlToBytes(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - padded.length % 4) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // "z" is gzipped, "j" is plain JSON — evidence strings compress well, but the API is not
  // everywhere, so the prefix says which one you are holding.
  async function encode(text) {
    if (typeof CompressionStream === "undefined") {
      return "j" + bytesToBase64url(new TextEncoder().encode(text));
    }
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return "z" + bytesToBase64url(new Uint8Array(buffer));
  }

  async function decode(value) {
    const bytes = base64urlToBytes(value.slice(1));
    if (value[0] === "j") return new TextDecoder().decode(bytes);
    if (value[0] !== "z") throw new Error("Unrecognised results format");
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot read a compressed link; use the JSON file instead");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  // ---------- the blob ----------

  function snapshot() {
    const results = {};
    P.allChecks().forEach(function (check) {
      const record = P.getResult(check.id);
      if (record) results[check.id] = record;
    });
    return {
      preflight: FORMAT,
      target: P.getTarget() || null,
      savedAt: new Date().toISOString(),
      results: results
    };
  }

  function newer(a, b) {
    return (a && a.at ? a.at : "") > (b && b.at ? b.at : "");
  }

  // A person's tick outranks an agent's verdict on the same check — that is the whole point of
  // recording who settled what. Between two agent records, the later one wins.
  function merge(blob) {
    if (!blob || blob.preflight !== FORMAT || typeof blob.results !== "object") {
      throw new Error("That does not look like a Preflight results file");
    }
    const report = { added: 0, updated: 0, kept: 0, unknown: [] };

    Object.keys(blob.results).forEach(function (id) {
      const incoming = blob.results[id];
      if (!P.findCheck(id)) { report.unknown.push(id); return; }

      const local = P.getResult(id);
      if (!local) {
        P.setResult(id, incoming);
        report.added++;
      } else if (local.by === "you" || !newer(incoming, local)) {
        report.kept++;
      } else {
        P.setResult(id, incoming);
        report.updated++;
      }
    });

    if (blob.target && !P.getTarget()) P.setTarget(blob.target);
    return report;
  }

  // ---------- link ----------

  async function toLink() {
    const encoded = await encode(JSON.stringify(snapshot()));
    if (encoded.length > MAX_LINK) return null;
    return location.origin + location.pathname + "#" + HASH_KEY + encoded;
  }

  async function loadFromHash() {
    const hash = location.hash.slice(1);
    if (!hash.startsWith(HASH_KEY)) return null;
    // Strip it first: a shared link should apply once, not on every reload.
    history.replaceState(null, "", location.pathname + location.search);
    const blob = JSON.parse(await decode(hash.slice(HASH_KEY.length)));
    return merge(blob);
  }

  window.PreflightState = {
    snapshot: snapshot,
    merge: merge,
    toLink: toLink,
    encode: encode,
    decode: decode
  };

  // ---------- panel ----------

  const panel = document.getElementById("results-panel");
  if (!panel) return;

  const note = panel.querySelector(".panel-note");
  const paste = panel.querySelector("textarea");
  const fileInput = panel.querySelector("input[type=file]");

  function say(message, bad) {
    note.textContent = message;
    note.classList.toggle("bad", !!bad);
  }

  function describe(report) {
    const parts = [report.added + " added"];
    if (report.updated) parts.push(report.updated + " updated");
    if (report.kept) parts.push(report.kept + " kept (yours win)");
    if (report.unknown.length) parts.push(report.unknown.length + " unknown ids ignored");
    return "Loaded: " + parts.join(", ") + ".";
  }

  panel.querySelector("[data-action=copy]").addEventListener("click", function () {
    const text = JSON.stringify(snapshot(), null, 1);
    navigator.clipboard.writeText(text)
      .then(function () { say("Results copied. Paste them into the other browser's Load box."); })
      .catch(function () { paste.value = text; say("Clipboard refused — the JSON is in the box below, copy it from there."); });
  });

  panel.querySelector("[data-action=download]").addEventListener("click", function () {
    const blob = new Blob([JSON.stringify(snapshot(), null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const host = (P.getTarget() || "preflight").replace(/^https?:\/\//, "").replace(/[^a-z0-9.-]/gi, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = "preflight-" + host + ".json";
    a.click();
    URL.revokeObjectURL(url);
    say("Saved.");
  });

  panel.querySelector("[data-action=link]").addEventListener("click", async function () {
    const link = await toLink();
    if (!link) {
      say("Too much evidence to fit in a link — save the file instead.", true);
      return;
    }
    navigator.clipboard.writeText(link)
      .then(function () { say("Link copied. Opening it anywhere loads these results."); })
      .catch(function () { paste.value = link; say("Clipboard refused — the link is in the box below."); });
  });

  panel.querySelector("[data-action=load]").addEventListener("click", async function () {
    const text = paste.value.trim();
    if (!text) { say("Paste results JSON, or a share link, into the box first.", true); return; }
    try {
      const hashIndex = text.indexOf("#" + HASH_KEY);
      const blob = hashIndex === -1
        ? JSON.parse(text)
        : JSON.parse(await decode(text.slice(hashIndex + HASH_KEY.length + 1)));
      say(describe(merge(blob)));
      paste.value = "";
    } catch (error) {
      say(error.message, true);
    }
  });

  fileInput.addEventListener("change", function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    file.text().then(function (text) {
      try { say(describe(merge(JSON.parse(text)))); }
      catch (error) { say(error.message, true); }
      fileInput.value = "";
    });
  });

  function applyHash() {
    loadFromHash()
      .then(function (report) { if (report) { panel.open = true; say(describe(report)); } })
      .catch(function (error) { panel.open = true; say("That link could not be read: " + error.message, true); });
  }

  // Pasting a share link into the address bar of an already-open checklist only changes the
  // hash — no navigation, no reload — so the link has to be applied on hashchange too.
  window.addEventListener("hashchange", applyHash);
  applyHash();
})();
