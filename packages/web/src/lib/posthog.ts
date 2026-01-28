import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;

const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'testnet';

// NOTE: This is a Node.js client, so you can use it for sending events from the server side to PostHog.
export default function getPostHogServer() {
  const isMainnet = network === 'mainnet';
  const key = isMainnet
    ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_KEY
    : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_KEY;

  const host = isMainnet
    ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_HOST
    : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_HOST;

  if (!posthogInstance) {
    posthogInstance = new PostHog(key!, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogInstance;
}
