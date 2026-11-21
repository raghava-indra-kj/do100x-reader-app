# Brand assets

Use `@modules/core/branding` in web components. It exports `BrandMark`, `BrandLockup` (mark and wordmark), the app and theme icons, `ReaderExtensionIcon`, and the shared `workspaceImage`. The landing and sign-in pages reference the same image.

The header and favicon use `do100x-mark.svg` from this directory. When the mark changes, refresh its square 128 × 128 export, `do100x-mark-128.png`, for the Chrome extension build.

The shared app bar provides `AppsSwitcher` and `ThemeSelector`. Use those same components where a view needs a standalone control. App links and names come from `suiteApps` in `@modules/core/apps/app-catalog`.
