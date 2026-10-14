// Real run against the public Bluesky API (read-only, no login). Shows which accounts the
// extension would hide.  Usage:
//   node demo.js followers <handle> [n]   recent followers of an account
//   node demo.js search <query> [n]       accounts matching a search (e.g. "followback")
const C = require("./lib/core.js");
const mode = process.argv[2] || "search";
const target = process.argv[3] || "followback";
const limit = Math.min(Number(process.argv[4]) || 25, 100);
const BASE = "https://public.api.bsky.app/xrpc/";
const getJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });

(async () => {
  const q = encodeURIComponent(target);
  const list = mode === "followers"
    ? (await getJson(`${BASE}app.bsky.graph.getFollowers?actor=${q}&limit=${limit}`)).followers
    : (await getJson(`${BASE}app.bsky.actor.searchActors?q=${q}&limit=${limit}`)).actors;
  const handles = list.map((p) => p.handle).filter((h) => h !== "handle.invalid");
  const profiles = await C.createLookup(getJson)(handles);
  let hidden = 0;
  console.log(`Run at ${new Date().toISOString()} - ${handles.length} accounts (${mode} "${target}"), threshold ${C.DEFAULTS.threshold}\n`);
  for (const h of handles) {
    const d = C.decide(profiles[h]);
    if (d.hide) hidden++;
    console.log(`${d.hide ? "HIDE" : "keep"}  @${h.padEnd(40)} ${d.reason}`);
  }
  console.log(`\n${hidden} of ${handles.length} would be hidden.`);
})().catch((e) => { console.error(e); process.exit(1); });
