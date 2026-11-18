import { appActionFrom, appActionHref } from './app-action-url';

describe('app action links', () => {
  it('builds the link the site menu uses', () => {
    expect(appActionHref('/app', 'buy')).toBe('/app?action=buy');
    expect(appActionHref('/app', 'send')).toBe('/app?action=send');
  });

  it('reads only the four money actions', () => {
    expect(appActionFrom('?action=buy')).toBe('buy');
    expect(appActionFrom('?action=send&x=1')).toBe('send');
    expect(appActionFrom('?action=receive')).toBe('receive');
    expect(appActionFrom('?action=sell')).toBe('sell');
    expect(appActionFrom('?action=delete')).toBeNull();
    expect(appActionFrom('?action=')).toBeNull();
    expect(appActionFrom('')).toBeNull();
  });
});
