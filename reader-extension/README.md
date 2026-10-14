# do100x Reader extension

Manifest V3 companion for the account-backed Reader temporary inbox. Right-click a passage to read it, capture an article from the toolbar, or explicitly paste text/Markdown in the popup. Captures expire in seven days unless kept in Reader.

This is a local development build. The matching application backend and additive schema change must be available before it can save captures. The production database migration has not been applied as part of this work.

## Build

From the repository root, use the existing workspace dependencies:

```powershell
npm run build:extension
npm run test --workspace reader-extension
```

The output is `reader-extension/dist`, targeting `https://www.do100x.com`. For a separately prepared local test application:

```powershell
$env:READER_APP_URL = 'http://localhost:5173'
npm run build:extension
Remove-Item Env:READER_APP_URL
```

Only HTTPS origins or localhost HTTP origins are accepted. Rebuild without the override for a production package. Building does not start the app or run a migration.

## Unpacked installation after the app is ready

1. Open Chrome's extension management page and enable Developer mode.
2. Choose **Load unpacked** and select `reader-extension/dist` (extract the ZIP first if using the packaged artifact).
3. Pin do100x Reader. On a normal web article, select text and use **Read selection in do100x**, or use **Read this page** in the popup.
4. Sign in to do100x if needed. Verify the temporary banner, Reader tools, Keep destination and inbox.
5. Use **Retry last capture** after a failed transfer while Chrome remains open and the pending capture is less than 30 minutes old.

Installing the extension has not been automated. It is not published in the Chrome Web Store.

## Data and permissions

The extension only captures after an explicit action. It requests `activeTab`, `scripting`, `contextMenus`, `storage` and `alarms`; its app bridge runs only on the configured do100x origin. It does not read the clipboard automatically or scan browsing history.

Pending content stays in session storage for up to 30 minutes, with a ten-item limit, until acknowledged by Reader. Saved captures are private to the signed-in do100x account. A 512 KiB text limit and a 100-active-capture account limit bound storage. Existing Reader features and account settings apply.

Article extraction varies by website. Use selection or explicit paste for difficult layouts, protected browser pages and unsupported documents. Automatic clipboard capture, offline Reader and PDF extraction are outside this version.

See [the implementation and rollout plan](../docs/reader-captures.md) for expiry behavior, schema changes, verification results and release gates.
