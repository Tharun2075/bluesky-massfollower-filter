// Runs on bsky.app. Finds posts, looks up each author's follow count, collapses mass-followers.
(function () {
  const C = self.SBBCore;
  const lookup = C.createLookup((url) => fetch(url).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }));
  let settings = C.mergeSettings();
  const SEL = '[data-testid^="feedItem-by-"], [data-testid^="postThreadItem-by-"]';

  function authorOf(el) {
    return C.handleFromTestId(el.getAttribute("data-testid"));
  }

  function collapse(el, handle, reason) {
    if (el.dataset.sbbHidden === "1") return;
    el.dataset.sbbHidden = "1";
    const bar = document.createElement("div");
    bar.className = "sbb-bar";
    bar.textContent = `Hidden: @${handle} ${reason}. `;
    const btn = document.createElement("button");
    btn.textContent = "Show";
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove("sbb-hidden"); bar.remove(); el.dataset.sbbHidden = "shown";
    });
    bar.appendChild(btn);
    el.classList.add("sbb-hidden");
    el.parentNode.insertBefore(bar, el);
  }

  function restoreAll() {
    document.querySelectorAll(".sbb-bar").forEach((b) => b.remove());
    document.querySelectorAll(".sbb-hidden").forEach((e) => e.classList.remove("sbb-hidden"));
    document.querySelectorAll("[data-sbb-checked]").forEach((e) => { delete e.dataset.sbbChecked; delete e.dataset.sbbHidden; });
  }

  let pending = false;
  async function scan() {
    pending = false;
    if (!settings.enabled) return;
    const els = [...document.querySelectorAll(SEL)].filter((e) => !e.dataset.sbbChecked);
    if (!els.length) return;
    els.forEach((e) => (e.dataset.sbbChecked = "1"));
    const profiles = await lookup(els.map(authorOf).filter(Boolean));
    for (const el of els) {
      const h = authorOf(el);
      const d = C.decide(profiles[h], settings);
      if (d.hide) collapse(el, h, d.reason);
    }
  }
  function schedule() { if (!pending) { pending = true; setTimeout(scan, 300); } }

  chrome.storage.sync.get(C.DEFAULTS, (s) => { settings = C.mergeSettings(s); schedule(); });
  chrome.storage.onChanged.addListener(() => {
    chrome.storage.sync.get(C.DEFAULTS, (s) => { settings = C.mergeSettings(s); restoreAll(); schedule(); });
  });
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
