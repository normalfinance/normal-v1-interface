import { isTeamEmail, parseTeamEmails } from './team-access';

describe('team access', () => {
  it('reads a list separated by commas, semicolons or spaces', () => {
    expect(parseTeamEmails(' A@x.io, b@y.com;c@z.org  d@w.net ')).toEqual(
      new Set(['a@x.io', 'b@y.com', 'c@z.org', 'd@w.net'])
    );
  });

  it('matches emails without caring about case', () => {
    expect(isTeamEmail('Niko@Example.com', 'niko@example.com')).toBe(true);
    expect(isTeamEmail('someone@else.com', 'niko@example.com')).toBe(false);
  });

  it('lets nobody in when the list is unset or empty', () => {
    expect(isTeamEmail('niko@example.com', undefined)).toBe(false);
    expect(isTeamEmail('niko@example.com', '')).toBe(false);
    expect(isTeamEmail(null, 'niko@example.com')).toBe(false);
  });
});
