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
| `checks.js` | The checklist as data — 12 sections, 71 items, each with a permanent id. |
| `app.js` | Renders the checklist from that data and stores results. |
| `pwa.js` | Install prompt, update prompt, online/offline status. |
| `manifest.webmanifest` | Name, icons, `standalone` display, theme colours, section shortcuts. |
| `sw.js` | Service worker. Network-first for navigations, cache-first for local assets, stale-while-revalidate for webfonts. |
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

Pages serves everything with `Cache-Control: max-age=600` and does not let you change it, so
a new version can take up to ten minutes to reach someone who already has the app open. That
is inside the 24-hour limit above which browsers bypass the HTTP cache for service worker
update checks, so updates do arrive — just not instantly.

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
| `agent` | Decidable from the site alone. `recipe` says how. | 28 |
| `shared` | An agent gathers the evidence, a person makes the call. | 20 |
| `human` | Judgement, or knowledge that isn't on the site. | 23 |

**Agent-checkable only** filters to the 48 non-human checks and reveals each recipe. That
split is what a future WebMCP integration would drive: the page holds the list, the order and
the record; the agent does the fetching and reports evidence back.

Ids are permanent. They key the saved results, and renaming one orphans anyone's existing
tick — results are stored in `localStorage` under `preflight-results-v2` as
`{ "security.csp": { "status": "done", "by": "you" } }`. The `by` field exists so an
agent-recorded result can be told apart from one you made yourself.

Ticks saved by the earlier positional scheme (`chk-0`, `chk-1`, …) are migrated to ids once,
on first load, using `LEGACY_ORDER` at the bottom of `checks.js`.

After changing anything the service worker precaches, bump `CACHE` in `sw.js`.

## Known trade-off

The checklist is rendered by JavaScript, so with scripting disabled the page shows only a
short explanation. That is the cost of having one source of truth that both a person and an
agent can read; `checks.js` is plain readable data if you want the list without the app. A
prerender step would fix it, at the cost of the no-build-step property.
