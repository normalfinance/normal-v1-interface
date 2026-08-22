'use client';

// Re-attaches the external wallet after logout → login (Niko 2026-08-22:
// "every time I log off I don't see Lobstr assets ... I reconnect, log out and
// in again, and they are not there").
//
// WHY ITS OWN COMPONENT — the first attempt put this inside
// use-stellar-wallets-kit's restore effect, which is gated by
// `if (persistStore.wallet.walletType && ...)`. After a logout that field is
// undefined, so the restore function is never called and the re-attach was
// unreachable dead code; that effect also has no dependency that changes when
// a session appears, so it could never fire at login time either.
//
// THE MODEL — one job each, no overlap:
//   memo (browser)  · which external wallet THIS browser last connected
//   server (truth)  · is that address linked to the user who just signed in?
//   persist slot    · what is connected RIGHT NOW — cleared at logout on
//                     purpose, so a shared browser never leaks a wallet
//   this component  · memo ∩ server-verified → write the slot
// Writing the slot is ALL it does: `wallet.walletType` is a dependency of the
// kit's restore effect, so that effect then performs the kit-level attach
// (setWallet / setPublicKey / setConnected) exactly as it does on a reload.

import { useRef, useState, useEffect } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { getLinkedWallets } from '@/services/linked-wallets';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import {
  forgetExternalWallet,
  readExternalWalletMemo,
  rememberExternalWallet,
} from '@/lib/wallet-reconnect-memo';

// A fresh session can take a moment to be usable by the API; retry a couple of
// times, then stop. Never loop: the user can always reconnect by hand.
const MAX_ATTEMPTS = 3;
const RETRY_MS = 3000;

export default function ExternalWalletReattach() {
  const { user } = useSupabaseAuth();
  // Subscribe to the slot address only — the store object's identity changes
  // on every state write, which would re-run this effect constantly.
  const slotAddress = usePersistStore((s) => s.wallet.address);
  const slotWalletType = usePersistStore((s) => s.wallet.walletType);
  const attemptsFor = useRef<{ userId: string; count: number } | null>(null);
  // A retry must re-run the effect, so it has to be STATE — bumping a ref
  // changes nothing (no re-render), which is how the first version of this
  // retry silently did nothing.
  const [retryTick, setRetryTick] = useState(0);

  // The memo is DERIVED from the slot, never written imperatively at call
  // sites. Imperative writes raced with disconnect: the kit's restore effect
  // re-remembered a wallet the user had just removed. Deriving it means any
  // stray write is corrected on the next render.
  //   external in the slot  → remember it
  //   Normal wallet in slot → forget (the user is not on an external wallet)
  //   EMPTY slot            → leave it alone; that is logout, and surviving
  //                           logout is the whole point of the memo.
  useEffect(() => {
    if (!slotWalletType) return;
    if (slotWalletType === 'normal-wallet') forgetExternalWallet();
    else if (slotAddress) rememberExternalWallet(slotAddress, slotWalletType);
  }, [slotAddress, slotWalletType]);

  useEffect(() => {
    if (!user) {
      attemptsFor.current = null;
      return undefined;
    }
    if (slotAddress) return undefined; // something is already connected

    if (attemptsFor.current?.userId !== user.id) {
      attemptsFor.current = { userId: user.id, count: 0 };
    }
    if (attemptsFor.current.count >= MAX_ATTEMPTS) return undefined;

    const memo = readExternalWalletMemo();
    if (!memo) return undefined;

    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      attemptsFor.current!.count += 1;
      try {
        const linked = await getLinkedWallets();
        if (cancelled) return;
        if (linked.some((w) => w.walletAddress === memo.address)) {
          // Verified: this wallet belongs to the account that just signed in.
          await usePersistStore.getState().connectWallet(memo.address, memo.walletType);
        } else {
          // Someone else's browser memo (shared computer) — drop it.
          forgetExternalWallet();
        }
      } catch {
        // Session not usable yet / transient failure. NEVER restore on an
        // unverified guess — just try again shortly, a bounded number of times.
        if (!cancelled && attemptsFor.current!.count < MAX_ATTEMPTS) {
          retry = setTimeout(() => setRetryTick((n) => n + 1), RETRY_MS);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [user, slotAddress, retryTick]);

  return null;
}
