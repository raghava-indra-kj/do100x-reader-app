# Settings layout update

Approved scope: settings presentation only. Saved-words learning remains a draft feature and is not included.

- Settings uses the available pane width, up to 1400px, with a compact 224px desktop sidebar.
- Mobile navigation sits above content rather than alongside it.
- Labels are block-level, preventing selectors from wrapping beside labels.
- Feature models and their optional instructions are grouped together in three equal desktop columns and stack below 1100px.
- Instructions allow vertical resizing and start at 140px tall. Cards use compact padding and neutral theme surfaces.
- Default connection Save sits in a right-aligned footer. One API-key visibility control remains alongside the field; Copy is preserved.
- Model IDs, provider settings, API-key values, store handlers and save semantics are unchanged. No backend, database, MCP or dependency changes.

Tests, builds, type checks and browser verification remain deferred. Layout and interaction are not asserted as runtime-verified.
