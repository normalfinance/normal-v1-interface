import fs from 'fs';
import path from 'path';

import { auditEnv, collectEnvVars, parseDeclaredEnv } from './turbo-env-audit';

describe('turbo env audit helpers', () => {
  it('finds every process.env read', () => {
    const src = `
      const a = process.env.TURNKEY_API_PRIVATE_KEY;
      if (process.env.NEXT_PUBLIC_TURNKEY_RP_ID) {}
      const dup = process.env.TURNKEY_API_PRIVATE_KEY;
    `;
    expect(collectEnvVars(src).sort()).toEqual([
      'NEXT_PUBLIC_TURNKEY_RP_ID',
      'TURNKEY_API_PRIVATE_KEY',
    ]);
  });

  it('ignores lookalikes that are not env reads', () => {
    expect(collectEnvVars('const NEXT_PUBLIC_FAKE = 1; obj.env.NOT_THIS;')).toEqual([]);
  });

  it('reads declarations out of JSONC, comments and all', () => {
    const jsonc = `{
      // "COMMENTED_OUT" should not count
      "globalEnv": ["NODE_ENV", "DATABASE_URL"],
    }`;
    const declared = parseDeclaredEnv(jsonc);
    expect(declared).toContain('NODE_ENV');
    expect(declared).toContain('DATABASE_URL');
    expect(declared).not.toContain('COMMENTED_OUT');
  });

  it('separates undeclared reads from dead declarations', () => {
    const { missing, unused } = auditEnv(['A', 'B'], ['B', 'C']);
    expect(missing).toEqual(['A']);
    expect(unused).toEqual(['C']);
  });
});

// ---------------------------------------------------------------------------
// The guard itself. It runs in CI with the rest of the suite, so an
// undeclared variable fails the build the moment it is added — the list in
// turbo.jsonc cannot silently rot the way it did before (68 undeclared as of
// 2026-08-24).
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('turbo.jsonc declares every environment variable the app reads', () => {
  it('has no undeclared variables', () => {
    const webSrc = path.resolve(__dirname, '..');
    const utilsSrc = path.resolve(__dirname, '../../../utils/src');
    const turboPath = path.resolve(__dirname, '../../../../turbo.jsonc');

    const files = [...walk(webSrc), ...(fs.existsSync(utilsSrc) ? walk(utilsSrc) : [])];
    const used = new Set<string>();
    for (const f of files) {
      for (const v of collectEnvVars(fs.readFileSync(f, 'utf8'))) used.add(v);
    }

    const declared = parseDeclaredEnv(fs.readFileSync(turboPath, 'utf8'));
    const { missing } = auditEnv([...used], declared);

    // If this fails: add the names below to globalEnv in turbo.jsonc.
    // Leaving them out means a changed value can ship inside a cached build.
    expect(missing).toEqual([]);
  });
});
