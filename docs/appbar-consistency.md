# Consistent application headers

Approved for complete implementation on 4 October 2026. Tests, builds, type checks and browser verification remain deferred.

## Plan

1. Use one fixed 44px app-bar layout with shared logo, app identity, spacing, colors, app selector, theme selector and avatar. The compact single-row revision was approved on 4 October 2026.
2. Move Finance identity out of its sidebar. Retain its book selector and menu icons.
3. Keep Reader breadcrumbs and reading controls, Tasks timer actions, and public Reader restrictions.
4. Move sign-out to account settings, preserving the existing confirmation and logout behavior.
5. Update affected test expectations without running verification.

## Implemented

- `AppBarLayout` owns only shared header presentation and slots. Application stores, handlers, dialogs and keyboard shortcuts remain in their applications.
- All three applications use a 44px header, 32px shared controls and compact do100x home link. Names come from the existing app catalog.
- Global controls use the same icon-only app selector, theme selector and accessible avatar link, in that order. The avatar does not show account-name text.
- Reader controls sit in the same header. At 1100px and above, controls are inline. Below that, secondary tools use one More icon; below 600px, navigation also moves into that panel to leave room for global controls. Each control mounts only once. Parent navigation remains accessible even when breadcrumbs are hidden.
- The Tasks active timer sits in the same header on wide screens, retaining its pause/resume/stop actions and elapsed time. Smaller screens access it through the same overflow pattern. There is no secondary app bar in any application.
- Finance's duplicate sidebar heading and obsolete heading styles were removed; book selection, navigation icons and app behavior remain unchanged.
- Public Reader pages hide the app selector, world/public badge and motivations. Sharing remains owner-only. Authenticated users retain their account link; anonymous visitors do not see an avatar.
- Sign-out is available in Account & preferences using the existing confirmation and session-clearing behavior, not in individual app bars.
- Updated shared header and Reader navigation test expectations. No routes, database, backend, dependencies or stored theme values changed.

## Deferred verification

No automated tests, builds, compilation, type checks or browser checks were run. A later pass should cover all themes, 320px and desktop widths, long app/page/section names, active and paused timers, anonymous/public/private Reader views, account settings and sign-out. These implementation notes do not assert passing tests or verified rendered layout.
