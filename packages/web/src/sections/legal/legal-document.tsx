import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';

import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isValidElement } from 'react';
import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import ReactMarkdown from 'react-markdown';
import { GUTTER_SX, COLUMN_SX } from '@/theme/site-grid';
import { INK, MUTED, CANVAS, INK_SOFT, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Eyebrow } from '@/components/_common/brand';
import { PageHero } from '@/components/_common/page-hero';

import { LegalLink, LegalNavLink } from './legal-link';

// ----------------------------------------------------------------------

// The four legal pages share this layout: the title in a compact hero, then
// the document in one readable column, with the other documents and this
// one's contents in a rail on its left at desktop. The text is each view's
// markdown, untouched: only its title and its version and date lines move up
// into the hero. A server component, so no markdown code ships to the page.

const HAIRLINE = `1px solid ${HAIRLINE_COLOR}`;

/** Clear of the sticky site header (64px, 72px from md) when a heading is jumped to. */
const SCROLL_MARGIN = { xs: '88px', md: '104px' };

export type LegalPage = 'tos' | 'pp' | 'disclaimer' | 'deleteAccount';

const DOCUMENTS: { page: LegalPage; title: string; href: string }[] = [
  { page: 'tos', title: 'Terms of service', href: paths.legal.tos },
  { page: 'pp', title: 'Privacy policy', href: paths.legal.pp },
  { page: 'disclaimer', title: 'Disclaimer', href: paths.legal.disclaimer },
  { page: 'deleteAccount', title: 'Delete your Normal account', href: paths.legal.deleteAccount },
];

type Heading = { id: string; label: string };

// ----------------------------------------------------------------------

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * A section title set in capitals ("1. DESCRIPTION OF THE SERVICES") is shown
 * in sentence case, like every heading on the site; the Terms say their
 * section titles are for convenience only. Paragraphs keep their capitals.
 */
function sentenceCase(text: string) {
  if (!/[A-Z]/.test(text) || text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/[a-z]/, (letter) => letter.toUpperCase());
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/** Splits off what the hero shows: the '# TITLE' and the version and date lines under it. */
function splitDocument(markdown: string) {
  const blocks = markdown.trim().split(/\n{2,}/);
  if (blocks[0]?.startsWith('# ')) blocks.shift();

  let version: string | undefined;
  let updated: string | undefined;
  while (blocks.length > 0) {
    const versionLine = blocks[0].match(/^Version\s+(\S+)$/);
    const updatedLine = blocks[0].match(/^Last Updated:\s*(.+)$/);
    if (versionLine) [, version] = versionLine;
    else if (updatedLine) [, updated] = updatedLine;
    else break;
    blocks.shift();
  }

  const body = blocks.join('\n\n');
  const headings: Heading[] = Array.from(body.matchAll(/^## (.+)$/gm), ([, text]) => ({
    id: slugify(text),
    label: sentenceCase(text.trim()),
  }));

  return { version, updated, body, headings };
}

function metaLine(version?: string, updated?: string) {
  if (version && updated) return `Version ${version}, last updated ${updated}`;
  if (version) return `Version ${version}`;
  if (updated) return `Last updated ${updated}`;
  return undefined;
}

// ----------------------------------------------------------------------

function SectionTitle({ level, children }: { level: 2 | 3; children: ReactNode }) {
  return (
    <Typography
      component={level === 2 ? 'h2' : 'h3'}
      id={slugify(textOf(children))}
      sx={{
        ...(level === 2 ? TYPE.h3 : TYPE.h4),
        mt: level === 2 ? { xs: 6, md: 8 } : 5,
        mb: 2.5,
        color: INK,
        scrollMarginTop: SCROLL_MARGIN,
        '&:first-child': { mt: 0 },
      }}
    >
      {typeof children === 'string' ? sentenceCase(children) : children}
    </Typography>
  );
}

const LIST_SX = { ...TYPE.body, m: 0, mb: 2.5, pl: 3, color: INK_SOFT } as const;

const CELL_SX = {
  px: 2,
  py: 1.5,
  textAlign: 'left',
  verticalAlign: 'top',
  border: HAIRLINE,
} as const;

const MARKDOWN: Components = {
  h1: ({ children }) => <SectionTitle level={2}>{children}</SectionTitle>,
  h2: ({ children }) => <SectionTitle level={2}>{children}</SectionTitle>,
  h3: ({ children }) => <SectionTitle level={3}>{children}</SectionTitle>,
  p: ({ children }) => (
    <Typography sx={{ ...TYPE.body, mb: 2.5, color: INK_SOFT, '&:last-child': { mb: 0 } }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ ...LIST_SX, listStyleType: 'disc' }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ ...LIST_SX, listStyleType: 'decimal' }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ pl: 0.5, '& + li': { mt: 1 }, '&::marker': { color: MUTED } }}>
      {children}
    </Box>
  ),
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 500, color: INK }}>
      {children}
    </Box>
  ),
  a: ({ href, children }) => <LegalLink href={href}>{children}</LegalLink>,
  hr: () => <Box component="hr" sx={{ my: 6, border: 0, borderTop: HAIRLINE }} />,
  table: ({ children }) => (
    <Box sx={{ my: 4, overflowX: 'auto' }}>
      <Box
        component="table"
        sx={{ ...TYPE.small, width: '100%', minWidth: 560, borderCollapse: 'collapse' }}
      >
        {children}
      </Box>
    </Box>
  ),
  th: ({ children }) => (
    <Box component="th" sx={{ ...CELL_SX, fontWeight: 500, color: INK, bgcolor: CANVAS }}>
      {children}
    </Box>
  ),
  td: ({ children }) => (
    <Box component="td" sx={{ ...CELL_SX, color: INK_SOFT }}>
      {children}
    </Box>
  ),
};

// ----------------------------------------------------------------------

const RAIL_LINK_SX = {
  ...TYPE.small,
  display: 'block',
  py: 0.5,
  color: MUTED,
  textDecoration: 'none',
  '&:hover': { color: INK },
} as const;

/**
 * The other documents, then this one's sections. The sections stay in view
 * under the header as the text scrolls (the Terms' 24 fit a laptop screen);
 * a shorter screen scrolls the list itself.
 */
function Rail({ page, headings }: { page: LegalPage; headings: Heading[] }) {
  return (
    <Box
      sx={{
        display: { xs: 'none', lg: 'block' },
        ...GUTTER_SX,
        py: 'var(--section-y)',
        borderRight: HAIRLINE,
      }}
    >
      <Box component="nav" aria-label="Legal documents">
        <Eyebrow sx={{ mb: 1.5 }}>Documents</Eyebrow>
        <Box component="ul">
          {DOCUMENTS.map((doc) => (
            <li key={doc.page}>
              <LegalNavLink href={doc.href} current={doc.page === page}>
                {doc.title}
              </LegalNavLink>
            </li>
          ))}
        </Box>
      </Box>

      {headings.length > 2 && (
        <Box
          component="nav"
          aria-label="On this page"
          sx={{
            position: 'sticky',
            top: 104,
            maxHeight: 'calc(100vh - 136px)',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            mt: 5,
          }}
        >
          <Eyebrow sx={{ mb: 1.5 }}>On this page</Eyebrow>
          <Box component="ul">
            {headings.map((heading) => (
              <li key={heading.id}>
                <Box component="a" href={`#${heading.id}`} sx={RAIL_LINK_SX}>
                  {heading.label}
                </Box>
              </li>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** A legal page: `markdown` is the document as written, title line included. */
export function LegalDocument({ page, markdown }: { page: LegalPage; markdown: string }) {
  const { version, updated, body, headings } = splitDocument(markdown);
  const title = DOCUMENTS.find((doc) => doc.page === page)?.title ?? '';

  return (
    <>
      <PageHero
        compact
        id="legal-title"
        eyebrow="Legal"
        title={title}
        lede={metaLine(version, updated)}
      />
      <Box sx={{ borderTop: HAIRLINE }}>
        <Box
          sx={{
            ...COLUMN_SX,
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '4fr 8fr' },
          }}
        >
          <Rail page={page} headings={headings} />
          <Box sx={{ ...GUTTER_SX, py: 'var(--section-y)', minWidth: 0 }}>
            <Box component="article" aria-labelledby="legal-title" sx={{ maxWidth: 720 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={MARKDOWN}
              >
                {body}
              </ReactMarkdown>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}
