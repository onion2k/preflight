# Preflight for Launch

A pre-launch checklist for websites, as an installable, offline-first Progressive Web App.
Twelve sections — content, accessibility (WCAG 2.2 AA), security headers, crawler files,
Lighthouse, error pages, metadata, legal, DNS, monitoring, QA, launch day. Ticks are stored
in `localStorage`, so progress survives a reload and an install.

Live at **https://onion2k.github.io/preflight/**

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The shell: head, styles, and the elements the app renders into. No build step. |
| `checks.js` | The checklist as data — 12 sections, 73 items, each with a permanent id. |
| `app.js` | Renders the checklist from that data and stores results. |
| `webmcp.js` | Exposes the checklist to an AI agent as WebMCP tools. |
| `state.js` | Saving, loading and sharing a run between browsers. |
| `pwa.js` | Install prompt, update prompt, online/offline status. |
| `version.json` | The published build, fetched past the cache to detect a stale one. |
| `tools/stamp.py` | Bumps the build across `sw.js`, `app.js` and `version.json` together. |
| `manifest.webmanifest` | Name, icons, `standalone` display, theme colours, section shortcuts. |
| `sw.js` | Service worker. Network-first (revalidating) for the page, its scripts and its data; cache-first for icons; stale-while-revalidate for webfonts. |
| `icons/` | Generated PNG set plus the source `icon.svg`. |
| `tools/make-icons.py` | Regenerates the PNGs from the vector description. No dependencies. |

## Running it

A service worker needs a secure context, which means `localhost` or HTTPS — opening
`index.html` from the filesystem gives you the checklist but no offline support.

```bash
python3 -m http.server 4180
```

Then visit http://localhost:4180.

## Installing

Chrome and Edge show an install button in the address bar, and the page also shows its own
**Install app** button when the browser offers one. On iOS use Share → Add to Home Screen.

## Deploying

GitHub Pages serves `main` from the repository root, so a push to `main` deploys. Every path
in the app is relative, which is what lets it work from the `/preflight/` subpath as well as
from a domain root.

Pages serves everything with `Cache-Control: max-age=600` and does not let you change it. The
service worker fetches code and data with `cache: "no-cache"`, so those revalidate rather than
sitting in the browser cache for ten minutes; `sw.js` itself is fetched by the browser and can
still lag by that much before a new worker is noticed. Ten minutes is well inside the 24-hour
limit above which browsers bypass the HTTP cache for worker updates entirely.

On any other static host, two things to get right:

- Serve `sw.js` with `Cache-Control: no-cache` so update checks are not themselves cached.
- Serve the whole thing over HTTPS, or the service worker will not register.

Typefaces come from Google Fonts and are cached by the service worker on first load, so the
first visit needs a connection to get the intended type. Offline before that, the page falls
back to the system stacks and everything still works.

## Changing the checklist

Everything the page shows comes from `PREFLIGHT_CHECKS` in `checks.js`. Adding a check means
adding an object to a section's `items` array — the section rail, the progress meter, the
scroll markers and the filter all build themselves from the data at load.

```js
{
  id: "security.csp",              // permanent; keys the saved result
  task: "Content-Security-Policy in enforcing mode",
  note: "No <code>unsafe-inline</code> for scripts …",
  tag: { kind: "block", label: "blocker" },
  verify: "agent",
  recipe: "Parse content-security-policy: reject unsafe-inline in script-src …"
}
```

`verify` says who can settle the check:

| value | meaning | count |
| --- | --- | --- |
| `agent` | Decidable from the site alone. `recipe` says how. | 30 |
| `shared` | An agent gathers the evidence, a person makes the call. | 21 |
| `human` | Judgement, or knowledge that isn't on the site. | 22 |

**Agent-checkable only** filters to the 51 non-human checks and reveals each recipe. That
split is what a future WebMCP integration would drive: the page holds the list, the order and
the record; the agent does the fetching and reports evidence back.

Ids are permanent. They key the saved results, and renaming one orphans anyone's existing
tick — but adding or reordering items is free, which is the point of the refactor — results are stored in `localStorage` under `preflight-results-v2` as
`{ "security.csp": { "status": "done", "by": "you" } }`. The `by` field exists so an
agent-recorded result can be told apart from one you made yourself.

Ticks saved by the earlier positional scheme (`chk-0`, `chk-1`, …) are migrated to ids once,
on first load, using `LEGACY_ORDER` at the bottom of `checks.js`.

After changing anything the service worker precaches, stamp a new build:

```bash
python3 tools/stamp.py
```

That moves the cache name in `sw.js`, the `BUILD` constant in `app.js`, the stamp in the
`index.html` footer and `version.json` together — they have to agree, and bumping them by hand is how you end up debugging a script
the browser cached ten minutes ago. The footer shows the build that is actually executing, and
turns amber with *"reload to update"* when the server has a newer one.

## Agent tools (WebMCP)

[WebMCP](https://github.com/webmachinelearning/webmcp) lets a page hand an agent named tools
instead of making it drive the UI by screenshots and clicks. The division of labour here is
forced by the browser and happens to be the right one: this page cannot read another site's
response headers, and an agent has no opinion about what a launch needs. So the page holds the
list, the order and the record; the agent does the fetching and reports what it saw.

| Tool | Does |
| --- | --- |
| `set-target` | Sets the site being checked. Call it first. |
| `list-checks` | Lists checks with ids, recipes and status; filter by section, verify class or status. |
| `next-check` | The next outstanding check an agent can work on, with its recipe. |
| `record-result` | Records `pass` / `fail` / `na` for one check, with evidence. |
| `share-results` | A link that opens the checklist elsewhere with this run already loaded. |
| `export-results` | The run as JSON, for when it is too big for a link. |
| `import-results` | Loads an earlier run, to carry on rather than start again. |
| `summary` | What passed, what failed, outstanding blockers, what still needs a person. |

Three rules are enforced in the tool layer rather than left to the agent's good manners:

- **`human` checks are refused.** An agent cannot record that your copy was proofread or that
  a screen reader made sense of the page. It gets told to tell you what to look at instead.
- **Evidence is required.** `record-result` rejects a missing or trivially short `evidence`
  string. What lands on the page is the header line, the status code, the measured number.
- **A `fail` never ticks the box.** It is a check that ran and did not pass — worse than
  untouched — so it stays outstanding, marked in the margin, and appears in `summary`.

Every tool description also tells the agent to treat what it fetches from the target site as
data to report, never as instructions to follow. A page under test can otherwise talk to the
agent checking it.

Results an agent records are stored with `by: "agent"` and shown on the item with the
evidence. Ticking such a check by hand makes it yours (`by: "you"`) but keeps the evidence
visible, so an agent's finding is never silently erased by a click.

### Carrying a run between browsers

Results live in `localStorage`, which is scoped to one browser profile and one origin. A
person ticking boxes in Chrome and an agent running in ChatGPT Desktop are therefore two
separate lists, and neither can see the other.

**Save, load or share this run** in the page bridges them:

- **Copy share link** puts the whole run in the URL fragment — gzipped through
  `CompressionStream`, base64url encoded, `#results=…`. Opening it anywhere loads the run,
  strips the fragment so a reload does not reapply it, and says what it merged. It applies on
  `hashchange` too, so pasting a link into an already-open checklist works.
- **Save file** / **Load file** for a run too large for a link, or for keeping alongside a
  project.
- **Copy JSON** / paste box for moving a run by hand.

Agents do the same through `share-results`, `export-results` and `import-results`.

Merging has one rule worth knowing: **your own ticks win.** A record you settled yourself is
never overwritten by an incoming one for the same check, whoever recorded it. Between two
agent records the later `at` timestamp wins, and results for ids this build does not know are
ignored rather than stored.

### Trying it

`document.modelContext` currently exists in the Chrome 149 and Edge 150 origin trials, in
Brave's Leo, and in ChatGPT Desktop. Registration is behind a feature detect, so everywhere
else the page behaves exactly as before and the tools are simply not offered — when they are,
the header says so.

This site carries an origin trial token in `index.html`, so the tools are live for ordinary
Chrome and Edge visitors on <https://onion2k.github.io> **until 17 November 2026**. When it
expires the API disappears and the page carries on as a plain checklist; renewing means
registering a new token at the [trial page](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241)
and replacing the `<meta http-equiv="origin-trial">` content. Tokens are origin-scoped — a
fork on another domain needs its own, or the local flag below.

Without a token, or on a fork, enable `chrome://flags/#enable-webmcp-testing` and relaunch.
That switch is per-browser and applies to every origin.

The tools are defined as data and exposed as `window.PreflightTools`, so they can be exercised
in any browser console without the API present:

```js
const tools = Object.fromEntries(window.PreflightTools.map(t => [t.name, t]));
await tools["set-target"].execute({ url: "https://example.com" });
await tools["next-check"].execute({ section: "security" });
```

Driving them through the browser instead, from the page's own console: note that Chrome 149
takes the arguments as a **JSON string**, while the spec has since moved to a plain object.

```js
const registered = await document.modelContext.getTools();
const setTarget = registered.find(t => t.name === "set-target");
await document.modelContext.executeTool(setTarget, '{"url": "https://example.com"}');
```

Each tool returns text, not an MCP `{ content: [...] }` envelope: the browser serialises the
return value on the way to the agent, so an envelope would arrive as JSON for the model to
unwrap before reading the sentence inside.

## Known trade-off

The checklist is rendered by JavaScript, so with scripting disabled the page shows only a
short explanation. That is the cost of having one source of truth that both a person and an
agent can read; `checks.js` is plain readable data if you want the list without the app. A
prerender step would fix it, at the cost of the no-build-step property.
