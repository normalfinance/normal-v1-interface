import { Token } from '@/types/token';
import type { NavSectionProps } from 'src/components/nav-section';

// ----------------------------------------------------------------------

type NavItem = {
  title: string;
  path: string;
  children?: NavItem[];
};

type OutputItem = {
  name: string;
  shortname: string;
};

const flattenNavItems = (navItems: Token[], parentGroup?: string): OutputItem[] => {
  let flattenedItems: OutputItem[] = [];

  navItems.forEach((navItem) => {
    // const currentGroup = parentGroup ? `${parentGroup}-${navItem.title}` : navItem.title;

    flattenedItems.push({
      name: navItem.name,
      shortname: navItem.shortname,
    });

    // if (navItem.children) {
    //   flattenedItems = flattenedItems.concat(flattenNavItems(navItem.children, currentGroup));
    // }
  });
  return flattenedItems;
};

// export function flattenNavSections(navSections: NavSectionProps['data']): OutputItem[] {
//   return navSections.flatMap((navSection) =>
//     flattenNavItems(navSection.items, navSection.subheader)
//   );
// }

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  query: string;
  inputData: Token[];
};

export function applyFilter({ inputData, query }: ApplyFilterProps): Token[] {
  if (!query) return inputData;

  return inputData.filter(({ name, shortname }) =>
    [name, shortname].some((field) => field?.toLowerCase().includes(query.toLowerCase()))
  );
}
