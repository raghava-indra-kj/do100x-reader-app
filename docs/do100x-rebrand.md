# do100x application rebrand

Approved implementation scope (2026-10-04): replace the Reader-specific landing
page with a compact do100x launcher and consistently connect Reader, Finance and
Tasks. The existing site at https://www.do100x.com/ is the branding reference.

## Plan

1. Store the official do100x wordmark locally, with its source documented.
2. Share a small static app catalog between the home cards and Apps switcher.
   Reuse existing routes, icons, theme tokens and Popover; add no dependencies.
3. Build a short home introduction, three equal app cards and a minimal footer.
   Prioritize desktop single-screen navigation and compact mobile cards.
4. Rebrand shared, Tasks and Reader headers; retain contextual workspace controls.
   Public Reader pages remain read-only, with no private Apps switcher.
5. Update sign-in text, safe default landing destination, title and favicon.
   Preserve requested internal destinations and Google-only authentication.
6. Run frontend regression tests and production build; check all three themes,
   mobile sizing, keyboard navigation, links and signed-out return destinations.

## Boundaries

No database, backend, MCP access, account data or Reader/Finance/Tasks business
logic changes. Do not rename internal packages or convert Reader home-page
preferences into a suite setting. Existing uncommitted Finance work is preserved.
No deployment, commit or push is requested for this rebrand.

## Approved routing addition

The application is one do100x suite, not a Reader site with unrelated apps attached.
Use the following browser routes:

| Purpose | Route |
| --- | --- |
| do100x launcher | `/` |
| Google sign-in | `/login` |
| Shared account settings | `/settings` |
| Reader entry point | `/reader` |
| Reader document, private or public | `/reader/pages/:id` |
| Finance entry point | `/finance` |
| Tasks entry point | `/tasks` |

Approved by the user on 2026-10-04 as one complete implementation and verification task:

1. Replace `/pages/:id` with `/reader/pages/:id` and rename its route constants
   and URL builder to identify the Reader application explicitly.
2. Update all document navigation and sharing to use that single URL builder.
   Remove the app catalog's special handling of the old `/pages/` namespace.
3. Remove the exposed `/md-view` and `/md-parser` demo routes from the production
   router; retain library implementation and test code.
4. Add a normal not-found screen for unknown URLs, with an explicit home link.
   Do not register old routes, redirects, compatibility aliases or deprecations.
5. Preserve public-document access and private-document authorization; preserve
   valid requested destinations through Google sign-in.
6. Verify route contracts, share URLs, access behavior and app navigation with
   frontend tests, a production build and local browser checks.

No database migration or reset is needed. Backend API paths and MCP resource
URIs such as `reader://pages/{pageId}` are separate contracts, not browser routes;
keep them and existing MCP access unchanged. Use relative same-origin links, not
hardcoded production hosts, so localhost and do100x.com use the same route design.

## Verification

Approved landing-page/header scope verified on 2026-10-04:

- Frontend regression suite: 140 tests across 16 files passed; production build
  including TypeScript checks passed. Existing large diagram-bundle warning remains.
- Built frontend checked at 1280 x 720 and 390 x 844: all three app cards fit,
  with no page-level horizontal overflow. Light, Dark and Forest inspected.
- Signed-out Reader, Finance and Tasks links reach Google sign-in. Tests cover
  preserving the selected app, query string and hash through the sign-in guard.
- Signed-in launcher and Finance header checked with the isolated rolled-back
  QA account: account identity is visible, one Apps switcher is present, Finance
  has the current-app indicator, and All applications returns to the launcher.
- Keyboard app selection works; Escape dismisses the Apps popup and returns focus
  to its trigger. Visiting sign-in while already authenticated returns to `/`.
- Public/private Reader header visibility covered by component tests. The Finance
  QA server does not mount Reader or Tasks APIs, so it is not evidence of their
  complete signed-in runtime workflows.
- Browser checks did not submit Google credentials or modify real accounts.
  Existing Google repeated-initialization warning was observed after revisiting
  sign-in; authentication implementation was not changed for this rebrand.
- Temporary test servers stopped; database query confirmed zero `browser-qa-`
  fixture accounts remaining. Temporary browser tabs closed.

Saved signed-in home preview:
`C:/Users/16102/.codex/visualizations/2026/08/21/01a02224-7496-7cc2-8846-bea5746a4a5e/do100x-home.jpg`.

### Final routing verification

The approved routing addition is implemented and verified:

- Final frontend suite: **159 tests across 20 files passed**. The registered route
  tree is tested directly, including private guards, public document access,
  removed routes and unknown URLs. Document parameter tests verify IDs reach the
  existing Reader view; share-dialog tests verify canonical links on production
  and localhost origins. Sign-in tests preserve document query strings and hashes.
- Final production build including TypeScript checks passed. The existing large
  diagram-bundle warning remains; no dependencies were added for this work.
- Existing backend Reader access/editing regression suite: **9 tests passed**.
  Backend APIs, authentication, MCP resources and database schema were unchanged
  by this routing task.
- Built application browser check: `/reader/pages/route-verification-missing`
  enters Reader without a blanket sign-in redirect and reports the nonexistent
  document using existing Reader error handling. `/pages/...`, `/md-view` and
  `/md-parser` display the suite not-found screen at the requested address,
  without redirects; its explicit home link works.
- Final home-card navigation for all three apps reaches Google sign-in when
  signed out. No Google sign-in was submitted. Existing Google repeated-init
  warnings were observed after revisiting sign-in; no new app exceptions appeared.
- Final launcher checked again at 1280 x 720 and 390 x 844; document dimensions
  equal viewport dimensions and all cards fit. Light, Dark and Forest appearances
  inspected again. Theme restored and temporary viewport override removed.
- Test browser tabs closed and local verification server stopped. No database
  migrations, resets, persistent fixtures, deployment, commits or pushes were
  performed for this rebrand/routing task.

Final previews (outside the repository):
`C:/Users/16102/.codex/visualizations/2026/08/21/01a02224-7496-7cc2-8846-bea5746a4a5e/do100x-final-home.jpg`,
`do100x-final-mobile.jpg`, and `do100x-route-not-found.jpg` in the same directory.
