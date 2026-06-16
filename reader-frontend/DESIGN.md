---
version: alpha
name: do100x
description: >-
  The shared design language for do100x.com and every product under it, starting
  with Reader. Calm, warm, "easy on your eyes" — cream instead of white, one
  coral accent, an editorial serif, and gentle motion.
colors:
  # ── Tier 1 · Primitive ramps (raw, role-free) ──────────────
  # Navy — calm dark, product chrome + depth
  navy-50: "#eef1f6"
  navy-100: "#d7dee9"
  navy-200: "#aebccf"
  navy-300: "#7c8fac"
  navy-400: "#506488"
  navy-500: "#314a6c"
  navy-600: "#213655"
  navy-700: "#16263f"
  navy-800: "#101d31"
  navy-900: "#0b1424"
  navy-950: "#060d18"
  # Coral — the one brand accent ("action")
  coral-50: "#fef3ed"
  coral-100: "#fde0d3"
  coral-200: "#fabfa4"
  coral-300: "#f79871"
  coral-400: "#f47548"
  coral-500: "#f15a29"
  coral-600: "#d8431a"
  coral-700: "#b33414"
  coral-800: "#8d2911"
  coral-900: "#6d2110"
  # Sand — warm paper neutrals (canvas + cards)
  sand-50: "#fdfbf7"
  sand-100: "#faf6ef"
  sand-200: "#f4ecdf"
  sand-300: "#ece1cf"
  sand-400: "#ddcfb6"
  sand-500: "#c4b598"
  # Stone — warm gray text neutrals
  stone-50: "#f6f4f0"
  stone-100: "#e9e4dc"
  stone-200: "#d5cfc4"
  stone-300: "#b4ada1"
  stone-400: "#8a8478"
  stone-500: "#6b655b"
  stone-600: "#514c44"
  stone-700: "#3c3833"
  stone-800: "#2a2723"
  stone-900: "#1c1a17"
  # Green — calm progress / success / AI
  green-100: "#d3ebdb"
  green-500: "#2f8b56"
  green-600: "#237045"
  green-700: "#1b5836"
  # Amber — warm highlight
  amber-100: "#fae6c2"
  amber-500: "#e0a23a"
  amber-600: "#c0852a"
  # Red — error
  red-100: "#f8d3cf"
  red-500: "#c6453f"
  red-600: "#a73531"

  # ── Tier 2 · Semantic aliases (what product code consumes) ──
  # Brand / action
  primary: "#f15a29"
  brand: "#f15a29"
  brand-hover: "#d8431a"
  brand-active: "#b33414"
  brand-soft: "#fde0d3"
  brand-subtle: "#fef3ed"
  brand-on-soft: "#b33414"
  # Surfaces (warm paper, alternating bands)
  surface: "#faf6ef"
  surface-canvas: "#faf6ef"
  surface-raised: "#fdfbf7"
  surface-soft: "#f4ecdf"
  surface-card: "#ece1cf"
  surface-card-strong: "#ddcfb6"
  surface-inverse: "#16263f"
  surface-inverse-soft: "#101d31"
  surface-inverse-raised: "#213655"
  # Text ink (warm gray, never pure black)
  on-surface: "#3c3833"
  text-strong: "#1c1a17"
  text-body: "#3c3833"
  text-muted: "#6b655b"
  text-subtle: "#8a8478"
  text-on-brand: "#ffffff"
  text-on-dark: "#faf6ef"
  text-on-dark-muted: "#aebccf"
  text-link: "#d8431a"
  # Borders
  border-subtle: "#ddcfb6"
  border-default: "#d5cfc4"
  border-strong: "#b4ada1"
  # Functional accents (not decoration)
  secondary: "#2f8b56"
  accent-green: "#2f8b56"
  accent-green-soft: "#d3ebdb"
  accent-green-on-soft: "#1b5836"
  tertiary: "#e0a23a"
  accent-amber: "#e0a23a"
  accent-amber-soft: "#fae6c2"
  accent-amber-on-soft: "#c0852a"
  # Status
  status-success: "#2f8b56"
  status-warning: "#e0a23a"
  status-error: "#c6453f"
  error: "#c6453f"
  status-error-soft: "#f8d3cf"
typography:
  # Display — Newsreader serif, regular weight, negative tracking
  display-2xl:
    fontFamily: Newsreader
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.022em
  display-xl:
    fontFamily: Newsreader
    fontSize: 52px
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: -0.022em
  display-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: -0.022em
  display-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.22
    letterSpacing: -0.012em
  display-sm:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: 500
    lineHeight: 1.28
    letterSpacing: -0.012em
  # Reading — serif body for the Reader column
  reading:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
  # Title — Hanken Grotesk sans, semibold/bold
  title-lg:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  title-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  # Body — Hanken Grotesk sans
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.62
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.62
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  # UI / labels
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
  caption:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  overline:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.09em
  # Code
  code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.62
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  pill: 9999px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 20px
  "6": 24px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
  "20": 80px
  "24": 96px
  "32": 128px
  card: 32px
  band: 96px
  container-max: 1200px
  container-prose: 720px
  nav-height: 64px
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.text-on-brand}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-primary-active:
    backgroundColor: "{colors.brand-active}"
  button-secondary:
    backgroundColor: "{colors.surface-canvas}"
    textColor: "{colors.text-strong}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 20px
    height: 40px
  button-secondary-hover:
    backgroundColor: "{colors.surface-soft}"
  button-ghost:
    textColor: "{colors.text-body}"
    rounded: "{rounded.md}"
    padding: 20px
    height: 40px
  button-ghost-hover:
    backgroundColor: "{colors.surface-soft}"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 16px
    height: 40px
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: 32px
  card-plain:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: 32px
  card-dark:
    backgroundColor: "{colors.surface-inverse}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.lg}"
    padding: 32px
  badge:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-on-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 12px
  tab-active:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
  tooltip:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.text-on-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 12px
  dialog:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.xl}"
    padding: 32px
---

# do100x Design System

The shared design language for **do100x.com** and every product under it — starting with **Reader** (reader.do100x.com). do100x builds simple, high-quality, AI-powered tools that each remove one real problem from your day. This file is the persistent source of truth that keeps every one of those tools feeling like part of the same calm, warm family.

## Overview

**The brand in one line: *easy on your eyes*** — and that is a literal design constraint, not a slogan. do100x is a calm reading brand whose whole promise is to be gentle on a tired human. The voice is warm, plain, and reassuring; it talks to a person, not a power user.

The personality is **warm, human, and quietly confident**. Where most software is sharp, bright, and clinical, do100x is soft paper, generous space, and a single friendly accent. The UI should feel like an editorial broadsheet or a well-made book — never a dashboard. Choose calm over loud, space over density, and one decisive moment over many competing ones.

The target audience is anyone with more to read, learn, or do than time allows — overwhelmed, not lazy. Every screen should lower their cognitive load: one clear purpose, one obvious action, nothing fighting for attention. When a specific token or rule is not defined, bias toward whatever feels **calmer, warmer, and more spacious.**

## Colors

The palette is warm throughout: cream surfaces, a single coral accent, navy for depth, and two strictly functional accents (green, amber). Text is warm gray, never pure black.

- **Primary / Brand — Coral (`#f15a29`):** The one brand accent, pulled from the logo's spine and sparkle. It means exactly one thing: **action**. Every primary button, every link, and the single coral callout per page use it — and nothing else does. A second decorative accent would dilute it.
- **Neutral surfaces — Sand (cream):** A warm cream `#faf6ef` is the floor *everywhere*, chosen over pure white because white glares and reads as clinical; cream cuts glare on long reading sessions and feels human. Even "white" raised panels are `#fdfbf7`, never `#ffffff`. Surfaces step up a shade at a time — canvas → soft → card — to separate zones without hard borders.
- **Depth — Navy (`#16263f`):** A calm, trustworthy dark used for product chrome, the footer, and the single dark band that gives a long page depth.
- **Text — Stone:** Warm grays from ink `#1c1a17` (headlines) through body `#3c3833` to muted `#6b655b`. Never pure black on warm paper.
- **Secondary / functional — Green (`#2f8b56`):** Calm progress, success, and the AI assistant. Functional only, never decoration.
- **Tertiary / functional — Amber (`#e0a23a`):** Warm highlights and warnings. Functional only.

**Surface rhythm:** a long page is paced by alternating bands — canvas → cream card → dark navy → (one) coral callout → footer. **Never repeat the same surface in two bands in a row.** That alternation is the brand's heartbeat.

## Typography

Two families split the work. The **serif is the brand's voice**; the **sans is its interface**.

- **Newsreader (serif)** carries every display headline and the Reader reading column. It reads as editorial, calm, and book-like — exactly what a reading product should feel like. It is set at **regular weight even at large sizes**: the serif already has presence, so **to emphasize, size up before you bolden** — never set the serif heavy.
- **Hanken Grotesk (sans)** handles all UI: titles, body copy, buttons, labels. Friendly and crisp at small sizes.
- **JetBrains Mono** is used only for code.

Display type uses negative tracking (`-0.022em` on the largest, easing to `-0.012em`) to keep large serif lines tight and composed. Body copy runs at a relaxed `1.62` line height; the Reader column opens further to `1.7`. Overlines are the only uppercase: 12px, bold, wide `0.09em` tracking, reserved for small section labels like "OUR PRODUCTS" and "CONTENTS".

## Layout

Content sits in a **fixed-max-width** column of `1200px`; the Reader reading column narrows to `720px` for comfortable line length. The nav bar is a fixed `64px`.

All spacing derives from a **4px base grid** — pick the nearest step, never an in-between value. The section rhythm is `96px` of vertical breathing room between major bands; cards carry a generous `32px` interior. Related items are grouped by containment (a card with roomy padding) rather than by drawing dividers everywhere. Prefer flex/grid with `gap` over per-element margins.

## Elevation & Depth

The system is **color-block first**: hierarchy comes from surface color and hairline borders far more than from shadows. A resting card on cream has **no shadow and no border** — its cream fill against the canvas is the separation. Plain panels use a single `1px` hairline; dark and coral cards are flat color blocks.

Shadows are reserved for things that **genuinely float** — dropdowns, dialogs, toasts, and the 2px hover-lift on a card. They are tinted with **navy at low alpha**, never pure black, so they sit correctly on warm paper. Focus is communicated by a single coral ring (`0 0 0 3px` at ~38% coral) on every interactive element.

## Shapes

Corner roundness signals scale — small controls get small radii, large panels get large ones, keeping the whole UI feeling like one family.

- `4px` (xs) micro elements · `6px` (sm) tooltips, small chips
- `8px` (md) buttons, inputs, tabs
- `12px` (lg) content and product cards
- `16px` (xl) dialogs and hero containers
- `24px` (2xl) large feature panels
- `9999px` (pill) badges and chips; full circles for avatars and icon dots

Corners are consistently soft. Do not mix sharp and rounded corners in the same view.

## Components

Reach for a component before hand-rolling one — each already encodes the correct focus, hover, and press states from tokens.

- **Button** — `primary` is solid coral with white text and the single most important action per view; never two coral buttons side by side. `secondary` is a cream fill with a `1px` strong border and ink text; `ghost` is text-only that fills with soft sand on hover. On a coral surface, the CTA flips to a cream fill with ink text (coral-on-coral fails contrast). Hover darkens the fill; press nudges `0.5px` and darkens further.
- **Input / Textarea / Select** — raised sand background, `1px` default border that strengthens on hover and turns coral on focus, `8px` radius, `40px` tall. Coral focus ring is the system default.
- **Card** — `cream` (the default, no shadow/border), `plain` (hairline border), and `dark`/`coral` color-blocks for pacing. Use one coral card per page at most.
- **Badge** — soft coral pill for categories; reserve the uppercase coral "NEW"/"BETA" badge for genuine moments. Green dot badge for "active" status.
- **Tabs** — segmented (active tab gets a cream card fill) or underline.
- **Tooltip / Popover** — navy `#101d31` bubble, cream text, `6px` radius, appears on hover/focus.
- **Dialog** — centered card on a navy scrim (~42% alpha), serif title, `16px` radius, a footer action row, and the only place a large shadow is used.
- **Toast** — dark notification with a status icon (success / warning / danger / info); in real apps, stack them fixed-position.
- **Switch / Checkbox / Radio** — coral "on"/checked state; round radio variant.
- **ProgressBar** — green by default (matches the Reader reading bar); coral only when it represents a branded action.

## Do's and Don'ts

- **Do** keep coral scarce — one primary action and at most one coral callout per page. **Don't** use coral for decoration or put two coral buttons side by side.
- **Do** make cream the floor everywhere. **Don't** use pure white (`#ffffff`) as a background, or pure black for text.
- **Do** alternate surface bands (cream → card → dark → coral). **Don't** repeat the same surface in two consecutive bands.
- **Do** size the serif **up** to add emphasis. **Don't** set Newsreader in a heavy weight.
- **Do** separate with surface color and hairlines first. **Don't** add a shadow to anything that isn't genuinely floating.
- **Do** keep motion calm — short fades (140–360ms) and 2–4px moves with soft easing. **Don't** use bounces, springs, or anything that loops or demands attention. Honor `prefers-reduced-motion`.
- **Do** write warm, plain, second-person copy that names a pain and removes it ("Easy on your eyes"). **Don't** use hype, exclamation marks, or jargon ("Supercharge your workflow 🚀").
- **Do** maintain WCAG AA contrast (4.5:1 for normal text). **Don't** place coral text on coral, or rely on the cream-step alone where text legibility needs more contrast.

## Iconography

**Lucide** line icons (~2px stroke, rounded) match the calm brand. Sizes: 18px in UI, 16px inline in buttons, 22px in feature tiles. Icons inherit `currentColor` and are never multi-color. **The sparkle marks AI** (the Reader assistant), echoing the logo's coral sparkle — but keep AI accents green. No hand-drawn SVG icons, and no emoji as icons. The single sanctioned emoji in the entire system is the footer heart — *"Made with ♥ by Raghavendra K J"*.

## Motion

Calm by mandate — same reason as cream: *easy on your eyes.* Durations run `80ms` (instant) to `360ms` (slow); the workhorse is `140ms` for color changes and `220ms` for transforms. Easing is soft (`cubic-bezier(0.2, 0, 0, 1)` standard; a gentle `cubic-bezier(0.33, 0, 0.2, 1)` for transforms). Movement is limited to small 2–4px translations and short fades. No bounces, no springs, nothing looping. Motion should feel like a page settling, never demanding attention — and is disabled entirely under `prefers-reduced-motion`.

## Voice & Content

- **Second person, "you".** "We" appears only for what do100x makes ("We don't build apps").
- **Short sentences, plain words.** Name the pain, absolve the reader, then show the fix.
- **Benefit titles, not feature names** — "Remember what you read", not "Quiz engine".
- **Sentence case** for headlines, buttons, and nav; UPPERCASE only for small 12px overlines.
- **Gentle, low-pressure CTAs** — "Open Reader", "Share an idea" — never "Sign up free!!".
- **"100×" is the brand verb** (use the `×` glyph, U+00D7); the wordmark keeps the literal "100x".
