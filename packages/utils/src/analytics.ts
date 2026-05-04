import { AnalyticsEventName, AnalyticsEventMap } from '@normalfinance/types';
import { logger } from './logger';

export function isValidAnalyticsEvent<K extends AnalyticsEventName>(
  event: K,
  properties: unknown
): properties is AnalyticsEventMap[K] {
  const props = properties as any;

  switch (event) {
    // 🔐 Wallet events
    case 'wallet_connected':
      return (
        typeof props?.provider === 'string' &&
        typeof props?.address === 'string' &&
        typeof props?.network === 'string'
      );

    case 'wallet_disconnected':
      return props?.address === undefined || typeof props?.address === 'string';

    // 🔗 Blockchain transactions
    case 'transaction_submitted':
      return (
        typeof props?.txHash === 'string' &&
        typeof props?.contract === 'string' &&
        typeof props?.method === 'string'
      );

    case 'transaction_failed':
      return (
        typeof props?.error === 'string' &&
        typeof props?.contract === 'string' &&
        typeof props?.method === 'string'
      );

    case 'transaction_successful':
      return (
        typeof props?.txHash === 'string' &&
        typeof props?.contract === 'string' &&
        typeof props?.method === 'string'
      );

    // ✍️ UI interactions
    case 'form_field_edited':
      return (
        typeof props?.field === 'string' &&
        (typeof props?.value === 'string' || typeof props?.value === 'number') &&
        (props?.context === undefined || typeof props?.context === 'string')
      );

    case 'button_clicked':
      return typeof props?.label === 'string' && typeof props?.location === 'string';

    case 'popup_opened':
      return (
        typeof props?.name === 'string' &&
        (props?.trigger === undefined || typeof props?.trigger === 'string')
      );

    case 'popup_closed':
      return typeof props?.name === 'string';

    // 📄 Navigation
    case 'viewed_page':
      return (
        typeof props?.path === 'string' &&
        (props?.referrer === undefined || typeof props?.referrer === 'string')
      );

    // 🧪 Custom event
    case 'custom_event':
      return (
        typeof props?.category === 'string' &&
        typeof props?.action === 'string' &&
        (props?.label === undefined || typeof props?.label === 'string') &&
        (props?.value === undefined ||
          typeof props?.value === 'string' ||
          typeof props?.value === 'number')
      );

    default:
      return false;
  }
}

export function trackEvent<K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEventMap[K]
) {
  if (!isValidAnalyticsEvent(event, properties)) {
    logger.warn(`[trackEvent] Invalid payload for event "${event}"`, properties);
  }
}
