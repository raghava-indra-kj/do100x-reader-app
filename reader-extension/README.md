# do100x Reader extension

Manifest V3 reader for articles, selected passages, pasted Markdown and `.md`/`.markdown`/`.txt` files. The default destination is a local temporary reader: no account or application server is needed to read. It uses `@reader/md-ast` and `@reader/md-view`, including LaTeX math, D2/Mermaid diagrams, syntax highlighting and code copying.

Choose **Send to Reader** when you want the account-backed seven-day inbox and saved Reader tools. That destination requires the application capture API/schema. Local reading and account captures have separate lifetimes. No production migration has been applied as part of this work.

## Build

From the repository root, use the existing workspace dependencies:

```powershell
npm run build:extension
npm run test --workspace reader-extension
```

The build compiles both Markdown packages and writes `reader-extension/dist`, targeting `https://www.do100x.com` for account transfers. For a separately prepared local test application:

```powershell
$env:READER_APP_URL = 'http://localhost:5173'
npm run build:extension
Remove-Item Env:READER_APP_URL
```

Only HTTPS origins or localhost HTTP origins are accepted. Rebuild without the override for a production package. Building does not start the app or run a migration.

## Load in Chrome

1. Open Chrome's extension management page and enable Developer mode.
2. Choose **Load unpacked** and select `reader-extension/dist` (extract the ZIP first if using the packaged artifact).
3. Pin do100x Reader. On a normal web article, select text and use **Read selection in do100x**, or use **Read this page** in the popup.
4. Leave **Local reader** selected to read without signing in. The reader offers a searchable outline with active-section highlighting, reading progress, text sizing, light/dark appearance, original Markdown, copying, downloading and fullscreen diagrams. Use **Aa** to choose Lexend or Merriweather; code uses JetBrains Mono. All fonts are bundled locally, including licenses, with no external font requests. Font, size and theme preferences are saved on this browser.
5. Reopen or remove local captures from the popup. **Send to Reader** transfers the chosen capture to the configured app. Sign in there if needed, then use **Keep** to move it into permanent pages.
6. Use the **Retry last transfer** icon after a failed transfer while Chrome remains open and the pending capture is less than 30 minutes old.

After rebuilding an installed unpacked extension, use **Reload** on its Chrome extension card and open a fresh capture. Download important local captures before reloading: Chrome clears extension session storage on reload. No server deployment or database migration is needed for these extension UI changes.

Installing the extension has not been automated. It is not published in the Chrome Web Store.

## Data and permissions

The extension only captures after an explicit action. It requests `activeTab`, `scripting`, `contextMenus`, `storage` and `alarms`; its app bridge runs only on the configured do100x origin. It does not read the clipboard automatically or scan browsing history.

| Content | Lifetime |
| --- | --- |
| Local reading | Chrome session storage: cleared on browser restart, extension reload/update/disable, explicit removal, or after seven days, whichever happens first. |
| Pending account transfer | Up to 30 minutes in session storage, removed after the app acknowledges delivery. |
| Account inbox capture | Seven days on the server unless kept as a permanent Reader page. |

Each capture is limited to 512 KiB of UTF-8 Markdown. Local captures and pending transfers share a 20-record limit and a conservative storage budget. Removing the local copy does not delete an account capture. Download or send important content to Reader before restarting Chrome. Account captures remain private and have a 100-active-capture account limit.

Local text is not sent to your account; linked images, media and embeds can still contact their source websites when displayed.

Article extraction varies by website. Use selection or explicit paste for difficult layouts and protected browser pages. PDF text extraction is not included. Local reading provides the renderer's tools; account-only notes, AI settings and learning tools become available after sending the content to Reader.

## Rendering isolation

The Markdown renderer runs in an opaque sandbox iframe with no Chrome extension APIs. Privileged extension pages cannot evaluate code. The sandbox has a separate CSP for the bundled D2 engine; remote scripts are disallowed. Its parent accepts only channel-bound copy and link messages from that exact iframe. Account transfer remains a parent-toolbar action.

D2 0.1.33 embeds a module worker that Chromium rejects in an opaque sandbox. `d2-sandbox-plugin.mjs` removes two unused worker exports and builds the same worker as a classic blob worker. The transformation fails the build if the upstream format changes. The modified dependency source and its notice are included under `dist/sources`. Normal web/library consumers use the unmodified D2 package.

## Verification

The extension tests exercise the actual background message handler with Chrome API mocks: local capture/reload, explicit account transfer and acknowledgement, sender/tab/frame checks, expiry, quota, reopen/delete, failure rollback and CSP separation.

To inspect the packaged UI without installing the extension:

```powershell
node reader-extension/preview.mjs
```

Open the URL printed by that command, or `/popup.html` on the same server for the popup. It serves the actual `dist` assets with the manifest CSP and a generated public fixture. Chrome APIs are simulated; capture actions open that fixed public fixture and account writes are unavailable. This verifies layout/rendering, not installation, context-menu permissions or the real signed-in bridge.

See [the implementation and rollout plan](../docs/reader-captures.md) for expiry behavior, schema changes, verification results and release gates.
