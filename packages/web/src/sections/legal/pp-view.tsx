import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import { SimpleLayout } from '@/layouts/simple';

const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '24px 0' }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', lineHeight: 1.6 }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      style={{
        padding: '10px 16px',
        textAlign: 'left',
        fontWeight: 600,
        border: '1px solid rgba(0,0,0,0.12)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{ padding: '12px 16px', border: '1px solid rgba(0,0,0,0.12)', verticalAlign: 'top' }}
    >
      {children}
    </td>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>
  ),
  li: ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>,
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 32, marginBottom: 8, color: '#666' }}
    >
      {children}
    </h2>
  ),
  p: ({ children }) => <p style={{ marginBottom: 12, lineHeight: 1.7 }}>{children}</p>,
};

export default function PrivacyPolicyView() {
  return (
    <SimpleLayout
      slotProps={{
        content: {
          compact: true,
          sx: {
            textAlign: 'left',
            maxWidth: 900,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {MESSAGE}
      </ReactMarkdown>
    </SimpleLayout>
  );
}

const MESSAGE = `# NORMAL PRIVACY POLICY

Last Updated: October 14, 2026

Normal Finance, Inc. ("Normal", "we", "us", "the Company") provides a self-custody crypto wallet and savings app on the web (normalfinance.io) and as a mobile app (together, the "Services"). This Privacy Policy explains what personal data we collect, why, who we share it with, and the choices you have. It applies to the Services and to our websites; it does not apply to information collected offline.

Normal is built so that we hold as little of your data as possible. Your crypto is held in a wallet that only you control; we never have access to your private keys or your recovery phrase. We do not sell your personal data and we do not use advertising networks or tracking pixels.

If you have questions, contact us at hello@normalfinance.io.

## I. Consent

By using the Services you consent to this Privacy Policy. When you create an account you are asked to accept it, together with our Terms of Service. Where the law requires a separate consent (for example for marketing emails), we ask for it separately.

## II. Personal Data We Collect

| Category | What it includes | Where it comes from |
| --- | --- | --- |
| Account data | Your email address; if you sign in with Google, the name and profile picture Google shares with us; your sign-in method; the date your account was created. | You, or Google when you choose "Continue with Google". |
| Wallet data | The public addresses of the wallets you create or connect (Stellar, Bitcoin, Ethereum, Solana); the identifier of your wallet at our key-management provider; the public identifiers of the passkeys registered for your wallet. We never receive your private keys, recovery phrase, or the biometric data your device uses to unlock a passkey. | Created when you set up or import a wallet. |
| Transaction data | Records of the sends, swaps, savings deposits and withdrawals, purchases and cash-outs you make through the Services: amounts, assets, addresses, transaction hashes, status, and provider reference numbers. | Generated when you use the Services; some of it also exists publicly on the blockchains you transact on. |
| Device and app data | Your IP address, browser or app version, operating system; for the mobile app, a push-notification token and the device name you give it. | Collected automatically when you use the Services or enable notifications. |
| Communications data | Your marketing preference (opted in or out) and the emails we send you. | You, through sign-up and account settings. |
| Support data | Anything you send us when you contact support. | You. |

We do not collect your government ID, date of birth, bank account details or payment card details. When you buy or sell crypto for cash, the provider you choose (see Section IV) collects that information directly from you under its own privacy policy, and we receive only the status and reference of the transaction.

## III. How We Use Personal Data

- To provide the Services: create and sign you in to your account, set up and operate your wallet, show your balances and activity, send and receive transactions on your instruction.
- To complete transactions with partners: pass your wallet address and transaction details to the buy, sell and cash-out providers you choose, and receive their status updates.
- To keep you informed: transactional emails and push notifications about your account and your transactions, such as a deposit arriving or a swap completing.
- To keep the Services secure: verify that requests come from you, detect fraud and abuse, enforce rate limits, protect against bots.
- To improve the Services: understand which features are used and how the site performs, using aggregate analytics.
- To comply with law: respond to lawful requests from authorities, keep the records we are required to keep, and enforce our Terms.
- Marketing, only with your consent: product updates and announcements if you opted in.

Where the GDPR applies, our legal bases are performance of our contract with you (providing the Services), our legitimate interests (security, improvement, record keeping), compliance with legal obligations, and your consent (marketing).

## IV. Who We Share Personal Data With

We share personal data only with the categories of recipients below, and only what each one needs.

| Recipient | What they receive | Why |
| --- | --- | --- |
| Authentication and hosting providers (Supabase, Vercel, Cloudflare, Upstash) | Account data, device data, transaction records, cached data. | To run the Services. Our main database is hosted in the United States. |
| Wallet key-management provider (Turnkey) | Your email address, passkey public credentials, wallet public addresses and signing requests you approve. | To create and operate your self-custody wallet. Turnkey holds encrypted key material in secure hardware that neither we nor Turnkey can read. |
| Buy, sell and cash-out providers (Coinbase, Stripe, MoneyGram, and others we may add such as Ramp Network or Bridge) | Your wallet address, the asset and amount, your IP address for regional eligibility, and a reference to your account at Normal. | To complete the purchase or cash-out you request. Each provider verifies your identity under its own policy. |
| Exchange and bridge services (Soroswap, LI.FI, Circle CCTP, DeFindex and Blend) | Your wallet addresses and transaction details. | To execute swaps and savings deposits and withdrawals you request. Most of this data is also public on the blockchain. |
| Blockchain data and price providers (mempool.space, Helius, Etherscan, CoinGecko) | Your public wallet addresses. | To read your balances and activity and show prices. |
| Email and notification providers (Customer.io, Apple and Google push services) | Your email address, marketing preference, push token, notification content. | To send transactional and, with consent, marketing messages. |
| Analytics (Vercel Analytics, Vercel Speed Insights, Dune) | Page views and performance data; anonymised, aggregated transaction statistics. | To understand usage and performance. Dune receives no personal identifiers. |
| Professional advisers, authorities, and parties to a corporate transaction | What is necessary in each case. | Legal, audit, compliance, or a merger or sale of the business. |

We do not sell personal data and we do not share it with advertising networks. Public blockchains are, by design, public: transactions sent from your wallet are visible to anyone, forever, and we cannot remove them.

## V. Communications

**Transactional messages.** We send emails and push notifications you need to use the Services: sign-in codes, security alerts such as a new device being added to your wallet, and confirmations of deposits, withdrawals, swaps and cash-outs. These are sent regardless of your marketing preference. You can turn off push notifications in your device settings.

**Marketing messages.** We send product updates only if you opted in. You can opt out at any time in Settings, or with the unsubscribe link in any marketing email.

## VI. Cookies, Local Storage and Analytics

We use browser storage to keep you signed in and to remember your preferences (for example which wallet is selected). We use Cloudflare Turnstile to protect sign-in from bots; it may set a cookie for that purpose. We use Vercel Analytics and Speed Insights, which collect anonymous page-view and performance data without cross-site tracking. We do not use advertising cookies, ad networks or tracking pixels. You can clear browser storage through your browser settings; doing so signs you out.

## VII. Data Retention and Deletion

- **Account data** is kept while your account exists.
- **Transaction records** are kept for as long as we are required to for accounting and legal purposes. When you delete your account, these records are anonymised: the link to you is removed and only the transaction itself remains.
- **Device and log data** is kept for a limited period for security and troubleshooting.

You can delete your account in Settings → Security → Delete account, on the web or in the app. Before deletion, the app shows you the recovery phrase of your wallet, because after deletion it is the only way to access your crypto. Deletion removes your login, personal data, linked wallets and devices from our systems. Your wallet continues to exist on the blockchain under your control; we cannot delete blockchain records.

## VIII. Security

Your wallet is secured by a passkey tied to your device's fingerprint, face or PIN. Private keys are generated and used inside secure hardware operated by our key-management provider and are never visible to us. Because we do not hold your keys, we cannot recover your wallet if you lose both your passkey and your recovery phrase. We protect our own systems with encryption in transit, access controls, rate limiting and monitoring. No system is perfectly secure; please protect your devices and never share your recovery phrase.

## IX. International Transfers

We are based in the United States and our providers process data there and in other countries. If you are in the European Economic Area, the United Kingdom or Switzerland, we rely on standard contractual clauses and equivalent safeguards offered by our providers for transfers of your data.

## X. Supplemental Terms for California Residents

Under the California Consumer Privacy Act ("CCPA"), California consumers have the right to know what personal data we collect and how we use and disclose it, the right to delete it, the right to correct it, the right to opt out of sale or sharing, and the right not to be discriminated against for exercising these rights. We do not sell or share personal data as those terms are defined in the CCPA. To exercise your rights, use the deletion feature in the app or contact us at the address below; we respond within the time the law requires.

## XI. Supplemental Terms for the European Economic Area, Switzerland and the U.K.

Under the General Data Protection Regulation ("GDPR") and equivalent laws you have the right to be informed, to access your data, to have it rectified, to have it erased, to restrict or object to processing, to data portability, to withdraw consent at any time, and not to be subject to solely automated decisions with legal effect. You also have the right to lodge a complaint with your local data protection authority. To exercise these rights, use the deletion feature in the app or contact us at the address below; we respond within one month.

## XII. Children

The Services are not directed to anyone under 18, and our Terms of Service require you to be at least 18. We do not knowingly collect personal data from children. If you believe a child has provided us personal data, contact us and we will delete it.

## XIII. Changes to This Privacy Policy

We may update this Privacy Policy. We will post the new version on this page with a new "Last Updated" date and, for material changes, notify you in the app or by email before they take effect.

Contact us: hello@normalfinance.io`;
