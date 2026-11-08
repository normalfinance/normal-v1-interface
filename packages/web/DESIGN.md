# Normal design rules

Every page follows these rules: the marketing site, the app, dialogs, drawers and sign-in. If a page needs something they do not cover, add the rule here first, then build it.

`src/theme/design-conformance.test.ts` enforces the rules marked **(tested)**, so breaking one fails CI.

The model is a bank: a calm marketing site with real people on it, and a separate, plain app for the money. It must never claim to be one (see Words).

## Two sites, one domain

| Site      | URL                                               | Frame                                     | Code                              |
| --------- | ------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| Marketing | `/`, `/about`, `/contact`, `/roadmap`, `/legal/*` | Header, deep-violet footer; light or dark | `app/(site)`, `layouts/site`      |
| App       | `/app/*`                                          | Grey sidebar, white page, tabs on phones  | `app/(wallet)/app`, `layouts/app` |
| Sign-in   | `/login`, `/signup`, `/auth/*`                    | Its own full screen                       | `app/(wallet)`                    |

- The marketing site loads no auth or wallet code. The app's providers live in `app/(wallet)`.
- The app is signed-in only. A signed-out visitor goes to `/login?next=` and comes back.
- Old app URLs (`/portfolio`, `/swap`, `/trx/…`) redirect in `next.config.mjs`. Links come from `src/routes/paths.ts`, never a typed path.

## The shared parts

Import from `src/components/_common/brand.tsx` and `src/theme/brand-colors.ts` before writing a new one.

| Part                                                | Use it for                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHero`                                          | The top of every page but home and About: eyebrow, the h1, a lede, buttons, an optional photo or card filling the right-hand cell, optional facts as a strip of cells (beside an aside they keep the hero's 7:5 split, so the lines connect; an odd last fact spans the phone row). `compact` for legal, error and notice pages. |
| `PageSection`                                       | Every full-width band after the hero (`divider` draws the line above it). Sets the rhythm and puts the content in the column.                                                                                                                                                                                                    |
| `SectionHeader`                                     | Every section heading: eyebrow, title, subtitle, optional action.                                                                                                                                                                                                                                                                |
| `AppPageHeader`                                     | The title and one-liner on every signed-in page.                                                                                                                                                                                                                                                                                 |
| `BrandButton`                                       | Page-level calls to action, on light or dark.                                                                                                                                                                                                                                                                                    |
| `SegmentedControl`                                  | Switching one view: price range, activity filter, settings tab.                                                                                                                                                                                                                                                                  |
| `IconTile`                                          | The one icon treatment: a line icon in a rounded square, ink or soft grey; on a brand wash, `wash` (a page-coloured tile, the icon in the wash's deep shade).                                                                                                                                                                    |
| `HatchRail`, `HatchFoot`, `HATCH_SX`                | Fine diagonal lines for the empty strips of the grid: a section's foot under its last grid line (`PageSection hatchFoot`), or a rail where a page changes chapter.                                                                                                                                                               |
| `MarketingPhoto`                                    | Every photo on the marketing site, by slot.                                                                                                                                                                                                                                                                                      |
| `Eyebrow`                                           | The small grey label above a heading.                                                                                                                                                                                                                                                                                            |
| `StatementWord`                                     | A coloured phrase in a statement, the logo's colours in order (the home intro, About's mission).                                                                                                                                                                                                                                 |
| `BLOCK_SX`                                          | A white block (dark in dark mode).                                                                                                                                                                                                                                                                                               |
| `AppBlock`, `RowList`, `ListRow`                    | A section of an app page: its title above, then a square box drawn with a hairline; the list inside runs edge to edge, a hairline between each two rows, the whole row the link (`components/_common/app-ui.tsx`).                                                                                                               |
| `SummaryBlock`, `Headline`, `StatStrip`             | The box at the top of an app page: its main figure in ink at display size, the page's actions beside it, and under a hairline the figures that break it down.                                                                                                                                                                    |
| `ActionButton`, `ActionRow`                         | The square buttons beside a main figure: the first ink, the rest outlined. On phones two to a row; an odd count gives the first a row of its own, six go three to a row.                                                                                                                                                         |
| `HoldingsTable`                                     | What someone holds as a table (`components/_common/holdings-table.tsx`): asset, price and its 24-hour change, a 24-hour line, market cap and rank, value and amount. Full on Assets (with group bands and a header row), compact on Home.                                                                                        |
| `Sparkline`, `formatPrice`, `formatCompactUsd`      | A small price line in the coin's colour over a dashed opening line; a price with the decimals it needs ($0.2987); big money in short ($1.74T).                                                                                                                                                                                   |
| `RowIcon`, `StatusBadge`, `Change`                  | A row's grey round icon, pending and failed, a 24-hour price change.                                                                                                                                                                                                                                                             |
| `formatUsd`, `formatCoin`, `assetName`, `appLocale` | Money and coins in plain words, the everyday names, dates in the app's language.                                                                                                                                                                                                                                                 |
| `FlowView`, `FlowHost`, `FlowPortal`, `FlowNotice`  | The page every deposit, withdrawal and swap opens on (`components/_common/flow`): the review, then the live journey of the money. The plans, one per way money moves, are in `lib/flow/plans.ts`; the run's rules in `lib/flow/run.ts`.                                                                                          |

## Colour (tested)

Ink, white and the grey canvas carry every screen. **Colour appears only where it means something**, never as decoration: a page looks calm because most of it has none. Each logo colour has one job, so it always means the same thing. Pick a colour by role (`roleColor('savings')`), never by hue.

The values live in `src/theme/brand-colors.ts`, in two modes (`PALETTE`, `HUE_PALETTE`). Components never use a value directly: they import the tokens (`INK`, `PAPER`, `BRAND_COLORS.sky.tint`, ...), which are CSS variables (`--nf-*`), so one component is right in both modes without knowing which is on (see Dark mode). `FIXED` holds the few colours that never change with the mode: words and buttons over a photo, the drawing of the app on the hero phone.

The tones are customer.io's, sampled from their site: their case-study cards (**tint** and **deep**). The colours they don't show follow the rule their cards obey: the tint is about 10% of the colour on white, the deep shade the colour at about 56% brightness. Light mode:

| Role        | Colour  | Logo fill | Tint      | Deep      | Job                                           |
| ----------- | ------- | --------- | --------- | --------- | --------------------------------------------- |
| `crypto`    | Violet  | `#947BFF` | `#F1ECF9` | `#3E236A` | Crypto and swap                               |
| `money`     | Coral   | `#FF6F4C` | `#FDF0E9` | `#863D1C` | Adding money and cashing out                  |
| `wallet`    | Sky     | `#00AFF7` | `#E2F4FF` | `#123A88` | Wallet and cash, sending and receiving        |
| `attention` | Magenta | `#F8279C` | `#F8E9F1` | `#651440` | Security prompts, the notification dot, "New" |
| `highlight` | Yellow  | `#FFE13D` | `#FCF6E7` | `#7E5E08` | The highlight, pending                        |
| `savings`   | Mint    | `#2DE9C8` | `#ECF6EE` | `#245B2D` | Savings, growth, success                      |

Dark mode lifts each tone so it reads on the dark page (`HUE_PALETTE[hue].dark`).

Which tone, where:

- **Tint** is a surface: a cell, a card, a panel. On the marketing site it fills a cell or the column between the frame lines, never the full width of the screen.
- **Deep** is every word on a tint, at any size (the Savings card, the quotes, the FAQ support card), and small coloured words on the page. 4.5:1 on white and on its tint, in both modes **(tested)**.
- **Solid** (the deep shade as the surface, its tint for every word, the same tested pair) is for the loudest ask only. Normal's card in About's values takes the mode's pair, so in dark mode the two swap lightness. The closing carousel (`HomeCta`: five asks, each a block of colour in the logo's order, sky, violet, magenta, coral, yellow, with a real screen of the app in a phone rising from its foot) takes its own pair (`BLOCK_COLORS`), the same in both modes: the logo colour half and half with white, every word in the light-mode deep shade. The deep shades read heavy as whole blocks and the dark mode's tones dusty on white; on the dark page these glow (owner's call). Never an ink or near-black band.
- **The statement** is the one place for coloured words on the plain page: the home statement's six phrases run through the logo's gradient in its order, light blue, purple, magenta, raspberry, orange, gold (`STATEMENT_COLORS`, through `StatementWord`); About's mission takes the first five. Purple, raspberry, orange and gold are customer.io's statement tones; the light blue and the magenta are made at the same lightness. No green: the logo has none. Display size only (32px and up), never body text, never on a tint: the light gold is 2.2:1 on white **(tested)**.
- **Logo fill** is for dots and bars only (the roadmap's status dots). None is readable as text on white **(tested)**.
- **The app:** information only: categories, the allocation bar, activity types, status, a positive figure.
- **Never:** icons, buttons, borders, or a heading in colour on the plain page. Icons are ink (`IconTile`); on a wash an icon takes the deep shade like the words (`IconTile tone="wash"`). No coloured eyebrows or dots.
- **Other brands.** On Contact each network's cell takes that network's own colours (`SOCIAL_COLORS`: a wash and deep words per network, both modes, tested), with its real logo in its own colour on a white tile. Third-party marks keep their colours; Normal's own icons stay ink.
- **A colour per cell: three sections, the owner's call.** Contact's channels (above); Roadmap's principles ("How we build"), each on its own wash in the logo's order (sky, violet, magenta, coral); About's five core values, the same order with yellow last, the first still the big featured cell. Nowhere else: a section has one focal point (see Layout).

- The logo's first colour, aqua `#75FFFF`, can't be seen on white (1.2:1); mint stands in for it.
- Errors are red `#B91C1C`, never magenta, so "look at this" never reads as "broken".
- **No gradients.** The logo file is the only one. The hatch is drawn with a repeating gradient but is hard 1px lines, no fade (listed in the test). Headings are one colour: no two-tone titles.

| Neutral (token)                                                    | Light                    | Dark                     |
| ------------------------------------------------------------------ | ------------------------ | ------------------------ |
| `INK`: text, primary buttons                                       | `#0A0A0F`                | `#F3F2F7`                |
| `INK_SOFT`: strong body text, nav links, hover on ink              | `#2A2A33`                | `#D3D2DB`                |
| `MUTED`: secondary text                                            | `#6B6B76`                | `#A3A2AE`                |
| `FAINT`: disabled and placeholder only                             | `#9A9AA3`                | `#6F6E7A`                |
| `PAPER`: the page, blocks, words on an ink button, the app sidebar | `#FFFFFF`                | `#0C0B11`                |
| `CANVAS`: the app's page; wells, icon tiles, tab tracks and panels | `#F4F4F7`                | `#17161E`                |
| `HAIRLINE_COLOR`: every border                                     | `rgba(10,10,15,0.08)`    | `rgba(255,255,255,0.09)` |
| `HAIRLINE_STRONG`: inputs, outlined buttons, hover                 | `rgba(10,10,15,0.14)`    | `rgba(255,255,255,0.16)` |
| `HOVER`: a hover wash on a plain surface                           | `rgba(10,10,15,0.05)`    | `rgba(255,255,255,0.06)` |
| `BAND`: an ink band on the older pages                             | `#0A0A0F`                | `#15141B`                |
| `FOOTER_BG`: the footer, plain ink                                 | `#0A0A0F`                | `#08080B`                |
| Hairline on a dark surface                                         | `rgba(255,255,255,0.08)` | the same                 |

Disabled buttons are always `rgba(10,10,15,0.08)` with `#9A9AA3` text.

## Dark mode (tested)

The marketing site has a light and a dark mode. The app and sign-in stay light for now.

- One attribute drives it: `html[data-site-theme="light" | "dark"]`. `SITE_THEME_CSS` (`src/theme/site-theme.ts`) writes every token for both modes into the page head, and points MUI's own palette variables at the dark values too, so typography, menus and dialogs follow.
- A small script in the head sets the attribute before the first paint, from the visitor's choice (`localStorage` `nf-theme`) or, without one, their system setting, so the page never flashes the wrong mode.
- The one switch is in the header (sun and moon), 40px square like the button beside it. Until it is used the site follows the system setting. The site layout keeps the attribute in step and removes it when the visitor goes into the app.
- The app routes (`APP_PATHS`: `/app`, `/login`, `/signup`, `/auth`, `/dev`) never get the attribute: their screens still use fixed light colours. To bring a route in, move its screens to the tokens, then take it out of `APP_PATHS`.
- Marketing files take every colour from the tokens: no hex values, no ink alphas, no `grey.*` or `common.*` **(tested)**. White and white alphas are fine on surfaces that are dark in both modes (the footer, photos, ink bands). A stock MUI contained button is a fixed dark grey that vanishes on the dark page: use `BrandButton`, or `INK_BUTTON_SX` / `OUTLINED_BUTTON_SX` on a plain `Button`.
- Logos on the page are drawn white in dark mode (`Backers`). Photos, and the drawing of the app on the hero phone, are the same in both modes.

## Depth (tested)

The design is flat. Depth comes from a hairline: a box is its line, on the white page.

- No shadows anywhere: not on blocks, buttons, menus or hover, and no rings either. A focus mark is an `outline`.
- The one gradient besides the logo is the hero's scrim: a fade from ink to nothing over the photo so the headline reads. It is listed as an exception in the test.
- Hover changes the border or the background.
- No background blur. Both headers are solid white, so nothing needs one.

## Nothing moves (tested)

- Nothing slides, lifts, scales, bounces, scrolls on its own or shakes.
- What may change: colour, opacity and numbers. A section may fade in as it arrives (`Reveal`), a number may count up, a demo may show digits appearing (the hero phone, the 2FA card). All of it honours `prefers-reduced-motion`.
- The theme does the rest: no button ripple, menus and tooltips fade, drawers appear in place, input labels jump rather than slide.
- An error says what went wrong in words; it never shakes.

## Corners (tested)

Corners are CSS variables in `src/global.css`. Change a value there and every page follows. Never write a pixel radius.

| Token           | Value  | Use                                                                    |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `--radius-lg`   | 0      | Every block: cards, panels, dialogs, popovers, menus                   |
| `--radius-md`   | 0      | Buttons, inputs, tabs, nested tiles and rows, icon-only buttons        |
| `--radius-site` | 0      | Every marketing surface: cells, cards, photos, panels, the quote cards |
| `--radius-sm`   | 0      | Badges, chips, tooltips, menu items, items inside a segmented control  |
| `--radius-xs`   | 0      | Progress tracks, tiny tags                                             |
| `--radius-full` | 999px  | Switches                                                               |
| `'50%'`         | circle | True circles only: avatars, token icons, status dots, step numbers     |

**Everything is square**, the marketing site and the app alike (the owner's call, 2026-11-06): every token is 0, and MUI's own `shape.borderRadius` is 0 to match. The roles stay, so a corner could come back in one place. Circles stay circles (avatars, coins, dots) and switches stay pills. The measured exceptions are drawings of a phone: the hero phone's screen and notch, which match the phone in the photo, and the closing carousel's phones. The mobile app still has rounded corners: it follows only when the owner says so.

## Type

Satoshi for words, Geist Mono for numbers and addresses. Medium (500) is the heaviest weight. Do not use 600 or 700.

**The marketing site** uses the nine-step ladder in `src/theme/type-scale.ts` (`TYPE`) and no other size. Phone / desktop:

| Step        | Size                           | Job                                                                     |
| ----------- | ------------------------------ | ----------------------------------------------------------------------- |
| `display`   | 56 / clamp(76px, 7.2vw, 104px) | The hero's one line                                                     |
| `statement` | 32 / clamp(40px, 4vw, 56px)    | A statement set as a paragraph: the intro, the Savings line             |
| `h2`        | 38 / clamp(46px, 4.4vw, 62px)  | Every section title                                                     |
| `h3`        | 26 / 32                        | A cell's title: a product, a step                                       |
| `h4`        | 20 / 23                        | A smaller cell's title: an asset, a security point, a question, a quote |
| `lead`      | 18 / 21                        | The paragraph under a title                                             |
| `body`      | 16 / 17                        | Body text in a cell                                                     |
| `small`     | 15                             | Notes, roles, the line under a figure                                   |
| `caption`   | 13                             | Fine print and labels                                                   |
| `eyebrow`   | 12, uppercase, 0.14em          | The label above a title, plain grey                                     |

Drawings of the app (the hero phone, the product slices) keep the app's own sizes: they are the app.

**The app**

| Style                        | Size                 | Tracking |
| ---------------------------- | -------------------- | -------- |
| App page title               | 24px to 28px         | -0.025em |
| Card title in the app        | 15px                 | none     |
| Body                         | 16px, muted          | none     |
| Small body                   | 13px to 14px         | none     |
| Eyebrow and uppercase labels | 11px, uppercase, 500 | 0.16em   |

Eyebrows never start with a dash or line **(tested)**.

## Layout (tested)

- One content width: `--page-max`, 1200px, with 24px gutters and 16px on phones. Legal pages are the one exception: long text stays readable in a 900px column.
- One rhythm: `--section-y`, 96px on desktop and 64px on phones. Two light bands in a row share one gap.
- Blocks use 24px padding, 20px on phones. Grid gaps are 16px, 12px on phones.

**The marketing site**

- The landing page is white, set on a **hairline grid**: two vertical frame lines at the column edges run through the header, the page and the footer (`FrameLines`, drawn by `layouts/site`), every section is divided by a hairline (`PageSection divider`), and grouped content is laid out as **cells** sharing hairline borders (the products, the steps, the backers, the FAQ), the way customer.io sets its pages. The lines run **at every width**, phones included: on a screen narrower than the column they stand `--frame-inset` in from its edges (12px on phones, 24px on tablets), and the column (`COLUMN_SX`) is the screen less that inset on each side. Every section puts its content, cells and tints in that column. Text and controls sit **inside the lines** by the gutter (`GUTTER_SX`: 16px on phones, 24px on tablets, 32px at full width); nothing touches a line. Grids of cells reach the lines and use them as their sides at every width (`GRID_FRAME_SX`: negative margin, no side borders), so there is never a second line beside the frame. A carousel snaps its first card to the gutter (`scroll-padding`), not to the line. The frame lines are drawn on their own layer above the sections (`FRAME_LINES_Z`), so a section's background never hides them. A tint fills the column between the lines and stops there (Savings), or a cell of it (Security, the products); outside the lines the page stays plain. Rows of cells stacked one under another share their column lines: a wider cell spans columns of the same grid rather than starting a grid of its own, so every line runs straight on. No ink bands in the content; the **footer**, plain ink (`FOOTER_BG`, a shade darker than the page in dark mode, under a hairline), is the one dark surface.
- The header: the small mark (32px), the Product and Resources dropdowns, plain links, then Log in and Open account. Signed in, it shows **Dashboard** with the user's avatar instead. Dropdowns fade in place.
- The home hero runs the full width of the screen, not boxed in the column. It sits above the page's frame lines (`FRAME_LINES_Z + 1`) and draws its own over the photo in white (`FrameLines tone="dark"`), so the lines run on through it. The photo, a hand holding a phone with a blank screen, is widened to 2.4:1 (its blurred background stretched out to the left), with the real Home screen laid over the screen in code (`HeroPhone`: measured corners, a `matrix3d`, re-fitted to the crop the page applies at each width). The headline sits over the photo's left side, lined up with the column, on a scrim that is gone before the phone. On phones the words go under the photo, and the strip after them draws its own top line (on wider screens the photo's edge is that line).
- Under the hero: the backers strip, then the statement, the one centred block, its six coloured phrases set as in Colour.
- About opens like home, on a photo edge to edge: the team at Meridian 2026 (`MarketingPhoto slot="about"`), above the frame lines and drawing its own over it, in a stronger white on a light photo (`FrameLines tone="bright"`), where the home hero's faint one would vanish. As tall as the home hero on wide screens, the whole photo on phones and tablets; nothing written on it. Under it the mission as one statement, set like home's (`StatementWord`), the page's h1 the small label above it; then the partners strip.
- A gallery (About's moments): every row the same height, at most four photos across. A single cell is upright (3:4); a landscape takes two columns at 3:2, which comes out exactly as tall. Four columns on wide screens, each row two uprights and one landscape, the landscape right, left, right, never two in a row; two columns on phones and tablets, where each landscape follows its row's pair. A cell spans columns, never rows. A photo whose people are small in the frame is cropped close in its file, not zoomed in CSS.
- **Hatching** fills empty strips of the grid, never space behind words or a photo: fine diagonal lines 8px apart, in the strong hairline colour so they weigh what the grid lines weigh (`HATCH_SX`). Every hatched strip is one height (`HATCH_HEIGHT`: 48px, 32px on phones), so they read as one system. A section that ends on a grid of cells has a hatched foot instead of empty padding under it (`PageSection hatchFoot`): the strip between the grid's last line and the next section's first. Where a page changes chapter without one (after its opening, before its close), a `HatchRail` draws the strip. Never two strips in a row.
- The close (`HomeCta`, on Home, About and Contact) is a carousel of five asks: one fills the column at a time, its neighbours showing past the frame lines. It moves only when the visitor moves it, with previous and next under it (off at the ends) and a swipe on phones. Nothing plays on its own.
- Roadmap's milestones are a board in three chapters, oldest first: what shipped on the mint wash (done), what is being built now as solid blocks (`BLOCK_COLORS.sky`, the section's focal point), what is planned left plain. Each chapter's header is a row across the board, and hatched cells finish a chapter's last row at each width. The board draws its lines as 1px gaps over the hairline colour (`gap: 1px` on a `HAIRLINE_COLOR` grid), so they stay straight whatever the filter shows.
- **A section has one focal point.** Equal cells of grey text read as bland; equal cells each in its own colour read as too much. Feature one thing (one wash, one figure) and set the rest calmly beside it, laid out the way the section's words read.
- A token drawn on the page sits on a white coin, the same in both modes: some marks are black and would vanish on the dark page. A token's network is a badge on its coin and is named in words too (USDC on Stellar).
- A case-study card (Savings) reads top to bottom: the label right above the statement, then the figures and the ask at the foot, the fine print last.
- Security is a set of tabs: each safeguard is a tab (arrow keys move between them), its demo plays on the right on its own wash, in the logo's order (sky, violet, magenta, yellow), and the chosen row turns light grey (`CANVAS`) with an ink icon. The demos (`sections/home/security-demos.tsx`) are dialogs from the app played on a loop by `useDemoStep`: fades and swapped words only, resting on the last step with reduced motion. A demo shows only what the product does today.
- Visuals are real people (`MarketingPhoto`) and the real app (`PhoneMockup`, slices of real screens). No illustrations, no stock icons standing in for a picture.
- Section headers are left-aligned. Eyebrows are plain grey text.
- Backers appear as their marks (`Backers`), at one visual weight, their labels on one line; white in dark mode.
- Words are for people who don't know crypto: "digital dollars", not "stablecoins"; say what something does for them before what it is.
- No em dashes in the copy: a comma, a colon or a full stop instead.

**The app**

- It should read like a bank's online banking, not a game: white, square, hairlines and ink. Colour only where it means something: a rise (green), a failure (red), pending (yellow). The coins bring the rest.
- Desktop: a 248px sidebar on the light grey, its pages in groups under small grey labels (Home, Assets, Activity; Products: Savings, Swap; Account: Settings, Help; Log out at the bottom), a white top bar with **Move money** and the account, and the page itself white.
- The current page in the sidebar sits on a white tile with a hairline; the rest are plain words.
- Phones: a top bar (logo, account) and five bottom tabs: Home, Assets, Move, Savings, Activity.
- Every way money moves (add, send, receive, swap, cash out) starts from **Move money**. Home's balance block offers the same four (Add money, Send, Receive, Swap) through the same flows (`startAction`).
- A page is its title and a grey line under it (`AppPageHeader`), then sections: a grey title above a square box drawn with a hairline (`AppBlock`; lists run edge to edge, `RowList` and `ListRow`). Every title row is one height, so boxes side by side start level.
- The top of a page is its `SummaryBlock`: the main figure in ink (`Headline`: the balance on Home, an asset's balance, the savings balance), the page's actions beside it (`ActionButton`, the first ink), and under a hairline the figures that break it down (`StatStrip`). No bright blocks, no ink cards.
- On wide screens the rest sits in two columns, the main one wider (Home: your money, then recent activity; Savings: earnings and history, then deposit or withdraw). On phones the action comes first.
- Savings has its own page. Elsewhere it is one row among the assets ("Your money", Assets), never a block of its own.
- **Money in plain words.** Dollars to two decimals (`formatUsd`), coins with as many decimals as they need and no more (`formatCoin`: 0.0142 BTC), in the UI face with even digits (`FIGURES`). Mono only for addresses and hashes. USDC is "digital dollars" (`assetName`, `assetNoun` inside a sentence). Dates and times in the app's language (`appLocale`), never the browser's.
- **Activity reads as sentences**, grouped by day: "Received digital dollars, from GASJ…XVYV, +$50.00". Money in is +, money out is −, a move inside the account (savings, a swap) carries no sign. Each row's icon is grey (`RowIcon`) and says the kind; only pending (yellow) and failed (red) are coloured (`StatusBadge`). A hairline runs between days. Home shows the five newest with "See all".
- Where the money is: figures side by side (`StatStrip`), always digital dollars, crypto, savings, in that order, each with its share of the total.
- **Every row has a line under it**, in every list: assets, activity (also within one day), details. `ROW_LINES` draws them; its selector must outrank MUI's ButtonBase, which resets the border of every linked row.
- **Holdings are a table** (`HoldingsTable`). Columns drop away as the screen narrows, never squeeze: phones keep the asset and its value, tablets add the 24-hour line, laptops the price, desktops the market cap. Groups (digital dollars, crypto, savings) sit under grey bands with their totals. Savings has no price, line or market cap: its cells stay empty.
- **A coin's price line is drawn in the colour it is known by** (`assetColor`): a chain's coin in the chain's brand colour from `CHAINS`, the digital dollar in Circle's blue, Stellar's coin in the black of its logo. This is the one place colour names something rather than signals; the change beside it keeps the shared green and grey (`Change`).
- **Price lines run edge to edge**, with no axes: a faint flat wash of the coin's colour under the line (never a gradient), a dashed line at the price the range opened on, the range's high and low marked where they happen, and a dot on now. Pointing at the line, dragging a finger along it or the arrow keys read the price and time at that point into the figures above; screen readers hear it.
- A line never spans less than 2% of its price, 10% for a digital dollar (`minSpanFor`, `priceDomain`), so a coin that barely moved draws flat. A digital dollar gets a chart like any coin, and it is flat, which is the honest picture of a dollar.
- **An asset's page**, top to bottom: the coin and its name; its balance with what is held, its share of your money and how it moved today, and the actions; the price; the market (market cap and rank, traded today, supply with the limit when there is one, the all-time high, today's range); what the coin is in plain words beside its details; its activity. Every coin can be swapped from its page.
- Market data comes from our own cached `/api/prices/markets` (CoinGecko, one shared call every five minutes), and the page says where it is from.

**Moving money: review first, then follow it**

- **Nothing moves until the person confirms on a review page.** A deposit, withdrawal or swap button says "Review …" and opens the review in place of the page, inside the app: the sidebar stays (`FlowHost` hides the page, the card renders the review into it with `FlowPortal` and stays mounted, so the run keeps its state). The review shows every step and a summary; only its Confirm button starts the 2FA code (when on) and the signatures. Edit, the page's Back link and the browser's Back return to the filled-in form.
- **The journey is places and steps.** Every place the money can be (the person's own wallets and addresses, Circle, an exchange, the savings vault) is a grey band, the way groups sit in the holdings table; the steps between them sit on a numbered rail. Each step says what happens in plain words, who does it (You, Normal, Circle, the network, the exchange) and how long it usually takes. Own addresses are marked "Yours" and link to their explorer.
- **Where the money is, at every moment.** One box above the steps answers it ("Your money is in Circle", "on its way to your Bitcoin wallet"), with the step count and a clock. The band where the money sits says "Your money is here"; a step that carries it says "On its way". After a calm ending (a bridge sent it back) the box says "Your money is back in".
- **Colour only for meaning:** a finished step is a green tick, a step waiting on the person's prompt is yellow ("Waiting for you"), a failed step is red; everything else is ink and grey. A finished step keeps its time and a link to the network's own record (stellar.expert, mempool.space, basescan.org, LI.FI); a confirmed Stellar step names its ledger.
- **Endings say where the money is:** done (green panel, "Done in 1 min 21s"), stopped (red words, the money's place in the box, the ways out: Try again only while nothing has moved; Finish the swap or Bring back as USDC once it has), ended calmly (grey, nothing lost), on its way (Normal finishes it on its own servers).
- **Leaving:** while a step needs the page (a prompt can still open, or the next leg is driven from it), a link inside the app asks first and closing the tab gets the browser's own prompt. Once the rest finishes without the page, the page says so and lets the person go.

## Photos

- Real people, licensed from Envato with model releases, never AI-generated. One colour grade across the set, natural light, everyday places.
- Every photo is a `MarketingPhoto` slot (`src/components/_common/marketing-photo.tsx`). The slots hold free Pexels photos for now; each is swapped for its Envato photo by changing `src`. A slot without a photo shows its brief. The `about` slot is the team's own photo, not stock.
- The home hero and the About photos ship in the repo (`public/marketing`, `public/about`), as JPEGs at two or three widths for `srcSet`, converted to sRGB with every bit of metadata stripped: a phone photo carries the camera and often the place it was taken.
- Photos are square on the marketing site (`--radius-site`). Export at the size the slot lists, as WebP, to the CDN under `marketing/`.
- A phone in a photo shows the real app, never a made-up screen.

## Buttons

| Type   | Height | Notes                                                    |
| ------ | ------ | -------------------------------------------------------- |
| Large  | 48px   | Page-level calls to action and the main action in a card |
| Medium | 40px   | Default, and the header and top-bar buttons              |
| Small  | 32px   | Inline actions                                           |

Primary is an ink fill with page-coloured words, so it inverts in dark mode; over a photo it is white in both modes. Secondary is a hairline outline. A button with an `href` navigates through Next's router (set in the theme).

## Words

- Never "bank", "banking", "FDIC", "insured" or "guaranteed" about Normal. The footer says plainly that Normal is not a bank.
- A number is live or left out. No made-up balances, and no partner's numbers presented as ours.
- Only what the product does today. A feature joins the marketing site when it is on in production.

## Adding an exception

Exceptions live in the lists at the top of `design-conformance.test.ts`, each with its reason. If you cannot write the reason in one line, it is probably not an exception.
