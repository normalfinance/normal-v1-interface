import { cdn } from '@/utils/cdn';

// ----------------------------------------------------------------------

// The people on the About page, in one place: the team grid, the faces in the
// hero's facts and the founder's links all read from here, so they never
// disagree.

export type SocialNetwork = 'x' | 'linkedin' | 'telegram' | 'github';

export type SocialLink = { network: SocialNetwork; href: string };

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  image: string;
  /** Which part of the photo stays in frame when it is cropped square. */
  focus?: string;
  links: SocialLink[];
};

export const FOUNDER_LINKS: SocialLink[] = [
  { network: 'x', href: 'https://x.com/justinbenjaminn' },
  { network: 'linkedin', href: 'https://www.linkedin.com/in/justin-benjamin1/' },
  { network: 'telegram', href: 'https://t.me/justinbenjamin' },
];

export const TEAM: TeamMember[] = [
  {
    name: 'Justin Benjamin',
    role: 'Founder & CEO',
    bio: 'Justin designed products at Bitcoin of America and CoinFlip before starting Normal. Crypto investor for 7+ years, BS from Northwestern.',
    image: cdn('about-page/justin.webp'),
    focus: '50% 20%',
    links: FOUNDER_LINKS,
  },
  {
    name: 'Niko Gorjan',
    role: 'CTO',
    bio: 'Grew up in Slovenia, CS degree from FERI. Built a reputation for clean, component-driven React code across international clients before joining Normal.',
    image: cdn('about-page/niko.webp'),
    links: [
      { network: 'x', href: 'https://x.com/NikoGorjan' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/niko-gorjan-582433276/' },
      { network: 'github', href: 'https://github.com/nikogorjan' },
    ],
  },
  {
    name: 'Sam Sutton',
    role: 'Business Development',
    bio: 'Co-founded Rich Habits, a custom athletic apparel brand, in high school and leads it as CEO. Also a founding partner and project manager at Bloom, and a Tarleton State wrestler.',
    image: cdn('about-page/sam-sutton.webp'),
    links: [
      { network: 'x', href: 'https://x.com/samsu1tonRH' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/sam-sutton/' },
    ],
  },
  {
    name: 'Amit Anand',
    role: 'Head of Marketing',
    bio: "Growth strategist with deep roots in Web3, driving Normal's brand and community across every channel.",
    image: cdn('about-page/avm.webp'),
    focus: '50% 50%',
    links: [
      { network: 'x', href: 'https://x.com/0xawmit' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/0xawmit/' },
      { network: 'telegram', href: 'https://t.me/awmitx' },
    ],
  },
  {
    name: 'Jake Penzato',
    role: 'Creative Director',
    bio: "Visual storyteller shaping Normal's design language, from brand identity to product UI.",
    image: cdn('about-page/jake.webp'),
    links: [
      { network: 'x', href: 'https://x.com/JakePenzato' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/jake-penzato-a72747245/' },
      { network: 'telegram', href: 'https://t.me/JakeTheCD' },
    ],
  },
  {
    name: 'Jay Malve',
    role: 'Full-Stack Developer',
    bio: 'Full-stack engineer bridging smart contracts and polished UIs. If it ships, Jay probably touched it.',
    image: cdn('about-page/jay.webp'),
    links: [
      { network: 'x', href: 'https://x.com/jaydotdev' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/jay-malave/' },
      { network: 'github', href: 'https://github.com/jaymalave' },
    ],
  },
  {
    name: 'Anthony Benjamin',
    role: 'Business Development Lead',
    bio: "Forging the partnerships and integrations that expand Normal's footprint across DeFi and beyond.",
    image: cdn('about-page/anth.webp'),
    links: [
      { network: 'x', href: 'https://x.com/AnthonyBenjamn' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/anthony-benjamin/' },
      { network: 'telegram', href: 'https://t.me/anthonypreprint' },
    ],
  },
  {
    name: 'John Reyes',
    role: 'Intern',
    bio: 'Lending a hand across ops, research, and content, bringing fresh energy and curiosity to the team.',
    image: cdn('about-page/john.webp'),
    links: [
      { network: 'x', href: 'https://x.com/0xJohnReyes' },
      { network: 'linkedin', href: 'https://www.linkedin.com/in/johnpreyes/' },
    ],
  },
  {
    name: 'Zeal',
    role: 'Chief Doge',
    bio: 'Official mascot, morale officer, and the most photogenic member of the Normal team.',
    image: cdn('about-page/zeal.webp'),
    // A landscape photo: keep the face, on the right of the frame.
    focus: '78% 40%',
    links: [{ network: 'x', href: 'https://x.com/NormalDoge_Zeal' }],
  },
];
