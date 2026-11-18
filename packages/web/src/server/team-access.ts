// ---------------------------------------------------------------------------
// Who may open /dashboard/team: signed-in Normal accounts whose email is on
// the DASHBOARD_TEAM_EMAILS list (comma, semicolon or space separated), set
// in Vercel. Unset or empty means nobody: the page fails closed.
// ---------------------------------------------------------------------------

export function parseTeamEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes('@'))
  );
}

export function isTeamEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.DASHBOARD_TEAM_EMAILS
): boolean {
  if (!email) return false;
  return parseTeamEmails(raw).has(email.trim().toLowerCase());
}
