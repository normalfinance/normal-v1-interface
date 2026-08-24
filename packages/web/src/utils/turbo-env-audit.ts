// Keeping turbo.jsonc's env declarations honest.
//
// Turbo decides "did anything change since the last build?" by hashing the
// inputs it has been TOLD about. A variable the app reads but turbo does not
// know about is invisible to that hash, so:
//
//   change NEXT_PUBLIC_TURNKEY_RP_ID → rebuild → turbo reports a cache HIT →
//   the previous bundle ships, still carrying the old value
//
// and nothing in the diff explains it. It bites hardest on NEXT_PUBLIC_*,
// which Next.js inlines into the JavaScript at build time. We already lost a
// day to a config-versus-bundle disagreement over exactly that variable.
//
// These helpers are pure so the guard that enforces the rule can itself be
// tested — a silent guard would be worse than none.

/** Every `process.env.X` read in a source file. */
export function collectEnvVars(source: string): string[] {
  const found = new Set<string>();
  const re = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  let m = re.exec(source);
  while (m) {
    found.add(m[1]);
    m = re.exec(source);
  }
  return [...found];
}

/** Every name declared in turbo.jsonc, comments stripped.
 *  Deliberately tolerant of JSONC: turbo.jsonc carries `//` comments and
 *  trailing commas, so this reads the quoted SCREAMING_CASE names rather than
 *  attempting to parse it as JSON. */
export function parseDeclaredEnv(jsonc: string): string[] {
  const withoutComments = jsonc.replace(/\/\/[^\n]*/g, '');
  const found = new Set<string>();
  const re = /"([A-Z_][A-Z0-9_]*)"/g;
  let m = re.exec(withoutComments);
  while (m) {
    found.add(m[1]);
    m = re.exec(withoutComments);
  }
  return [...found];
}

export interface EnvAudit {
  /** Read by the app, never declared — these break the cache hash. */
  missing: string[];
  /** Declared but read nowhere — dead weight, and for secrets, liability. */
  unused: string[];
}

export function auditEnv(used: string[], declared: string[]): EnvAudit {
  const declaredSet = new Set(declared);
  const usedSet = new Set(used);
  return {
    missing: used.filter((v) => !declaredSet.has(v)).sort(),
    unused: declared.filter((v) => !usedSet.has(v)).sort(),
  };
}
