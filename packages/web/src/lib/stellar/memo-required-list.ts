// ---------------------------------------------------------------------------
// Seed list of Stellar accounts that REQUIRE a deposit memo — exchanges that
// pool all customer deposits into one account, where the memo is the only
// thing routing a payment to the right customer (finding #48).
//
// Pure data, no imports, no 'use client': shared by the send modal (instant
// client-side check) and /api/stellar/memo-required (server floor before the
// live directory lookup).
//
// Verified from stellar.expert's public directory (tag: memo-required),
// fetched 2026-08-06 — not hand-typed. Exchanges rotate deposit accounts
// (Coinbase runs at least five), which is why the live route exists; this
// list is the instant, offline floor. Re-verify against the directory when
// touching it.
// ---------------------------------------------------------------------------

export interface MemoRequirement {
  required: boolean;
  /** Exchange display name, when known. */
  name?: string;
  /** true = the live check could not run — WARN, never silently pass
   *  (doc 90 W2: a guard whose data source died must say so). */
  unknown?: boolean;
}

export const KNOWN_MEMO_REQUIRED: ReadonlyMap<string, string> = new Map([
  // The address from the actual incident:
  ['GDS2WFLIJID6BDM64FGUD7MNOVZUEWHJ5VJPO2GQ32KOZCYIYIRIQTG6', 'Coinbase'],
  ['GB5CLRWUCBQ6DFK2LR5ZMWJ7QCVEB3XKMPTQUYCDIYB4DRZJBEW6M26D', 'Coinbase'],
  ['GBOYDKMW7MKSXV3UAPTEWVF3IX2EIJ4YOCEH6MOO5XTYOJKIH73YESVB', 'Coinbase'],
  ['GC23BCI644P66PPNRGRMKFFVQZZXE3CSCGMFIYFV5OW4WCPM2XICKWQZ', 'Coinbase'],
  ['GC5PFAXPL3BYIRHLMUFD3E353DINA6A52DXJIXLKQEVO2GA7WFWGWCFS', 'Coinbase'],
  ['GAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A', 'Binance'],
  ['GBUTD5DNV43JBJP7AA657H2CYPUCAAFBXCKX7QE4XXGYIYFZZX2EKKVF', 'Binance'],
  ['GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6', 'Binance'],
  ['GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKTM', 'Kraken'],
  ['GAQZU7Y7GB3E4XOA3ZXEZDOTIEIWQRYOAIVJ6STY2YTUQAGZL3GYJCXG', 'Kraken'],
  ['GBBALM76B5OUPOZCMFCNT5PVIFV3WTUYX3VVGC7FMN4ZPQLGCG2C4X3D', 'Kraken'],
  ['GAJ4BSGJE6UQHZAZ5U5IUOABPDCYPKPS3RFS2NVNGFGFXGVQDLBQJW2P', 'KuCoin'],
  ['GBJNV2MQA7M5GNBRDFW46JLXIN7ZLYVVM4UW4CWDZO4KZKXIXCRYHMH2', 'KuCoin'],
  ['GA3NTBDIKQVDDM6ZDKJLGXJFESWJ636AGRIW34RH5WL24LUMX3YASKX2', 'Bitstamp'],
  ['GAWPTHY6233GRWZZ7JXDMVXDUDCVQVVQ2SXCSTG3R3CNP5LQPDAHNBKL', 'Bitfinex'],
  ['GB6YPGW5JFMMP2QB2USQ33EUWTXVL4ZT5ITUNCY3YKVWOJPP57CANOF3', 'Bittrex'],
  ['GBGII2C7M4TOEC2MVAZYG3TRFM3ATCCEWANSN4Q3AHEX3NRKXJCVZDEV', 'OKX'],
  ['GBC6NRTTQLRCABQHIR5J4R4YDJWFWRAO4ZRQIM2SVI5GSIZ2HZ42RINW', 'Gate.io'],
  ['GB67TJFJO3GUA432EJ4JTODHFYSBTM44P4XQCDOFTXJNNPV2UKUJYVBF', 'Crypto.com'],
  ['GB2ES2N326MZK4EGJBKN3ZARCQ5RTFQSAWIJAAKFVIIIJSCC35TXIMLB', 'Robinhood'],
  ['GAW4E6NGM4NPNX2LO2BKDPCCTUX3FJLKWHPU4VQPGBIBQGD6JTVF5C7C', 'Upbit'],
  ['GARAR5QR7WRL24MQMSO4INWV7C5SE4EE2YVXTLD6ORONYFHSUAGZYSLN', 'Blockchain.com'],
  ['GBF6SZEZ4AJY7BCBUV3ZYJ3Q27YMO4NJU6IZQP7ODY47MPVFWCO24SNW', 'Blockchain.com'],
  ['GB3RMPTL47E4ULVANHBNCXSXM2ZA5JFY5ISDRERPCXNJUDEO73QFZUNK', 'CEX.IO'],
  ['GBW64JT24G4M2FTXVDKJOEQDSBLULXALEYY6VPEJIEN4NTFGMW35BPP5', 'Bitvavo'],
  ['GBS2RTBGEWBT7DJOH7CTA4PDVLIPONCPCIILJPPESWSHDIV4NFZJHRP3', 'Bitkub'],
  ['GC7YNBWTTLCMAODL2KRBGVN6PIHH25GVUYTSIOSC744TZOG53VFNQ247', 'Bithumb'],
  ['GAPRC4SRTZSIUA34CWP7KB7FIMURX3ZT2CPNBGET5TJ4XZBONKHS6TPF', 'NiceHash'],
  ['GBQYTZQHIHEP4GAACBCDM4X7OGMHULRUMX5B7L5WANGVXISDWJTUPM25', 'Changelly'],
  ['GC4KAS6W2YCGJGLP633A6F6AKTCV4WSLMTMIQRSEQE5QRRVKSX7THV6S', 'Indodax'],
  ['GBZLHGDYMSVF4X6DYAGKLIQX3F64W3MXNDVGHKQPR226TCJ5QJ2ZQKVA', 'Paribu'],
  ['GABRNO3RCFT5VS3JZ5K6A5PBVI47BKKNO6SH3XFQQHIPCW5AWIU3F4SL', 'Bitpanda'],
  ['GALKEUDKJYXIAWPB2W4L6CP44ZRZR5KD2IQOUIXIO6U2FFTUL4MNTDVK', 'NDAX'],
]);

/** Instant, synchronous check against the seed list. Pure — usable anywhere. */
export function knownMemoRequirement(address: string): MemoRequirement | null {
  const name = KNOWN_MEMO_REQUIRED.get(address.trim().toUpperCase());
  return name ? { required: true, name } : null;
}
