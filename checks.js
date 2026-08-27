// The checklist itself. Everything the page renders comes from here: sections, items,
// the tables, the rail, the progress meter and the scroll markers are all built from this
// array at load, so adding a check needs no other change.
//
// Item ids are permanent — they key the saved results, and an agent driving the page
// through WebMCP would address checks by them. Rename one and you orphan people's ticks.
//
// verify says who can settle a check:
//   "agent"  — decidable from the site alone; `recipe` says how
//   "shared" — an agent gathers the evidence, a person makes the call
//   "human"  — judgement, or knowledge that simply isn't on the site
//
// tag is the badge shown against a task: "blocker" for the ones that hurt after launch,
// "ifapp" for conditional items.

const PREFLIGHT_CHECKS = [
  {
    id: "content",
    sig: "01",
    title: "Content and copy",
    intro: "The cheapest bugs to fix now and the most embarrassing ones later. Read the live build, not the CMS preview.",
    items: [
      {
        id: "content.no-placeholder-text",
        task: "No placeholder text anywhere",
        note: "Grep the build output for <code>lorem</code>, <code>TODO</code>, <code>FIXME</code>, <code>example.com</code>, <code>Coming soon</code>, <code>@test</code>, and your own scratch words.",
        tag: { kind: "block", label: "blocker" },
        verify: "agent",
        recipe: "Fetch every page in the sitemap and search the HTML for lorem, TODO, FIXME, example.com, 'Coming soon' and @test."
      },
      {
        id: "content.proofread",
        task: "Every page proofread by a person who did not write it",
        note: "Spelling, grammar, and consistent product naming. Machine spellcheck misses the wrong-word-spelled-right class of error entirely.",
        verify: "human"
      },
      {
        id: "content.facts-verified",
        task: "Facts, prices, dates and names verified against a source",
        note: "Anything numeric, legal, or about a real person. Check copyright years update automatically rather than being hardcoded.",
        verify: "human"
      },
      {
        id: "content.links-resolve",
        task: "Every internal and external link resolves",
        note: "Crawl the built site rather than clicking. Watch for links to staging hosts, localhost, and unpublished drafts.",
        verify: "agent",
        recipe: "Crawl every internal link and confirm a 2xx; request each external link with HEAD."
      },
      {
        id: "content.images",
        task: "Images are the right image, sized and compressed",
        note: "Correct crop at every breakpoint, modern format with a fallback, explicit <code>width</code>/<code>height</code> to stop layout shift, and no 4MB hero.",
        verify: "shared",
        recipe: "Report images over 300kB, images missing width/height, and formats older than WebP or AVIF."
      },
      {
        id: "content.contact-details",
        task: "Contact details, addresses and social handles are current",
        note: "Send a test to every address and phone number that appears on the site. Dead mailboxes lose real enquiries silently.",
        verify: "shared",
        recipe: "Extract every mailto:, tel: and social link so a person can confirm each one is live."
      },
      {
        id: "content.nothing-private",
        task: "Content that must not be public is not published",
        note: "Draft posts, internal notes, client names under embargo, test users, seeded data, source maps and comments left in the markup.",
        verify: "shared",
        recipe: "List every URL in the sitemap and search index, and flag drafts, test users and staging hostnames."
      },
      {
        id: "content.locale",
        task: "Dates, currency, units and language match the audience",
        note: "Including <code>&lt;html lang&gt;</code>, and <code>hreflang</code> if you ship more than one locale.",
        verify: "agent",
        recipe: "Check <html lang>, and hreflang if more than one locale is published."
      },
    ]
  },
  {
    id: "a11y",
    sig: "02",
    title: "Accessibility — WCAG 2.2 AA",
    intro: "Pick the standard explicitly and write it down. WCAG 2.2 Level AA is the usual commitment and what most procurement and legislation (EN 301 549, ADA Title II, the European Accessibility Act) actually reference. Automated tools catch roughly a third of issues; the rest is the manual list below.",
    items: [
      {
        id: "a11y.automated-scan",
        task: "Automated scan clean on every template",
        note: "axe DevTools, Pa11y or Lighthouse across one instance of each layout &mdash; not just the homepage. Zero criticals and serious issues.",
        tag: { kind: "block", label: "blocker" },
        verify: "agent",
        recipe: "Run axe or the Lighthouse accessibility audit on one URL per template; report critical and serious issues."
      },
      {
        id: "a11y.keyboard",
        task: "Whole site operable by keyboard alone",
        note: "Tab through every page. Focus order follows reading order, focus is always visible (2.4.11/2.4.13), nothing traps focus, and modals return focus on close.",
        verify: "human"
      },
      {
        id: "a11y.screen-reader",
        task: "Tested with a real screen reader",
        note: "VoiceOver + Safari and NVDA + Firefox as a baseline. Listen to a form submission and an error state end to end.",
        verify: "human"
      },
      {
        id: "a11y.contrast",
        task: "Colour contrast passes AA",
        note: "4.5:1 for body text, 3:1 for large text and for UI components and focus indicators (1.4.11). Check both themes and hover/disabled states.",
        verify: "agent",
        recipe: "Run an automated contrast audit in both colour schemes, including hover and disabled states."
      },
      {
        id: "a11y.semantics",
        task: "Semantic structure and landmarks",
        note: "One <code>h1</code> per page, no skipped heading levels, real <code>&lt;nav&gt;</code>/<code>&lt;main&gt;</code>/<code>&lt;footer&gt;</code>, a skip link, and list markup for lists.",
        verify: "agent",
        recipe: "Check for one h1 per page, no skipped heading levels, nav/main/footer landmarks and a skip link."
      },
      {
        id: "a11y.alt-text",
        task: "Images, icons and media described",
        note: "Meaningful <code>alt</code>, empty <code>alt=\"\"</code> for decoration, accessible names on icon-only buttons, captions and transcripts for video and audio.",
        verify: "shared",
        recipe: "List images with no alt and icon-only buttons with no accessible name; a person judges whether the text is meaningful."
      },
      {
        id: "a11y.forms",
        task: "Forms labelled, and errors explain the fix",
        note: "Every control has a visible label, errors are announced and text-based (not colour alone), and required/format hints appear before submission.",
        verify: "shared",
        recipe: "Report controls with no associated label, and errors conveyed by colour alone."
      },
      {
        id: "a11y.zoom-reflow",
        task: "Zoom, reflow and motion",
        note: "200% zoom and a 320px viewport with no horizontal scroll or clipped content; <code>prefers-reduced-motion</code> honoured; nothing autoplays with sound.",
        verify: "agent",
        recipe: "Load at a 320px viewport and at 200% zoom; report horizontal overflow and clipped content."
      },
      {
        id: "a11y.statement",
        task: "Accessibility statement published",
        note: "Named standard, known gaps, contact route for problems, and the date last reviewed. Legally required for public sector bodies in the UK and EU.",
        tag: { kind: "ifapp", label: "if required" },
        verify: "human"
      },
    ]
  },
  {
    id: "security",
    sig: "03",
    title: "Security headers and hardening",
    intro: "Set these at the edge (host config, CDN, or <code>netlify.toml</code>/<code>_headers</code>) rather than in markup &mdash; several of them are ignored when they arrive in a <code>&lt;meta&gt;</code> tag. Verify against the live response, not the config file.",
    items: [
      {
        id: "security.csp",
        task: "Content-Security-Policy in enforcing mode",
        note: "No <code>unsafe-inline</code> for scripts &mdash; use nonces or hashes. Include <code>object-src 'none'</code>, <code>base-uri 'self'</code>, <code>frame-ancestors</code>, and a <code>report-uri</code>/<code>report-to</code> endpoint you actually watch. Ship in report-only first, then flip.",
        tag: { kind: "block", label: "blocker" },
        verify: "agent",
        recipe: "Parse content-security-policy: reject unsafe-inline in script-src, require object-src 'none', base-uri and frame-ancestors."
      },
      {
        id: "security.hsts",
        task: "HSTS with a long max-age",
        note: "<code>max-age=31536000; includeSubDomains</code>, plus <code>preload</code> once you are sure every subdomain is HTTPS-only &mdash; preload is slow to undo.",
        verify: "agent",
        recipe: "Check strict-transport-security carries a max-age of at least 31536000."
      },
      {
        id: "security.header-set",
        task: "The rest of the header set",
        note: "<code>X-Content-Type-Options: nosniff</code>, <code>Referrer-Policy: strict-origin-when-cross-origin</code>, <code>Permissions-Policy</code> denying camera/mic/geolocation you don't use, <code>Cross-Origin-Opener-Policy: same-origin</code>.",
        verify: "agent",
        recipe: "Check for x-content-type-options, referrer-policy, permissions-policy and cross-origin-opener-policy."
      },
      {
        id: "security.tls",
        task: "TLS correct and renewing automatically",
        note: "Valid chain, TLS 1.2+, HTTP redirects to HTTPS, no mixed content, and a calendar reminder before expiry even with auto-renewal. Grade it with SSL Labs.",
        verify: "agent",
        recipe: "Check the certificate chain and expiry, the negotiated TLS version, and that http:// redirects to https://."
      },
      {
        id: "security.secrets",
        task: "Secrets are not in the bundle or the repo",
        note: "Search the built output for keys and tokens. Rotate anything that was ever committed &mdash; history is public the moment the repo is.",
        tag: { kind: "block", label: "blocker" },
        verify: "shared",
        recipe: "Search the built JavaScript and the public repo for key-shaped strings; a person confirms and rotates."
      },
      {
        id: "security.third-party-scripts",
        task: "Third-party scripts justified and pinned",
        note: "Every embed is a supply chain. Use <code>integrity</code> hashes where you can, self-host where you can't, and delete the ones nobody asked for.",
        verify: "shared",
        recipe: "List every external script and frame origin, and whether each carries an integrity hash."
      },
      {
        id: "security.cookies",
        task: "Cookies and sessions configured",
        note: "<code>Secure</code>, <code>HttpOnly</code>, <code>SameSite</code>; sensible expiry; CSRF protection on state-changing requests.",
        tag: { kind: "ifapp", label: "if applicable" },
        verify: "agent",
        recipe: "Inspect every Set-Cookie for Secure, HttpOnly and SameSite."
      },
      {
        id: "security.admin-staging",
        task: "Admin and staging not reachable",
        note: "Staging behind auth and <code>noindex</code>, default credentials changed, directory listing off, dependency audit clean, rate limiting on forms and login.",
        verify: "shared",
        recipe: "Try likely staging hostnames and common admin paths; report anything reachable without auth."
      },
      {
        id: "security.server-banner",
        task: "Server does not advertise its version",
        note: "Trim <code>Server</code>, <code>X-Powered-By</code> and framework banners. Free information for anyone scanning.",
        verify: "agent",
        recipe: "Check the response for server, x-powered-by and framework banner headers."
      },
    ]
  },
  {
    id: "files",
    sig: "04",
    title: "Files crawlers and agents look for",
    intro: "All served from the domain root with the right content type. Request each one from the production URL &mdash; a redirect or an HTML 404 body counts as broken.",
    table: {
      columns: ["File", "Why it matters"],
      rows: [
        ["/robots.txt", "Must not still say <code>Disallow: /</code> from staging. Point it at your sitemap. Decide, deliberately, which AI crawlers you allow."],
        ["/sitemap.xml", "Canonical URLs only, no redirects or noindexed pages, correct <code>lastmod</code>. Split by index file above 50k URLs."],
        ["/llms.txt", "A Markdown map of the site for language models: what it is, and links to the pages worth reading. Optional, cheap, increasingly expected."],
        ["/.well-known/security.txt", "How to report a vulnerability, with an <code>Expires</code> field. Prevents researchers guessing at your Twitter DMs."],
        ["/favicon.ico", "Plus SVG icon, apple-touch-icon and a web manifest with the right theme colours if you want an installable app."],
        ["/humans.txt", "Credit the people who built it. Entirely optional, still nice."],
        ["/ads.txt", "Only if you sell advertising. Wrong or stale entries cost revenue."],
        ["/feed.xml", "RSS or Atom if you publish anything serially. Validate it, and link it from <code>&lt;head&gt;</code>."],
      ]
    },
    items: [
      {
        id: "files.files-present",
        task: "Each of the files above is present or consciously skipped",
        note: "Especially <code>robots.txt</code> &mdash; a staging disallow shipped to production is the single most common launch mistake.",
        tag: { kind: "block", label: "blocker" },
        verify: "agent",
        recipe: "Request /robots.txt, /sitemap.xml, /llms.txt, /.well-known/security.txt and /favicon.ico; check status, content type, and that robots.txt does not disallow everything."
      },
      {
        id: "files.no-accidental-noindex",
        task: "No page is accidentally <code>noindex</code>",
        note: "Check both the meta tag and the <code>X-Robots-Tag</code> header on the live response.",
        verify: "agent",
        recipe: "Check the robots meta tag and the x-robots-tag header on every page in the sitemap."
      },
    ]
  },
  {
    id: "perf",
    sig: "05",
    title: "Performance and Lighthouse",
    intro: "Run against the production build on a throttled mobile profile, three times, and take the median &mdash; a single local run flatters you. Set a target and treat it as a gate, not a score to admire.",
    items: [
      {
        id: "perf.lighthouse",
        task: "Lighthouse &ge; 90 on all four categories for key templates",
        note: "Performance, Accessibility, Best Practices, SEO. Home, a content page, and any conversion page at minimum.",
        verify: "agent",
        recipe: "Run Lighthouse under mobile throttling three times per key template; take the median of all four categories."
      },
      {
        id: "perf.core-web-vitals",
        task: "Core Web Vitals inside the good thresholds",
        note: "LCP under 2.5s, INP under 200ms, CLS under 0.1. Lab numbers first; switch to field data from CrUX once traffic arrives.",
        verify: "agent",
        recipe: "Read LCP, INP and CLS from the Lighthouse run, or from CrUX field data if the site has traffic."
      },
      {
        id: "perf.caching",
        task: "Caching and compression on at the edge",
        note: "Brotli or gzip, long <code>Cache-Control</code> with hashed filenames for static assets, short or revalidated for HTML, CDN in front.",
        verify: "agent",
        recipe: "Check content-encoding and cache-control on the HTML and on a hashed static asset."
      },
      {
        id: "perf.request-chain",
        task: "The critical request chain is short",
        note: "Fonts preloaded and <code>font-display: swap</code>, no render-blocking third parties, JavaScript deferred, above-the-fold CSS inline if it helps.",
        verify: "shared",
        recipe: "Report render-blocking requests, unpreloaded fonts and third-party scripts in the head."
      },
      {
        id: "perf.page-weight",
        task: "Page weight is defensible on a slow connection",
        note: "Load it once on real 3G or a throttled profile. If you would not wait, neither will anyone else.",
        verify: "agent",
        recipe: "Total transferred bytes for a cold load of the homepage."
      },
      {
        id: "perf.budget",
        task: "A performance budget is recorded in CI",
        note: "Lighthouse CI or bundle-size limits, so the next change has to argue with a number rather than a memory.",
        tag: { kind: "ifapp", label: "if applicable" },
        verify: "human"
      },
    ]
  },
  {
    id: "errors",
    sig: "06",
    title: "Error and edge-case pages",
    intro: "Each needs the correct status code as well as a designed page. A pretty 404 served with a 200 pollutes search indexes and hides broken links from every tool you own.",
    table: {
      columns: ["Status", "Needs"],
      rows: [
        ["404", "Site navigation, search, and a link home. Must return <code>404</code>. Test a deep nonsense URL, not just <code>/404</code>."],
        ["500", "A static page that renders when the app is down &mdash; no database, no API, no build step."],
        ["403 / 401", "If anything is gated: explain whether to sign in, request access, or give up."],
        ["410", "For content deliberately removed, so crawlers drop it instead of retrying."],
        ["503", "Maintenance page with <code>Retry-After</code>, used during planned downtime."],
        ["Offline", "If you register a service worker &mdash; and check the worker's update path before launch, not after."],
      ]
    },
    items: [
      {
        id: "errors.status-codes",
        task: "Status codes verified with <code>curl -I</code> on production",
        tag: { kind: "block", label: "blocker" },
        verify: "agent",
        recipe: "Request a deep nonsense URL and confirm a 404; check the 500, 403, 410 and 503 handlers where they exist."
      },
      {
        id: "errors.styled-error-pages",
        task: "Error pages are styled, and work when the CDN is the thing failing",
        note: "Inline the CSS on the 500 page. A stylesheet request that also fails leaves an unstyled apology.",
        verify: "shared",
        recipe: "Fetch the 404 page and check it carries inline styles and site navigation."
      },
      {
        id: "errors.error-logging",
        task: "Errors are logged and someone is alerted",
        note: "Client-side error tracking as well as server logs, with a threshold that reaches a human.",
        verify: "human"
      },
    ]
  },
  {
    id: "seo",
    sig: "07",
    title: "Metadata, SEO and sharing",
    intro: "Everything here is per-page, not per-site. Templates that emit a single shared description are the usual failure.",
    items: [
      {
        id: "seo.titles-descriptions",
        task: "Unique title and meta description on every page",
        note: "Roughly 55 and 155 characters. Check for duplicates across the whole crawl.",
        verify: "agent",
        recipe: "Crawl the sitemap and report duplicate, missing or over-length titles and meta descriptions."
      },
      {
        id: "seo.canonicals",
        task: "Canonical URLs are absolute and self-consistent",
        note: "One host wins &mdash; www or apex, not both &mdash; with 301s from the other. Trailing slashes consistent.",
        verify: "agent",
        recipe: "Check each canonical is absolute and self-referential, and that one of www/apex 301s to the other."
      },
      {
        id: "seo.social-cards",
        task: "Open Graph and Twitter cards render",
        note: "Absolute image URL, 1200&times;630, under 5MB, with a title and description. Test in a real card validator, not by eye.",
        verify: "agent",
        recipe: "Check og:title, og:description, and an absolute og:image that returns 200."
      },
      {
        id: "seo.structured-data",
        task: "Structured data validates",
        note: "Organization, Article, Product or BreadcrumbList through the Rich Results Test.",
        tag: { kind: "ifapp", label: "if applicable" },
        verify: "agent",
        recipe: "Validate the page's JSON-LD against its schema.org types."
      },
      {
        id: "seo.redirects",
        task: "Redirects from the old site are mapped",
        note: "301 every URL that had traffic or a backlink. Losing them is losing years of accumulated ranking.",
        tag: { kind: "ifapp", label: "on a relaunch" },
        verify: "shared",
        recipe: "Request the old site's top URLs and confirm each 301s to a live equivalent."
      },
      {
        id: "seo.search-console",
        task: "Search Console and Bing Webmaster Tools verified",
        note: "Submit the sitemap, then check the coverage report a week later.",
        verify: "human"
      },
    ]
  },
  {
    id: "legal",
    sig: "08",
    title: "Legal, licensing and policy",
    intro: "Boring, quick, and the part that generates letters when it is missing.",
    items: [
      {
        id: "legal.licence",
        task: "Licence stated for content and for code",
        note: "They are usually different &mdash; for example CC BY-SA for writing, MIT for the source. Say it in the footer, in <code>LICENSE</code>, and in the repo.",
        verify: "shared",
        recipe: "Look for a licence statement in the footer and a LICENSE file in the repository."
      },
      {
        id: "legal.privacy-policy",
        task: "Privacy policy matches what you actually collect",
        note: "Name the analytics, the embeds, the mailing list, the legal basis, and the retention period. A template policy that lists tools you don't use is worse than none.",
        tag: { kind: "block", label: "blocker" },
        verify: "shared",
        recipe: "List the third-party origins the site actually contacts, and compare them with what the policy names."
      },
      {
        id: "legal.cookie-consent",
        task: "Cookie consent gates non-essential cookies before they are set",
        note: "If you set none, say so and skip the banner. Reject must be as easy as accept.",
        verify: "shared",
        recipe: "Load with a fresh profile and report any cookie set before consent is given."
      },
      {
        id: "legal.terms",
        task: "Terms of service, and any required company details",
        note: "In the UK and EU, registered company number, address and VAT number where they apply.",
        verify: "human"
      },
      {
        id: "legal.asset-rights",
        task: "You have the rights to every image, font and icon",
        note: "Keep the licences and receipts somewhere findable. Web fonts in particular are licensed by pageview more often than people expect.",
        verify: "human"
      },
      {
        id: "legal.attributions",
        task: "Third-party attributions where the licence demands them",
        note: "Map tiles, open source components, photography credits.",
        verify: "human"
      },
    ]
  },
  {
    id: "infra",
    sig: "09",
    title: "Domain, DNS and delivery",
    intro: "Do the DNS work before launch day: TTLs and propagation mean these are the changes you cannot rush.",
    items: [
      {
        id: "infra.registration",
        task: "Domain registration and auto-renew confirmed",
        note: "Owned by the organisation, not by a contractor's personal account. Registrar lock on, contact address monitored.",
        tag: { kind: "block", label: "blocker" },
        verify: "shared",
        recipe: "Check WHOIS for the expiry date and whether the registrar lock is on."
      },
      {
        id: "infra.dns",
        task: "DNS records complete, TTLs lowered before cutover",
        note: "Apex and www, CAA restricting who may issue certificates, and a plan to raise TTLs again once it is stable.",
        verify: "shared",
        recipe: "Resolve the apex and www, and check for a CAA record."
      },
      {
        id: "infra.email-auth",
        task: "Email authentication set up",
        note: "SPF, DKIM and DMARC &mdash; including on a domain that only sends transactional mail, or your forms land in spam.",
        tag: { kind: "ifapp", label: "if the domain sends mail" },
        verify: "agent",
        recipe: "Query TXT records for SPF and DMARC, and the DKIM selector."
      },
      {
        id: "infra.forms-tested",
        task: "Forms and transactional email tested end to end",
        note: "Submit each form on production. Confirm delivery, the reply-to address, spam filtering, validation errors and the thank-you state.",
        verify: "human"
      },
      {
        id: "infra.backups",
        task: "Backups exist and a restore has been tried",
        note: "An untested backup is a hypothesis. Restore into a scratch environment once.",
        verify: "human"
      },
      {
        id: "infra.rollback",
        task: "Rollback path documented and timed",
        note: "Whoever is on call should know how to revert without reading the deploy tool's docs first.",
        verify: "human"
      },
    ]
  },
  {
    id: "ops",
    sig: "10",
    title: "Measurement and monitoring",
    intro: "Set up before launch, so the first day's traffic is data rather than anecdote.",
    items: [
      {
        id: "ops.analytics",
        task: "Analytics installed, firing, and privacy-appropriate",
        note: "Verify events in real time on production. Exclude internal traffic. Prefer a tool that doesn't require a consent banner if you can.",
        verify: "shared",
        recipe: "Check whether an analytics request fires on a page view, and to which origin."
      },
      {
        id: "ops.uptime",
        task: "Uptime monitoring with alerts that reach a person",
        note: "External check, more than one region, alerting somewhere you'll see at the weekend. Add a certificate-expiry check.",
        verify: "human"
      },
      {
        id: "ops.error-tracking",
        task: "Error tracking wired to the release",
        note: "Source maps uploaded privately, releases tagged, so a spike points at a commit.",
        verify: "human"
      },
      {
        id: "ops.goals",
        task: "Conversion or goal tracking defined",
        note: "Decide what success looks like now; retrofitting it loses the launch week.",
        tag: { kind: "ifapp", label: "if applicable" },
        verify: "human"
      },
    ]
  },
  {
    id: "qa",
    sig: "11",
    title: "Cross-device QA and the last look",
    intro: "On real devices where you can. Emulators hide touch targets, notches, keyboard behaviour and font rendering.",
    items: [
      {
        id: "qa.browsers",
        task: "Chrome, Safari, Firefox and Edge, desktop and mobile",
        note: "Include an older Safari &mdash; iOS users update at their own pace.",
        verify: "human"
      },
      {
        id: "qa.viewports",
        task: "320px to ultrawide, portrait and landscape",
        note: "No horizontal scroll, no clipped text, tap targets at least 24&times;24 CSS pixels with spacing.",
        verify: "agent",
        recipe: "Load at 320, 768, 1280 and 2560 wide and report horizontal overflow or clipped content."
      },
      {
        id: "qa.dark-mode",
        task: "Dark mode, high contrast, and forced colours",
        note: "If you ship a theme toggle, check the un-toggled system default too.",
        verify: "shared",
        recipe: "Render with prefers-color-scheme: dark and with forced-colors active, and compare."
      },
      {
        id: "qa.print",
        task: "Print stylesheet",
        note: "Invoices, recipes, tickets, documentation. Cheap to add, obvious when missing.",
        tag: { kind: "ifapp", label: "if pages get printed" },
        verify: "agent",
        recipe: "Check for an @media print block or a print stylesheet."
      },
      {
        id: "qa.no-js",
        task: "JavaScript disabled or failed: the page still says something",
        note: "At least core content and navigation. Also try with an aggressive ad blocker.",
        verify: "agent",
        recipe: "Load with JavaScript disabled and report whether the main content and navigation are still present."
      },
      {
        id: "qa.walkthrough",
        task: "Someone outside the project does a five-minute walkthrough",
        note: "Give them a task, watch silently, write down where they hesitate. This finds more than the rest of the section.",
        verify: "human"
      },
    ]
  },
  {
    id: "day",
    sig: "12",
    title: "Launch day and the week after",
    intro: "The checks that only make sense once the site is actually public.",
    items: [
      {
        id: "day.clean-build",
        task: "Deploy from a clean, tagged build off the main branch",
        note: "Not from a laptop with uncommitted changes. Confirm the deployed commit hash matches what you reviewed.",
        verify: "human"
      },
      {
        id: "day.rerun-checks",
        task: "Re-run the automated checks against production",
        note: "Headers, status codes, Lighthouse, link crawl. Configuration differs between environments more often than anyone expects.",
        verify: "shared",
        recipe: "Re-run every agent-checkable item in this list against the production URL."
      },
      {
        id: "day.purge-caches",
        task: "Purge caches and confirm a cold visitor sees the new site",
        note: "CDN cache, service worker, and a private window from a different network.",
        verify: "shared",
        recipe: "Request the homepage with a cache-busting query and compare it with a normal request."
      },
      {
        id: "day.timing",
        task: "Not launching into a Friday evening",
        note: "Whoever can fix it should be awake and available for the next few hours.",
        verify: "human"
      },
      {
        id: "day.watch-404s",
        task: "Watch errors, logs and 404s for the first week",
        note: "Real 404s tell you which redirects you missed. Fix them while the traffic still exists.",
        verify: "human"
      },
      {
        id: "day.review-date",
        task: "Diary a review date",
        note: "Thirty days out: revisit analytics, accessibility, dependency updates and the things you agreed to defer.",
        verify: "human"
      },
    ]
  },
];

// The v1 storage keyed ticks by DOM position (chk-0, chk-1, …), so any reordering
// silently moved them. This is that order, once, to migrate the saved ticks to ids.
const LEGACY_ORDER = [
  "content.no-placeholder-text", "content.proofread", "content.facts-verified",
  "content.links-resolve", "content.images", "content.contact-details",
  "content.nothing-private", "content.locale", "a11y.automated-scan",
  "a11y.keyboard", "a11y.screen-reader", "a11y.contrast",
  "a11y.semantics", "a11y.alt-text", "a11y.forms",
  "a11y.zoom-reflow", "a11y.statement", "security.csp",
  "security.hsts", "security.header-set", "security.tls",
  "security.secrets", "security.third-party-scripts", "security.cookies",
  "security.admin-staging", "security.server-banner", "files.files-present",
  "files.no-accidental-noindex", "perf.lighthouse", "perf.core-web-vitals",
  "perf.caching", "perf.request-chain", "perf.page-weight",
  "perf.budget", "errors.status-codes", "errors.styled-error-pages",
  "errors.error-logging", "seo.titles-descriptions", "seo.canonicals",
  "seo.social-cards", "seo.structured-data", "seo.redirects",
  "seo.search-console", "legal.licence", "legal.privacy-policy",
  "legal.cookie-consent", "legal.terms", "legal.asset-rights",
  "legal.attributions", "infra.registration", "infra.dns",
  "infra.email-auth", "infra.forms-tested", "infra.backups",
  "infra.rollback", "ops.analytics", "ops.uptime",
  "ops.error-tracking", "ops.goals", "qa.browsers",
  "qa.viewports", "qa.dark-mode", "qa.print",
  "qa.no-js", "qa.walkthrough", "day.clean-build",
  "day.rerun-checks", "day.purge-caches", "day.timing",
  "day.watch-404s", "day.review-date",
];

if (typeof window !== "undefined") {
  window.PREFLIGHT_CHECKS = PREFLIGHT_CHECKS;
  window.PREFLIGHT_LEGACY_ORDER = LEGACY_ORDER;
}
