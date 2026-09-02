#!/usr/bin/env node
/**
 * Converts one of our audit markdown docs into print-ready HTML, styled to
 * match docs/audit/42-tester-guide.html.
 *
 *   node scripts/md-to-html.cjs docs/audit/43-work-so-far-explained.md
 *
 * Then open the generated .html in Chrome and press Ctrl+P (Cmd+P on Mac) →
 * "Save as PDF".
 *
 * Deliberately dependency-free: it handles the markdown subset these documents
 * actually use (headings, tables, lists, bold/italic/code, blockquotes, rules)
 * rather than pulling in a parser. If a doc starts using something exotic, add
 * it here rather than reaching for a library.
 */
const fs = require('fs');
const path = require('path');

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/md-to-html.cjs <file.md>');
  process.exit(1);
}

const src = fs.readFileSync(input, 'utf8');

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline formatting, applied after escaping so user text can't inject markup.
const inline = (s) =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const lines = src.split(/\r?\n/);
const out = [];
let i = 0;
let inList = null; // 'ul' | 'ol'

const closeList = () => {
  if (inList) {
    out.push(`</${inList}>`);
    inList = null;
  }
};

while (i < lines.length) {
  const line = lines[i];

  // Table: a header row followed by a |---|---| separator
  if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
    closeList();
    const cells = (row) =>
      row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());

    out.push('<table>');
    out.push(
      `<tr>${cells(line).map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`
    );
    i += 2;
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      out.push(
        `<tr>${cells(lines[i]).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`
      );
      i += 1;
    }
    out.push('</table>');
    continue;
  }

  // Fenced code block
  if (/^```/.test(line)) {
    closeList();
    i += 1;
    const buf = [];
    while (i < lines.length && !/^```/.test(lines[i])) {
      buf.push(escapeHtml(lines[i]));
      i += 1;
    }
    i += 1;
    out.push(`<pre>${buf.join('\n')}</pre>`);
    continue;
  }

  const heading = line.match(/^(#{1,4})\s+(.*)$/);
  if (heading) {
    closeList();
    const level = heading[1].length;
    out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    i += 1;
    continue;
  }

  if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
    closeList();
    out.push('<hr />');
    i += 1;
    continue;
  }

  if (/^\s*>\s?/.test(line)) {
    closeList();
    out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`);
    i += 1;
    continue;
  }

  const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
  const bullet = line.match(/^\s*[-*]\s+(.*)$/);
  if (ordered || bullet) {
    const want = ordered ? 'ol' : 'ul';
    if (inList !== want) {
      closeList();
      out.push(`<${want}>`);
      inList = want;
    }
    out.push(`<li>${inline((ordered || bullet)[1])}</li>`);
    i += 1;
    continue;
  }

  if (!line.trim()) {
    closeList();
    i += 1;
    continue;
  }

  closeList();
  out.push(`<p>${inline(line)}</p>`);
  i += 1;
}
closeList();

const title = path.basename(input, '.md');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color:#16161a; line-height:1.55; font-size:10.5pt; padding:24px; max-width:190mm; margin-inline:auto; }
  h1 { font-size:21pt; margin:0 0 6px; letter-spacing:-0.02em; }
  h2 { font-size:14pt; margin:24px 0 8px; padding-top:10px; border-top:2px solid #16161a; }
  h3 { font-size:11.5pt; margin:16px 0 6px; }
  h4 { font-size:10.5pt; margin:12px 0 4px; }
  table { width:100%; border-collapse:collapse; margin:10px 0 16px; font-size:9.5pt; }
  th,td { border:1px solid #d8d8de; padding:6px 8px; text-align:left; vertical-align:top; }
  th { background:#f2f2f4; font-weight:600; }
  code { background:#f2f2f4; padding:1px 4px; border-radius:3px; font-size:9.5pt; }
  pre { background:#f6f6f8; border:1px solid #e2e2e8; border-radius:5px; padding:10px 12px;
        font-size:9pt; overflow-x:auto; white-space:pre-wrap; }
  blockquote { border-left:3px solid #c9c9d2; margin:10px 0; padding:4px 0 4px 12px; color:#3c3c46; }
  hr { border:0; border-top:1px solid #d8d8de; margin:18px 0; }
  ul,ol { margin:8px 0 8px 18px; padding:0; } li { margin:3px 0; }
  a { color:#16161a; }
  h2, h3, table { page-break-after: avoid; }
  table, pre, blockquote { page-break-inside: avoid; }
  @media print { body { padding:0; } }
</style></head><body>
${out.join('\n')}
</body></html>`;

const target = input.replace(/\.md$/, '.html');
fs.writeFileSync(target, html);
console.log(`Wrote ${target}`);
console.log('Open it in Chrome, then Ctrl+P (Cmd+P) → "Save as PDF".');
