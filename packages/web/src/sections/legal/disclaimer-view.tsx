import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import { SimpleLayout } from '@/layouts/simple';

const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.6rem', fontWeight: 500, marginBottom: 16 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{
        fontSize: '1.1rem',
        fontWeight: 500,
        marginTop: 32,
        marginBottom: 8,
        color: '#6B6B76',
      }}
    >
      {children}
    </h2>
  ),
  p: ({ children }) => <p style={{ marginBottom: 16, lineHeight: 1.7 }}>{children}</p>,
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 16px 0', paddingLeft: 24, listStyleType: 'disc' }}>{children}</ul>
  ),
  li: ({ children }) => <li style={{ marginBottom: 6, lineHeight: 1.7 }}>{children}</li>,
};

export default function DisclaimerView() {
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

const MESSAGE = `# DISCLAIMER

Normal is a self-custody crypto wallet and savings app operated by Normal Finance, Inc. It lets you hold and transfer digital assets on the Stellar, Bitcoin, Ethereum and Solana networks, earn yield on USDC through Normal Savings, exchange assets through third-party exchange and bridge protocols, and buy or sell digital assets for fiat through third-party providers. Your assets stay in a wallet that only you control: the Company never holds your private keys, your recovery phrase, or your assets, and cannot move them or recover them for you.

Normal Savings deposits your USDC into a vault operated by DeFindex that lends it through Blend, both third-party smart contracts on the Stellar network. Yields are variable and not guaranteed. Exchanges are executed by Soroswap, LI.FI and Circle's Cross-Chain Transfer Protocol. Purchases and sales for fiat are executed by the provider you choose (for example Coinbase, Stripe or MoneyGram) under that provider's own terms, identity checks, fees and limits.

Using digital assets involves significant risks, including but not limited to: loss of access to your wallet if you lose your passkeys and recovery phrase; irreversible transfers to a wrong address or network; smart contract bugs or exploits in the protocols we connect to; variable or negative yield; USDC or other stablecoins losing their peg; price movements and slippage between quote and execution; failed, delayed or partially completed cross-network exchanges; a fiat provider refusing, delaying or repricing a transaction; network congestion, outages or forks; and changes in law or regulation that limit the availability of the Services.

Nothing in the Services is financial, investment, legal or tax advice. Digital assets are not bank deposits and are not insured by the FDIC, SIPC or any government scheme.

THE SERVICES ARE PROVIDED TO YOU ON AN "AS IS" AND "AS AVAILABLE" BASIS. YOUR USE OF THE SERVICES IS ENTIRELY VOLUNTARY AND MUST STRICTLY ADHERE TO THE TERMS OF SERVICE. BY USING THE SERVICES, YOU ACCEPT AND ACKNOWLEDGE THAT THERE ARE SIGNIFICANT RISKS ASSOCIATED WITH DIGITAL ASSETS, INCLUDING, BUT NOT LIMITED TO, COMPLETE LOSS OF FUNDS, BUGS OR EXPLOITS IN SMART CONTRACTS, TEMPORARY OR PERMANENT UNAVAILABILITY OF NETWORK INFRASTRUCTURE, FAILURE OF HARDWARE, SOFTWARE OR INTERNET CONNECTIONS, MALICIOUS SOFTWARE, AND OTHER SECURITY RISKS. YOU ACCEPT AND ACKNOWLEDGE THAT THE COMPANY WILL NOT BE RESPONSIBLE FOR ANY LOSSES, FAILURES, DISRUPTIONS, ERRORS, OR DELAYS YOU MAY EXPERIENCE WHEN USING THE SERVICES, HOWEVER CAUSED. ANY USE OF THE SERVICES WILL BE AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND BY NORMAL.

By using the Services, you agree that no developer or entity involved in creating or maintaining Normal will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with the Services or with any third-party protocol or provider reached through them, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, loss of profits, digital assets, or anything else of value.

By using the Services, you further agree to waive any loss, damage, liability, claim or demand against Normal Finance, Inc., its affiliates, and any entities involved in creating or operating the Services. Use of the Services shall be at your own risk.`;
