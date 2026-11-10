import { menusFor, NAV_MENUS } from './site-nav';

const product = (signedIn: boolean) =>
  menusFor(signedIn)
    .find((menu) => menu.label === 'Product')!
    .groups.flatMap((group) => group.links);

const hrefOf = (signedIn: boolean, label: string) =>
  product(signedIn).find((link) => link.label === label)?.href;

describe('the Product menu opens the app', () => {
  it('signed in: straight to the app page or action', () => {
    expect(hrefOf(true, 'Savings')).toBe('/app/savings');
    expect(hrefOf(true, 'Swap')).toBe('/app/swap');
    expect(hrefOf(true, 'Add money')).toBe('/app?action=buy');
    expect(hrefOf(true, 'Send')).toBe('/app?action=send');
  });

  it('signed out: through login, and back to the same place', () => {
    expect(hrefOf(false, 'Savings')).toBe('/login?next=%2Fapp%2Fsavings');
    expect(hrefOf(false, 'Swap')).toBe('/login?next=%2Fapp%2Fswap');
    expect(hrefOf(false, 'Add money')).toBe('/login?next=%2Fapp%3Faction%3Dbuy');
    expect(hrefOf(false, 'Send')).toBe('/login?next=%2Fapp%3Faction%3Dsend');
  });

  it('leaves the Resources links alone', () => {
    const resources = (signedIn: boolean) =>
      menusFor(signedIn).find((menu) => menu.label === 'Resources')!.groups;
    expect(resources(false)).toEqual(NAV_MENUS.find((menu) => menu.label === 'Resources')!.groups);
  });
});
