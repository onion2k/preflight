# Preflight for Launch

A pre-launch checklist for websites, as an installable, offline-first Progressive Web App.
Twelve sections — content, accessibility (WCAG 2.2 AA), security headers, crawler files,
Lighthouse, error pages, metadata, legal, DNS, monitoring, QA, launch day. Ticks are stored
in `localStorage`, so progress survives a reload and an install.

Live at **https://onion2k.github.io/preflight/**

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole app: markup, styles and behaviour in one file, no build step. |
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

Edit the `<section class="block">` elements in `index.html`. Each item is one
`<li><label class="item">` with a checkbox, a `.task` and an optional `.note`. The section
rail, the progress meter and the scroll-bar markers are all built from the DOM at load, so
adding or removing items needs no other change.

Checkbox state is keyed by index (`chk-0`, `chk-1`, …). Reordering items therefore shuffles
existing saved ticks; bump `KEY` in `index.html` if that matters for a release.

After changing anything the service worker precaches, bump `CACHE` in `sw.js`.
