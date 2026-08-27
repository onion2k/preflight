// Preflight for Launch — renders the checklist from PREFLIGHT_CHECKS and keeps the results.
//
// Nothing here knows the content of a single check: sections, items, tables, the rail, the
// meter and the scroll markers are all built from the data in checks.js.
(function () {
  "use strict";

  const CHECKS = window.PREFLIGHT_CHECKS || [];
  const LEGACY_ORDER = window.PREFLIGHT_LEGACY_ORDER || [];
  const STORE = "preflight-results-v2";
  const LEGACY_STORE = "preflight-launch-v1";

  const VERIFY_LABEL = { agent: "agent-checkable", shared: "agent + you" };

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

    label.appendChild(input);
    label.appendChild(task);
    if (item.note) label.appendChild(el("span", "note", item.note));
    if (item.recipe) label.appendChild(el("span", "recipe", item.recipe));

    input.addEventListener("change", function () {
      if (input.checked) {
        results[item.id] = { status: "done", by: "you" };
      } else {
        delete results[item.id];
      }
      writeResults(results);
      update();
    });

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

  function update() {
    let total = 0;
    let done = 0;

    CHECKS.forEach(function (section) {
      let localTotal = 0;
      let localDone = 0;
      section.items.forEach(function (item) {
        if (!inScope(item)) return;
        localTotal++;
        if (results[item.id]) localDone++;
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
    update();
  });

  update();
  onScroll();
})();
