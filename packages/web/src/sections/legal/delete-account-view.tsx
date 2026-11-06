import { LegalDocument } from './legal-document';

// ----------------------------------------------------------------------

export default function DeleteAccountView() {
  return <LegalDocument page="deleteAccount" markdown={MESSAGE} />;
}

const MESSAGE = `# DELETE YOUR NORMAL ACCOUNT

This page explains how to delete your account with Normal, the wallet and savings app operated by Normal Finance, Inc., and what happens to your data when you do.

## Delete your account in the app or on the website

- **Mobile app (iOS and Android):** open Settings → Delete account.
- **Website:** sign in at www.normalfinance.io and open Settings → Security → Delete account.

Before your account is deleted, the app asks you to export the recovery phrase of each of your wallets. This step is required because, after deletion, the recovery phrase is the only way to access the crypto in your wallet. The app also checks that no swap, purchase or cash-out is still in progress, and warns you if your wallet still holds funds.

## Request deletion without the app

If you cannot use the app or the website, email **hello@normalfinance.io** from the email address registered to your Normal account, with the subject **"Delete my account"**. We will verify the request and delete the account within 30 days. Because we never hold your recovery phrase, please make sure you have saved it before you ask us to delete the account.

## What is deleted

- Your login and sign-in details
- Your profile and marketing preferences
- Your wallet records held by Normal (wallet identifiers and addresses linked to your account)
- Linked external wallets, registered devices and push-notification tokens
- Referral records

## What is kept

- **Transaction records** (swaps, purchases, cash-outs) are anonymised: the link to you is removed and only the transaction itself is kept, for accounting and legal record-keeping.
- **Your wallet and funds stay yours.** Your wallet lives on public blockchains, not on our servers, so deleting your Normal account does not delete the wallet or move any funds. You can keep using them in any compatible wallet with your recovery phrase. Transactions already recorded on a blockchain are public and cannot be erased by anyone.

For more about the data we hold and your rights, see our [Privacy Policy](/legal/pp). Questions: hello@normalfinance.io`;
