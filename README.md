# Preflight for Launch

A pre-launch checklist for websites, as an installable, offline-first Progressive Web App.
Twelve sections — content, accessibility (WCAG 2.2 AA), security headers, crawler files,
Lighthouse, error pages, metadata, legal, DNS, monitoring, QA, launch day. Ticks are stored
in `localStorage`, so progress survives a reload and an install.

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

Static hosting, no build. Two things to get right on the host:

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
