// checks.js is the source of truth, but a JS file is an awkward thing to hand an AI.
// This writes the same data as checks.json, so an assistant can fetch one URL and read it.
// Run by tools/stamp.py; never edit checks.json by hand.
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("checks.js", "utf8");
const module = source + "\nexport { PREFLIGHT_CHECKS };";
writeFileSync("/tmp/preflight-checks.mjs", module);

const { PREFLIGHT_CHECKS } = await import("/tmp/preflight-checks.mjs?" + Date.now());

const out = {
  what: "Pre-launch checklist for a website. Each item is one thing to verify before going live.",
  guide: "https://onion2k.github.io/preflight/guide.html",
  verify: {
    agent: "Decidable from the site alone. Follow the recipe and record the result.",
    shared: "Gather the evidence; a person makes the final call.",
    human: "Needs a person. Do not record a result for these."
  },
  sections: PREFLIGHT_CHECKS.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.items.map((item) => ({
      id: item.id,
      task: item.task.replace(/<[^>]+>/g, ""),
      note: item.note ? item.note.replace(/<[^>]+>/g, "") : undefined,
      blocker: item.tag && item.tag.kind === "block" ? true : undefined,
      verify: item.verify,
      recipe: item.recipe
    }))
  }))
};

writeFileSync("checks.json", JSON.stringify(out, null, 1) + "\n");
const count = out.sections.reduce((n, s) => n + s.items.length, 0);
console.log(`checks.json: ${out.sections.length} sections, ${count} items`);
