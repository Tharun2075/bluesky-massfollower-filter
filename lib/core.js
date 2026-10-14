// Pure logic shared by the extension and the Node tests. No DOM, no network.
(function (root) {
  const DEFAULTS = { threshold: 5000, enabled: true, allowlist: [] };
  const API = "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles";
  const BATCH = 25; // getProfiles accepts at most 25 actors per call

  function normHandle(h) {
    return String(h || "").trim().replace(/^@/, "").toLowerCase();
  }

  // "/profile/alice.bsky.social/post/3abc" -> "alice.bsky.social"
  function handleFromHref(href) {
    const m = /\/profile\/([^/?#]+)/.exec(String(href || ""));
    return m ? normHandle(decodeURIComponent(m[1])) : null;
  }

  // data-testid="feedItem-by-alice.bsky.social" -> "alice.bsky.social"
  function handleFromTestId(id) {
    const m = /^(?:feedItem|postThreadItem)-by-(.+)$/.exec(String(id || ""));
    return m ? normHandle(m[1]) : null;
  }

  function mergeSettings(stored) {
    const s = Object.assign({}, DEFAULTS, stored || {});
    s.threshold = Math.max(1, parseInt(s.threshold, 10) || DEFAULTS.threshold);
    s.allowlist = (Array.isArray(s.allowlist) ? s.allowlist : String(s.allowlist || "").split(/[\s,]+/))
      .map(normHandle).filter(Boolean);
    return s;
  }

  // Returns { hide: bool, reason: string }
  function decide(profile, settings) {
    const s = mergeSettings(settings);
    if (!s.enabled) return { hide: false, reason: "filter off" };
    if (!profile) return { hide: false, reason: "unknown profile" };
    const handle = normHandle(profile.handle);
    if (s.allowlist.includes(handle)) return { hide: false, reason: "allowlisted" };
    if (profile.viewer && profile.viewer.following) return { hide: false, reason: "you follow them" };
    const n = Number(profile.followsCount) || 0;
    if (n >= s.threshold) return { hide: true, reason: `follows ${n.toLocaleString("en-US")} accounts` };
    return { hide: false, reason: `follows ${n.toLocaleString("en-US")}` };
  }

  function batches(list, size) {
    const uniq = [...new Set(list.map(normHandle).filter(Boolean))];
    const out = [];
    for (let i = 0; i < uniq.length; i += size || BATCH) out.push(uniq.slice(i, i + (size || BATCH)));
    return out;
  }

  function profilesUrl(handles) {
    return API + "?" + handles.map((h) => "actors=" + encodeURIComponent(h)).join("&");
  }

  // Cache of handle -> profile, with a fetcher injected (fetch in browser, stub in tests).
  function createLookup(fetchJson, ttlMs) {
    const cache = new Map();
    const ttl = ttlMs || 6 * 60 * 60 * 1000;
    return async function lookup(handles) {
      const now = Date.now();
      const missing = handles.map(normHandle).filter((h) => {
        const c = cache.get(h);
        return !c || now - c.at > ttl;
      });
      for (const group of batches(missing)) {
        try {
          const data = await fetchJson(profilesUrl(group));
          for (const p of (data && data.profiles) || []) {
            const entry = { at: now, profile: p };
            cache.set(normHandle(p.handle), entry);
            cache.set(p.did, entry);
          }
          // remember misses so we don't hammer the API for deleted/unknown handles
          for (const h of group) if (!cache.has(h)) cache.set(h, { at: now, profile: null });
        } catch (e) {
          // network/API error: leave uncached, never hide on error
        }
      }
      const out = {};
      for (const h of handles.map(normHandle)) out[h] = cache.has(h) ? cache.get(h).profile : null;
      return out;
    };
  }

  const api = { DEFAULTS, BATCH, normHandle, handleFromHref, handleFromTestId, mergeSettings, decide, batches, profilesUrl, createLookup };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SBBCore = api;
})(typeof self !== "undefined" ? self : this);
