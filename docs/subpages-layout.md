# Compact subpage collections

Approved complete layout update for Reader home and nested page collections.

- Replaced the large hero and card grid with a compact heading, existing New subpage/Add content actions, and a shared list-row presentation.
- Removed duplicate onboarding cards; Paste content remains a compact action for an empty owner page.
- Main rows show a page icon, title, optional category, creation date and navigation arrow. Dates hide on small screens; titles can wrap rather than being cut off.
- Each owner row has one visible action-popover trigger for Edit/Delete. Existing editor and delete confirmation dialogs are retained. Public visitors do not receive owner actions.
- Rows use real Router links, supporting keyboard navigation and normal link behavior. Sidebar rows share styling but retain their dedicated sortable wrapper and drag handle; collection rows do not require drag-and-drop context.
- Sidebar search, sorting and grouping remain unchanged. Editing/deletion refreshes the relevant collection. Main loading/error states remain visible with a Retry action.
- No backend, database, dependency or document-reading changes.

Tests, builds, type checks and browser verification remain deferred. Verify home/nested collections, long titles, categories, empty/loading/error states, Edit/Delete menus, drag ordering, public restrictions, keyboard/touch use and all themes before treating the layout as verified.
