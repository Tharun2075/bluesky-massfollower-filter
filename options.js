const C = self.SBBCore;
const $ = (id) => document.getElementById(id);
chrome.storage.sync.get(C.DEFAULTS, (raw) => {
  const s = C.mergeSettings(raw);
  $("enabled").checked = s.enabled;
  $("threshold").value = s.threshold;
  $("allowlist").value = s.allowlist.join("\n");
});
$("save").addEventListener("click", () => {
  const s = C.mergeSettings({ enabled: $("enabled").checked, threshold: $("threshold").value, allowlist: $("allowlist").value });
  chrome.storage.sync.set(s, () => { $("saved").textContent = "Saved"; setTimeout(() => ($("saved").textContent = ""), 1500); });
});
