# GreenOrange Lab application

## 0. Research Log
- References: minimalist-skill + Notion. Use warm document surfaces, fine borders,
  clear form labels and restrained green/orange accents; do not copy brand assets.
- User explicitly requested a simple site and lead-owned design. No generated hero
  artwork, animation library, marketing sections, or UI framework.
- Layout: independently scrolling desktop form, document scrolling on mobile,
  compact recruitment context.
- Verification: real browser state captures at 375, 768 and 1280 pixels.

## 1. Atmosphere & Identity
An approachable research notice beside a practical application form. A small
green/orange wordmark, orange rule, and numbered form sections supply identity.
The form, rather than decorative content, is the main event.

## 2. Color
- Canvas #f6f5f0; paper #ffffff; ink #242d27; muted #5d675f.
- Green #245c3b; hover #19452c; pale green #edf3ed.
- Orange #bb4c1e; pale orange #fbefe8.
- Border #d8ddd5; input border #89958b; error #a32c24; pale error #fff0ed.
- White #ffffff for text on dark buttons. Never convey status by color alone.

## 3. Typography
- Korean system stack: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
  "Malgun Gothic", sans-serif. No external font requests.
- 14px hints, 16px body and controls, 20px section, 28–40px title.
- Body line-height 1.65; headings 1.25. Korean word-break: keep-all.
- Mono system stack for date/section metadata only.

## 4. Spacing & Layout
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px.
- Maximum width 1000px; 16px mobile gutters, 32px desktop gutters.
- Desktop: introduction 360px + flexible form; the application panel owns vertical
  scrolling within the viewport. Below 800px: one column and document scrolling.
- Form pairs collapse below 520px. No fixed overlays.
- Input/button minimum height 48px. Corners 6px inputs, 12px panels.

## 5. Components
- Wordmark/header: text logo.
- Context block: recruitment metadata, expandable activity details.
- Panel: paper surface, 1px border, 32px padding (24px on mobile).
- Field: visible label, associated hint, input/textarea. Required marker spelled out
  in section introduction; optional fields explicitly labeled.
- Button: primary green, secondary paper, destructive error outline. Hover, active,
  focus, disabled and loading states; loading caption rather than ornamental spinner.
- Notice: textual success/error/info, live region for request result.
- Native radio/checkbox: 20px control with large clickable label.
- Native dialog: explicit delete confirmation, cancel default, Escape supported.
- Same primitives cover lookup, PIN authentication, create/edit, success and failure.

## 6. Motion & Interaction
- No ornamental motion. Native focus and synchronous state changes.
- 2px focus outline with 3px offset. Busy fieldset disabled until response arrives.
- Focus first useful control when changing step. Preserve form values on error.
- PIN held in memory only; clear on logout, delete and successful submission.

## 7. Depth & Surface
Borders-only: warm canvas and white paper, no shadows or gradients.
Orange is a small identity accent, not a large background.

## 8. Accessibility Constraints & Accepted Debt
- Target WCAG 2.2 AA; body contrast 4.5:1, keyboard controls, explicit labels.
- Hidden steps removed from accessibility tree. Error/status announced.
- Narrow screens must not horizontally scroll. Native required/format validation.
- Apps Script may show Google's host banner; actual hosted behavior must be checked
  after account deployment. Local tests cannot certify Google Workspace policy.
