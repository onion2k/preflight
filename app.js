// Preflight for Launch — renders the checklist from PREFLIGHT_CHECKS and keeps the results.
//
// Nothing here knows the content of a single check: sections, items, tables, the rail, the
// meter and the scroll markers are all built from the data in checks.js.
(function () {
  "use strict";

  // Bumped by tools/stamp.py together with the service worker cache name and version.json.
  const BUILD = "v12";
  const CHECKS = window.PREFLIGHT_CHECKS || [];
  const LEGACY_ORDER = window.PREFLIGHT_LEGACY_ORDER || [];
  const STORE = "preflight-results-v2";
  const LEGACY_STORE = "preflight-launch-v1";

  const VERIFY_LABEL = { agent: "agent-checkable", shared: "agent + you" };
  const STATUS_LABEL = { done: "done", pass: "pass", fail: "fail", na: "not applicable" };
  // A "fail" is a check that ran and did not pass — worse than untouched, so it never counts
  // as settled and never ticks the box.
  const SETTLED = { done: true, pass: true, na: true, fail: false };
  const TARGET_STORE = "preflight-target-v1";

  const root = document.getElementById("checklist");
  const rail = document.querySelector("nav.rail");
  const track = document.getElementById("scrolltrack");
  const scrollfill = document.getElementById("scrollfill");
  const meter = document.getElementById("meter");
  const meterfill = document.getElementById("meterfill");
  const tally = document.getElementById("tally");
  const filterBtn = document.getElementById("filter");

  let agentOnly = false;
  const inputs = new Map();   // check id -> checkbox
  const evidenceNodes = new Map(); // check id -> evidence line
  const rows = new Map();     // check id -> li
  const links = new Map();    // section id -> { a, count }
  const marks = new Map();    // section id -> scroll marker

  // ---------- results ----------

  function readResults() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) return JSON.parse(raw) || {};
    } catch (e) { /* private mode, blocked storage */ }
    return migrate();
  }

  // v1 keyed ticks by DOM position, so reordering moved them. Translate once.
  function migrate() {
    const out = {};
    try {
      const raw = localStorage.getItem(LEGACY_STORE);
      if (!raw) return out;
      const old = JSON.parse(raw) || {};
      Object.keys(old).forEach(function (key) {
        const index = Number(key.replace("chk-", ""));
        const id = LEGACY_ORDER[index];
        if (id) out[id] = { status: "done", by: "you" };
      });
      localStorage.setItem(STORE, JSON.stringify(out));
      localStorage.removeItem(LEGACY_STORE);
    } catch (e) { /* nothing to migrate */ }
    return out;
  }

  function writeResults(results) {
    try { localStorage.setItem(STORE, JSON.stringify(results)); } catch (e) {}
  }

  let results = readResults();
  let target = null;
  try { target = localStorage.getItem(TARGET_STORE); } catch (e) {}

  const listeners = [];
  function changed() {
    update();
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  // ---------- rendering ----------

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function renderTable(table) {
    const wrap = el("div", "tablewrap");
    const t = document.createElement("table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    table.columns.forEach(function (c) { hr.appendChild(el("th", null, c)); });
    thead.appendChild(hr);
    const tbody = document.createElement("tbody");
    table.rows.forEach(function (row) {
      const tr = document.createElement("tr");
      row.forEach(function (cell) { tr.appendChild(el("td", null, cell)); });
      tbody.appendChild(tr);
    });
    t.appendChild(thead);
    t.appendChild(tbody);
    wrap.appendChild(t);
    return wrap;
  }

  function renderItem(item) {
    const li = document.createElement("li");
    li.dataset.checkId = item.id;
    li.dataset.verify = item.verify;

    const label = el("label", "item");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "chk--" + item.id;
    input.checked = !!results[item.id];

    const task = el("span", "task", item.task);
    if (item.tag) task.appendChild(el("span", "tag " + item.tag.kind, item.tag.label));
    if (item.verify !== "human") {
      task.appendChild(el("span", "tag verify " + item.verify, VERIFY_LABEL[item.verify]));
    }

    const evidence = el("span", "evidence");
    evidence.hidden = true;

    label.appendChild(input);
    label.appendChild(task);
    if (item.note) label.appendChild(el("span", "note", item.note));
    if (item.recipe) label.appendChild(el("span", "recipe", item.recipe));
    label.appendChild(evidence);

    input.addEventListener("change", function () {
      const prior = results[item.id];
      if (input.checked) {
        // A person ticking a box always wins, but the agent's evidence is kept rather
        // than silently dropped.
        results[item.id] = { status: "done", by: "you" };
        if (prior && prior.evidence) results[item.id].evidence = prior.evidence;
      } else {
        delete results[item.id];
      }
      writeResults(results);
      changed();
    });

    evidenceNodes.set(item.id, evidence);

    li.appendChild(label);
    inputs.set(item.id, input);
    rows.set(item.id, li);
    return li;
  }

  function renderSection(section) {
    const node = el("section", "block");
    node.id = section.id;

    const head = el("div", "blockhead");
    head.appendChild(el("h2", null, section.title));
    head.appendChild(el("div", "sig", section.sig));
    head.appendChild(el("p", null, section.intro));
    node.appendChild(head);

    if (section.table) node.appendChild(renderTable(section.table));

    const list = el("ul", "items");
    if (section.table) list.style.borderTop = "1px solid var(--rule-2)";
    section.items.forEach(function (item) { list.appendChild(renderItem(item)); });
    node.appendChild(list);
    return node;
  }

  function renderRail(section) {
    const a = document.createElement("a");
    a.href = "#" + section.id;
    a.appendChild(el("span", null, section.title.split(" — ")[0]));
    const count = el("span", "count");
    a.appendChild(count);
    rail.appendChild(a);
    links.set(section.id, { a: a, count: count });

    const mark = el("a", "mark");
    mark.href = "#" + section.id;
    mark.tabIndex = -1;
    track.appendChild(mark);
    marks.set(section.id, mark);
  }

  CHECKS.forEach(function (section) {
    root.appendChild(renderSection(section));
    renderRail(section);
  });

  // ---------- progress ----------

  function inScope(item) {
    return !agentOnly || item.verify !== "human";
  }

  function paintRow(item) {
    const record = results[item.id];
    const li = rows.get(item.id);
    const input = inputs.get(item.id);
    const node = evidenceNodes.get(item.id);

    if (record) li.dataset.status = record.status; else delete li.dataset.status;
    input.checked = !!(record && SETTLED[record.status]);

    if (record && record.evidence) {
      node.hidden = false;
      node.textContent = "";
      node.appendChild(el("span", "verdict " + record.status, STATUS_LABEL[record.status] || record.status));
      node.appendChild(document.createTextNode(" " + record.evidence + (record.note ? " — " + record.note : "")));
      // Evidence outlives the agent's verdict: if you tick a check the agent failed, the
      // finding stays on the page rather than disappearing.
      node.appendChild(el("span", "who", record.by === "agent" ? "recorded by agent" : "agent evidence, settled by you"));
    } else {
      node.hidden = true;
    }
  }

  function renderTarget() {
    const node = document.getElementById("target");
    if (!node) return;
    node.hidden = !target;
    if (target) node.innerHTML = "Checking <b>" + target.replace(/[<>&]/g, "") + "</b>";
  }

  function update() {
    renderTarget();
    let total = 0;
    let done = 0;

    CHECKS.forEach(function (section) {
      section.items.forEach(paintRow);
      let localTotal = 0;
      let localDone = 0;
      section.items.forEach(function (item) {
        if (!inScope(item)) return;
        localTotal++;
        const record = results[item.id];
        if (record && SETTLED[record.status]) localDone++;
      });
      total += localTotal;
      done += localDone;

      const link = links.get(section.id);
      const mark = marks.get(section.id);
      const complete = localTotal > 0 && localDone === localTotal;
      link.count.textContent = localDone + "/" + localTotal;
      link.a.classList.toggle("done", complete);
      link.a.hidden = localTotal === 0;
      mark.classList.toggle("done", complete);
      mark.hidden = localTotal === 0;
      mark.title = section.title + " — " + localDone + "/" + localTotal;
      document.getElementById(section.id).hidden = localTotal === 0;
    });

    const pct = total ? Math.round((done / total) * 100) : 0;
    meterfill.style.width = pct + "%";
    meter.setAttribute("aria-valuenow", String(pct));
    tally.textContent = done + " / " + total + (agentOnly ? " agent-checkable" : " checked") + " · " + pct + "%";
    placeMarks();
  }

  // ---------- scroll bar ----------

  function placeMarks() {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    CHECKS.forEach(function (section) {
      const node = document.getElementById(section.id);
      const mark = marks.get(section.id);
      if (node.hidden) return;
      const top = node.getBoundingClientRect().top + window.scrollY;
      const pct = range > 0 ? Math.min(100, Math.max(0, (top / range) * 100)) : 0;
      mark.style.left = pct + "%";
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const pct = range > 0 ? Math.min(100, Math.max(0, (window.scrollY / range) * 100)) : 100;
      scrollfill.style.width = pct + "%";
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { placeMarks(); onScroll(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { placeMarks(); onScroll(); });
  }

  // ---------- controls ----------

  filterBtn.addEventListener("click", function () {
    agentOnly = !agentOnly;
    document.body.classList.toggle("agent-only", agentOnly);
    filterBtn.setAttribute("aria-pressed", String(agentOnly));
    update();
  });

  document.getElementById("reset").addEventListener("click", function () {
    results = {};
    writeResults(results);
    inputs.forEach(function (input) { input.checked = false; });
    changed();
  });

  // ---------- the interface the WebMCP tools drive ----------

  function findCheck(id) {
    for (let i = 0; i < CHECKS.length; i++) {
      const found = CHECKS[i].items.find(function (item) { return item.id === id; });
      if (found) return { check: found, section: CHECKS[i] };
    }
    return null;
  }

  window.Preflight = {
    sections: CHECKS,
    findCheck: findCheck,
    allChecks: function () {
      return CHECKS.flatMap(function (s) {
        return s.items.map(function (item) { return Object.assign({ section: s.id }, item); });
      });
    },
    getResult: function (id) { return results[id] || null; },
    isSettled: function (id) { return !!(results[id] && SETTLED[results[id].status]); },
    setResult: function (id, record) {
      results[id] = record;
      writeResults(results);
      changed();
    },
    clearResult: function (id) {
      delete results[id];
      writeResults(results);
      changed();
    },
    getTarget: function () { return target; },
    setTarget: function (url) {
      target = url;
      try {
        if (url) localStorage.setItem(TARGET_STORE, url); else localStorage.removeItem(TARGET_STORE);
      } catch (e) {}
      changed();
    },
    onChange: function (fn) { listeners.push(fn); }
  };

  update();
  onScroll();

  // ---------- which copy of the app am I actually running? ----------
  //
  // The service worker serves the shell cache-first, so an updated file can sit on the server
  // while the browser keeps running the old one. The footer says which build is executing, and
  // version.json — fetched past the cache — says which one the server has.

  const stamp = document.getElementById("build");

  function showBuild(text, stale) {
    if (!stamp) return;
    stamp.textContent = text;
    stamp.classList.toggle("stale", !!stale);
  }

  // index.html carries the published build (written by tools/stamp.py, and served
  // network-first), so a stale script announces itself rather than quietly disagreeing.
  const shellBuild = (stamp && stamp.textContent.replace("build ", "").trim()) || null;
  if (shellBuild && shellBuild !== BUILD) {
    showBuild("page " + shellBuild + " running scripts " + BUILD + " — reload to update", true);
  } else {
    showBuild("build " + BUILD);
  }

  fetch("./version.json?at=" + Date.now(), { cache: "no-store" })
    .then(function (response) { return response.json(); })
    .then(function (published) {
      if (published.build && published.build !== BUILD) {
        showBuild("build " + BUILD + " — " + published.build + " published, reload to update", true);
      }
    })
    .catch(function () {
      // Offline, or the file isn't there: the running build is all we can honestly report.
    });
})();
