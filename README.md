# Bluesky Mass-Follower Filter (social-bot-block)

A Chrome/Edge/Brave browser extension (Manifest V3, no build step) for **bsky.app**. It finds the
author of every post in your feed and threads, checks how many accounts they follow using the
public Bluesky API, and **collapses posts from accounts that follow 5,000 or more users**. Each hidden
post leaves a one-line bar ("Hidden: @x follows 20,064 accounts. Show") so you can still open it.

## Who it is for
- "We need a tool that autoblock 'follow back libs' … people that follow 5 thousand accounts. It's bot
  behaviour" ([post](https://bsky.app/profile/caioalmendra.bsky.social/post/3mvupko2po22z)): this
  extension removes those accounts from your view automatically, with 5,000 as the default threshold.

## Run it
1. Chrome → `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick this folder.
2. Open https://bsky.app. Posts by mass-followers collapse after about half a second.
3. Click the extension icon to change the threshold, turn the filter off, or add handles that
   should never be hidden (allowlist).

No login, no API key, no account. The only network calls go to `public.api.bsky.app` (read-only
`app.bsky.actor.getProfiles`, 25 handles per call, cached for 6 hours).

## Tests
```
node --test test/        # or: npm test   (Node 18+, no dependencies)
```

## Proof
- `docs/demo.txt`: real run against the live public API (`node demo.js search followback 25` and
  `node demo.js followers bsky.app 20`), showing which accounts would be hidden and why.
- `docs/screenshot.png`: the real `content.js` + `content.css` running on `docs/fixture.html` (a page
  using bsky.app's own `data-testid="feedItem-by-<handle>"` markers) against the live API. Made with
  `python3 tools/screenshot.py file://$PWD/docs/fixture.html docs/screenshot.png` (needs Playwright).

## Decisions (made headless, no one to ask)
- **Hide, not block.** A real Bluesky block writes a record to your account, which needs your login or
  an app password. v1 stays login-free and hides posts on your screen only. Real blocking (or exporting
  the hits into a moderation list) is the obvious next step.
- **Accounts you follow are never hidden**, nor are allowlisted handles. Default threshold is 5,000
  and counts *equal* to it are hidden.
- **On any API error nothing is hidden** (fail open).
- Plain JS, no bundler; the pure logic lives in `lib/core.js` and is shared by the extension and tests.

## Known limits
- Relies on bsky.app's `data-testid="feedItem-by-…"` / `postThreadItem-by-…` attributes; if Bluesky
  renames them, detection stops (nothing breaks, posts just stay visible).
- Not tested by loading the unpacked extension into a live, logged-in bsky.app session; tested via the
  fixture page above and unit tests. The "you follow them" exemption needs `viewer` data, which the
  public unauthenticated API does not return, so in practice only the allowlist protects friends.
- Only posts are filtered; replies inside notifications, search results and follower lists are not.
- Chrome-family only (uses `chrome.*`); Firefox would need small manifest changes.
- Follow count is one signal; some real people follow many accounts. Use the allowlist.
