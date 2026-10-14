const test = require("node:test");
const assert = require("node:assert");
const C = require("../lib/core.js");

test("handle parsing", () => {
  assert.strictEqual(C.handleFromHref("/profile/Alice.bsky.social/post/3abc"), "alice.bsky.social");
  assert.strictEqual(C.handleFromHref("https://bsky.app/profile/did:plc:xyz"), "did:plc:xyz");
  assert.strictEqual(C.handleFromHref("/search?q=x"), null);
  assert.strictEqual(C.handleFromTestId("feedItem-by-bob.com"), "bob.com");
  assert.strictEqual(C.handleFromTestId("postThreadItem-by-carol.bsky.social"), "carol.bsky.social");
  assert.strictEqual(C.handleFromTestId("composeBtn"), null);
});

test("decide: threshold is inclusive at 5000", () => {
  assert.strictEqual(C.decide({ handle: "a", followsCount: 5000 }).hide, true);
  assert.strictEqual(C.decide({ handle: "a", followsCount: 4999 }).hide, false);
  assert.match(C.decide({ handle: "a", followsCount: 7312 }).reason, /7,312/);
});

test("decide: custom threshold, allowlist, followed accounts, off switch, unknown", () => {
  assert.strictEqual(C.decide({ handle: "a", followsCount: 1500 }, { threshold: 1000 }).hide, true);
  assert.strictEqual(C.decide({ handle: "Friend.bsky.social", followsCount: 9000 }, { allowlist: "@friend.bsky.social, x" }).hide, false);
  assert.strictEqual(C.decide({ handle: "a", followsCount: 9000, viewer: { following: "at://x" } }).hide, false);
  assert.strictEqual(C.decide({ handle: "a", followsCount: 9000 }, { enabled: false }).hide, false);
  assert.strictEqual(C.decide(null).hide, false);
});

test("mergeSettings sanitises bad input", () => {
  const s = C.mergeSettings({ threshold: "abc", allowlist: "a b,,c" });
  assert.strictEqual(s.threshold, 5000);
  assert.deepStrictEqual(s.allowlist, ["a", "b", "c"]);
});

test("batches dedupe and split at 25", () => {
  const list = Array.from({ length: 60 }, (_, i) => "u" + (i % 30));
  const b = C.batches(list);
  assert.deepStrictEqual(b.map((x) => x.length), [25, 5]);
  assert.match(C.profilesUrl(["a.b", "c"]), /actors=a\.b&actors=c$/);
});

test("lookup caches, batches and survives API errors", async () => {
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    const actors = new URL(url).searchParams.getAll("actors");
    return { profiles: actors.filter((a) => a !== "gone").map((a) => ({ handle: a, did: "did:" + a, followsCount: a.length * 1000 })) };
  };
  const lookup = C.createLookup(fake);
  const r1 = await lookup(["abcdef", "ab", "gone"]);
  assert.strictEqual(r1.abcdef.followsCount, 6000);
  assert.strictEqual(r1.gone, null);
  await lookup(["abcdef", "gone"]);
  assert.strictEqual(calls.length, 1, "second call served from cache");

  const broken = C.createLookup(async () => { throw new Error("429"); });
  const r2 = await broken(["x"]);
  assert.strictEqual(r2.x, null);
  assert.strictEqual(C.decide(r2.x).hide, false, "never hide on error");
});
