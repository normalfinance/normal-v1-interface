// ----------------------------------------------------------------------

// The marketing site's type ladder. Nine steps, each one job; a page never
// picks a size outside them. Everything is weight 500 or 400 (DESIGN.md).
// Sizes are phone / desktop; the big ones scale with the viewport between.
export const TYPE = {
  /** The hero's one line. */
  display: {
    fontSize: { xs: 56, sm: 72, md: 'clamp(76px, 7.2vw, 104px)' },
    fontWeight: 500,
    lineHeight: 0.96,
    letterSpacing: '-0.045em',
  },
  /** A statement set as a paragraph: the intro, the Savings line. */
  statement: {
    fontSize: { xs: 32, md: 'clamp(40px, 4vw, 56px)' },
    fontWeight: 500,
    lineHeight: 1.15,
    letterSpacing: '-0.03em',
  },
  /** Every section title. */
  h2: {
    fontSize: { xs: 38, md: 'clamp(46px, 4.4vw, 62px)' },
    fontWeight: 500,
    lineHeight: 1.04,
    letterSpacing: '-0.035em',
  },
  /** A cell's title: a product, a step. */
  h3: {
    fontSize: { xs: 26, md: 32 },
    fontWeight: 500,
    lineHeight: 1.15,
    letterSpacing: '-0.025em',
  },
  /** A smaller cell's title: an asset, a security point, a question. */
  h4: {
    fontSize: { xs: 20, md: 23 },
    fontWeight: 500,
    lineHeight: 1.25,
    letterSpacing: '-0.015em',
  },
  /** The paragraph under a title. */
  lead: { fontSize: { xs: 18, md: 21 }, fontWeight: 400, lineHeight: 1.5 },
  /** Body text in a cell. */
  body: { fontSize: { xs: 16, md: 17 }, fontWeight: 400, lineHeight: 1.6 },
  /** Notes, roles, the line under a figure. */
  small: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  /** Fine print and labels. */
  caption: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
  /** The label above a title. */
  eyebrow: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
  },
} as const;
