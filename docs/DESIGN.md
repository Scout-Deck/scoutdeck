---
name: ScoutDeck — Signal Atlas
description: A cartographic waitlist experience that makes personal opportunity discovery feel like finding a route through a live signal field.
colors:
  abyssal-ink: "#071310"
  field-green: "#102a24"
  parchment: "#f3efe4"
  signal-mist: "#c7d2c9"
  moss: "#78948b"
  solar-yellow: "#f4d64e"
  opportunity-coral: "#e56e57"
  light-canvas: "#ece7d8"
  light-field: "#dce1d5"
  light-ink: "#08211a"
  light-gold: "#65540b"
  light-moss: "#486257"
  light-paper: "#f8f5ed"
typography:
  display:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(3.7rem, 5.8vw, 6.15rem)"
    fontWeight: 500
    lineHeight: 0.84
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(3.2rem, 5.1vw, 5.7rem)"
    fontWeight: 500
    lineHeight: 0.91
    letterSpacing: "-0.055em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
  label:
    fontFamily: "DM Mono, monospace"
    fontSize: "0.67rem"
    fontWeight: 400
    letterSpacing: "0.065em"
rounded:
  circular: "50%"
spacing:
  gutter: "32px"
  panel-inset: "10px"
  form-gap: "8px"
  section-top: "118px"
  section-bottom: "160px"
components:
  button-primary:
    backgroundColor: "{colors.solar-yellow}"
    textColor: "{colors.abyssal-ink}"
    padding: "0 16px 0 19px"
    height: "48px"
  nav-cta:
    textColor: "{colors.solar-yellow}"
    padding: "9px 12px 9px 15px"
  atlas-center:
    backgroundColor: "{colors.solar-yellow}"
    textColor: "{colors.abyssal-ink}"
    rounded: "{rounded.circular}"
    size: "64px"
---

# Design System: ScoutDeck — Signal Atlas

## Overview

**Creative North Star: "Signal Atlas"** — direction contract seed `bc5cde34`.

ScoutDeck is an opportunity atlas, not a startup dashboard. The page turns an overwhelming web into a legible field of possible moves: abyssal space holds soft luminous routes, coordinate-like labels, and a small number of signals. The presentation is editorial in scale but technical in annotation, keeping the product's five-opportunity promise personal and explainable.

This is an intentionally grounded system: no rounded app-card language, no generic dashboard chrome, and no decorative imagery. The map, radial routes, rules, and beacon marks do the illustrative work.

- Dark field first; the parchment signal window is a deliberate inversion.
- A single solar accent guides action, orientation, and live-state emphasis.
- Type alternates between compact technical coordinates and large, tightly set editorial propositions.

## Colors

The palette is a low-light surveying kit: green-black terrain, warm paper, one solar navigation signal, and restrained coral for alternate opportunities.

- **Abyssal Ink** (`#071310`): default dark canvas and ink on yellow or parchment surfaces.
- **Field Green** (`#102a24`): atlas ground layer behind routes and beacons.
- **Parchment** (`#f3efe4`): primary dark-mode text, panel framing, and the warm counterweight to the field.
- **Signal Mist** (`#c7d2c9`): supporting copy, legends, metadata, and quiet UI.
- **Moss** (`#78948b`): muted secondary metadata and footer underline.
- **Solar Yellow** (`#f4d64e`): primary action, route labels, active pins, focus rings, and the user’s central signal. It is the page’s scarce directional color.
- **Opportunity Coral** (`#e56e57`): alternate opportunity dots/pins and error emphasis; never a second CTA color.

**Light theme.** Swap the field to Light Canvas (`#ece7d8`) and Light Field (`#dce1d5`), with Light Ink (`#08211a`) as the foreground. Use Light Gold (`#65540b`) for navigation and annotation text, Light Moss (`#486257`) for quiet form copy, and Light Paper (`#f8f5ed`) for atlas beacons. Solar Yellow remains the active accent and keeps dark Light Ink lettering.

**The Solar Signal Rule.** Use yellow to identify the route, not to decorate every surface. Its contrast and rarity make an action or signal immediately locatable.

## Typography

**Display and body:** DM Sans, sans-serif.  
**Editorial accent:** Gloock, serif.  
**Technical label:** DM Mono, monospace.

DM Sans supplies plainspoken, high-impact messaging; Gloock appears sparingly for the hero’s emphasized word, route indices, and illustrative note title. DM Mono makes labels read as coordinates rather than marketing ornaments.

- **Display** (500, `clamp(3.7rem, 5.8vw, 6.15rem)`, `0.9`): hero statement, with `-0.028em` tracking. At mobile it becomes `clamp(3.3rem, 14vw, 4.45rem)`. Use Gloock at 400 only for an intentional italic/emphasized fragment.
- **Headline** (500, `clamp(3.2rem, 5.1vw, 5.7rem)`, `0.91`): section propositions, `-0.055em` tracking.
- **Section title** (700, `1.5rem`): route-list headings, `-0.045em` tracking.
- **Body** (400, `16px`, generally `1.55–1.65`): readable explanatory text in Mist, promoted to Parchment only for the key sentence.
- **Label** (400, `0.54–0.67rem`, uppercase, `0.045–0.08em` tracking): route codes, atlas legend, beacon metadata, and coordinates.

**The Annotation Rule.** Mono text is small, uppercase, and informational; it should support the editorial statement, not compete with it.

## Layout

The desktop shell uses a broad `min(1370px, 100% - 64px)` frame for the header, hero, and footer; content sections narrow to `min(1170px, 100% - 64px)`. Thin horizontal rules create the page’s map-grid rhythm.

The hero is a two-column composition with a slightly larger atlas (`minmax(500px, 1.12fr)`) beside the copy column (`minmax(410px, .88fr)`), a `clamp(40px, 8vw, 150px)` gap, and at least 800px of height. Follow with generously separated thesis, route, proof, and waitlist chapters; recurring section bottoms are 160–165px on desktop.

At 900px, the hero and all major paired sections become a single-column sequence; atlas, signal window, and form panel keep capped readable widths. At 620px, the outer gutter becomes 16px, header height becomes 75px, the hero form stacks, the route's third metadata column disappears, and visual modules reduce to a 410px minimum height. Editorial headings tighten to `clamp(3rem, 12vw, 4rem)`; the hero uses `clamp(3.85rem, 17vw, 5.25rem)`.

## Elevation & Depth

Depth comes from tonal fields, border rules, and controlled luminous halos rather than floating cards. Most surfaces are flat and square; atlas and signal-window borders establish a measured frame. The only pronounced glow belongs to the central user signal: `0 0 0 8px rgba(244,214,78,.12), 0 0 48px rgba(244,214,78,.28)`. Use transparency and nested one-pixel lines to suggest map layers, not broad drop shadows.

## Shapes

The dominant shape is rectangular and unrounded: buttons, forms, panels, navigation CTA, maps, and dividers are square-cornered. Circles have semantic meaning only—brand mark, route nodes, pins, orbit, and the central "You" signal. The atlas receives a second inset border at 14px; the light signal window carries the same framed, diagrammatic logic.

## Components

### Navigation

The header is an absolute 100px bar with a lower rule, a circular yellow ScoutDeck mark, muted text links, a fine outlined yellow CTA, and 36px outlined utility controls. Below 620px, hide the desktop navigation and reveal a full-screen, near-opaque field menu whose links are large, rule-separated rows; the final link turns yellow.

### Buttons and links

- **Primary:** Solar Yellow background, Abyssal Ink text, 48px minimum height, asymmetric horizontal padding, and a trailing arrow separated by a 26px gap.
- **Secondary navigation CTA:** transparent, one-pixel yellow outline, yellow text.
- **Text link:** yellow type with a one-pixel yellow baseline; its arrow shifts down-right on hover.
- **State:** controls lift 1–2px on hover and scale to `.97` on press. Use the shared `cubic-bezier(.23,1,.32,1)` for transform exits.

### Forms

Hero capture is an unboxed, rule-based email field paired with a bright action. The expanded waitlist form is a parchment square panel with a 10px outer inset and 28px inner padding; inputs/selects stay transparent with only bottom rules. Keep labels small and bold, validation inline and compact, loading yellow, errors coral (`#ff9f8e`), and confirmation integrated as a small check-marked message rather than a modal.

### Atlas and signal window

The **Atlas** is the signature component: a framed Field Green map, with a 14px inner line, mist micro-labels, thin curved canvas routes, a yellow central user disc/orbit, and three small beacons with left rule/pin anchors. Beacons can move 5px right on hover; coral identifies an alternate/new opportunity.

The **Signal Window** inverts the field to parchment. It uses diagonal guide lines, a 310px rotated circular route (245px on mobile), outlined nodes, and terse coordinate labels. It is illustrative product explanation, not an interactive dashboard panel.

### Lists and ticker

Route steps are long, rule-bounded rows: Gloock italic letter index, DM Sans heading/body, then muted mono status. On hover, the whole row shifts 14px right and receives only a faint parchment wash. The opportunity ticker is a wrapped band between rules, each item prefixed by a small yellow star.

## Do's and Don'ts

### Do:

- **Do** build hierarchy through huge, tight editorial headings and very small mono annotations.
- **Do** use one-pixel rules, cartographic circles, coordinates, and sparing halos to make information feel surveyed and navigable.
- **Do** reserve Solar Yellow for signals, orientation, focus, and decisive actions; use Coral only to distinguish an opportunity/error state.
- **Do** preserve dark and light themes, keyboard-visible 2px yellow focus outlines, and the mobile menu’s stacked-row treatment.
- **Do** honor `prefers-reduced-motion`: collapse animation and transition duration to near-zero and leave the atlas intelligible when still.

### Don't:

- **Don't** introduce rounded cards, heavy shadows, dashboard widgets, gradients as general page backgrounds, or generic SaaS pill controls.
- **Don't** use Gloock or DM Mono for ordinary body copy; their scarcity is what gives signal names and annotations authority.
- **Don't** turn every opportunity, rule, or surface yellow. The field must stay quiet enough for the route to read.
- **Don't** rely on motion to convey the five signals or route relationship; canvas routes, beacons, and the central marker must remain understandable at rest.
