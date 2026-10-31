# Normal design rules

Every page follows these rules: the marketing site, the app, dialogs, drawers and sign-in. If a page needs something they do not cover, add the rule here first, then build it.

`src/theme/design-conformance.test.ts` enforces the rules marked **(tested)**, so breaking one fails CI.

## The shared parts

Import from `src/components/_common/brand.tsx` before writing a new one.

| Part | Use it for |
| --- | --- |
| `PageSection` | Every full-width band. Sets the background, rhythm and content width. |
| `SectionHeader` | Every section heading: eyebrow, title, subtitle, optional action. |
| `HeroBadge`, `HeroTitle`, `HeroLede` | The top of a page, and the closing call-to-action band. |
| `AppPageHeader` | The title and one-liner on every signed-in page. |
| `BrandButton` | Page-level calls to action, on light or dark. |
| `SegmentedControl` | Switching one view: price range, activity filter, settings tab. |
| `Eyebrow`, `MetaItem`, `LiveDot`, `GradientText` | The small pieces. |
| `BandBackdrop` | The aurora and dot grid behind every dark band and panel. |
| `BLOCK_SX`, `BLOCK_ON_DARK_SX` | A white block, or the same block on a dark band. |

## Corners (tested)

Corners are CSS variables in `src/global.css`. Change a value there and every page follows. Never write a pixel radius.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-lg` | 12px | Every block: cards, dark panels, dialogs, popovers, menus, images |
| `--radius-md` | 8px | Buttons, inputs, tabs, nested tiles and rows, icon-only buttons |
| `--radius-sm` | 6px | Badges, chips, tooltips, menu items, items inside a segmented control |
| `--radius-xs` | 4px | Progress tracks, tiny tags |
| `--radius-full` | 999px | Switches |
| `'50%'` | circle | True circles only: avatars, token icons, status dots |

A nested element is one step smaller than its parent. Full-width bands have no corners.

## Depth (tested)

The design is flat. Depth comes from a hairline and from white blocks on the `#FAFAFB` page.

- No shadows on blocks, buttons, menus or hover states.
- **One exception:** the home hero block, because it floats on the moving background.
- Crisp rings with no blur are allowed around live status dots.
- Hover changes the border or background. Never lift, scale or slide anything.
- No background blur, except the navbar, which content scrolls under.

## Colour

| Role | Value |
| --- | --- |
| Ink: text, primary buttons, dark bands | `#0A0A0F` |
| Ink hover, strong body text | `#2A2A33` |
| Muted text | `#6B6B76` |
| Faint text, disabled text | `#9A9AA3` |
| Page | `#FAFAFB` |
| Block | `#FFFFFF` |
| Soft fill: wells, icon tiles, tab tracks | `#F4F4F7` |
| Hairline: every border | `rgba(10,10,15,0.08)` |
| Strong hairline: inputs, outlined buttons, hover | `rgba(10,10,15,0.14)` |
| Hairline on dark | `rgba(255,255,255,0.08)` |
| Success, warning, error | `#1AB37D`, `#B45309`, `#B91C1C` |
| Brand gradient | `BRAND_GRADIENT`. One accent per heading, never on a block. |

Disabled buttons are always `rgba(10,10,15,0.08)` with `#9A9AA3` text.

## Type

Satoshi for words, Geist Mono for numbers and addresses. Medium (500) is the heaviest weight. Do not use 600 or 700.

| Style | Size | Tracking |
| --- | --- | --- |
| Hero title | `clamp(40px, 5.6vw, 68px)` | -0.035em |
| Section title | `clamp(32px, 4vw, 52px)` | -0.03em |
| App page title | 24px to 28px | -0.025em |
| Card title on marketing pages | 18px to 22px | -0.02em |
| Card title in the app | 15px | none |
| Body | 16px, muted | none |
| Small body | 13px to 14px | none |
| Eyebrow and uppercase labels | 11px, uppercase, 500 | 0.16em |

Eyebrows never start with a dash or line **(tested)**.

## Layout (tested)

- One content width: `--page-max`, 1200px, with 24px gutters and 16px on phones. The navbar, footer, marketing pages and app pages all share it, so everything lines up on one left edge.
- Legal pages are the one exception: long text stays readable in a 900px column.
- One rhythm: `--section-y`, 96px on desktop and 64px on phones. Two light bands in a row share one gap.
- Section headers are left-aligned. Only the closing call-to-action band is centred.
- A hero has text on the left and its visual on the right on desktop, and stacks on phones.
- Blocks use 24px padding, 20px on phones. Grid gaps are 16px, 12px on phones.

## Buttons

| Type | Height | Notes |
| --- | --- | --- |
| Large | 48px | Page-level calls to action and the main action in a card |
| Medium | 40px | Default |
| Small | 32px | Inline actions |

Primary is ink on light and white on dark. Secondary is a hairline outline.

## Adding an exception

Exceptions live in the lists at the top of `design-conformance.test.ts`, each with its reason. If you cannot write the reason in one line, it is probably not an exception.
