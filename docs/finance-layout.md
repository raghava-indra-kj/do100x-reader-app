# Compact Finance layout

Complete layout plan approved on 4 October 2026. Verification remains deferred.

- Finance retains the shared 44px application header.
- Sidebar width is 224px on desktop, with compact navigation and a book selector beside one accessible New book icon.
- FinanceHeader provides shared heading/action presentation, including one Refresh icon for each active view. Existing refresh, loading and busy behavior is preserved.
- Overview and Reports group CSV and JSON exports under one Export popover. Export scope and payloads are unchanged.
- Accounts, Transactions, Plans, Imports, Manage and History reuse the same header inside their leading section. Statement review uses the standalone variant.
- Cards, tables, filters, forms, dialogs and empty states use reduced padding and spacing. Small-screen layouts retain wrapping and horizontally scrollable tables.
- Errors and archived-book warnings remain visible. No stores, financial calculations, database structures, MCP tools or dependencies changed.

No tests, builds, type checks or browser verification were run. A future verification pass should cover all Finance tabs, all themes, long book names, narrow screens, statement review, exports, empty/loading/error states and archived books.
