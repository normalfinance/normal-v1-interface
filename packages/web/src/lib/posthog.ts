import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;

// NOTE: This is a Node.js client, so you can use it for sending events from the server side to PostHog.
export default function getPostHogServer() {
  if (!posthogInstance) {
    posthogInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogInstance;
}
