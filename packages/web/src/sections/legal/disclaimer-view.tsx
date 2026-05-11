import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import { SimpleLayout } from '@/layouts/simple';

const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 16 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 32, marginBottom: 8, color: '#666' }}>{children}</h2>,
  p: ({ children }) => <p style={{ marginBottom: 16, lineHeight: 1.7 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '0 0 16px 0', paddingLeft: 24, listStyleType: 'disc' }}>{children}</ul>,
  li: ({ children }) => <li style={{ marginBottom: 6, lineHeight: 1.7 }}>{children}</li>,
};

export default function DisclaimerView() {
  return (
    <SimpleLayout
      slotProps={{
        content: {
          compact: true,
          sx: { textAlign: 'left', maxWidth: 900, alignItems: 'flex-start', justifyContent: 'flex-start' },
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>{MESSAGE}</ReactMarkdown>
    </SimpleLayout>
  );
}

const MESSAGE = `# DISCLAIMER

Normal Protocol is a non-custodial crypto wallet interface built on the Stellar blockchain that allows users to engage in DeFi lending with USDC. Users can supply USDC as liquidity, borrow against collateral, earn yield, and manage their lending positions directly through compatible Stellar wallets. All assets remain fully under your control in your own non-custodial wallet at all times.

Your use of the Normal Protocol and this interface involves various risks, including, but not limited to, risks inherent to cryptographic systems and blockchain-based networks, smart contract vulnerabilities, liquidation risk, interest rate volatility, USDC de-pegging or stability risks, network congestion or failures, and potential loss of assets due to market movements or technical issues.

Before using the Normal Protocol, you should review the Documentation available on our Site, the Terms of Use, and the Risk disclosures to make sure you understand how the Normal Protocol works. Additionally, just as you can access email protocols such as SMTP through multiple email clients, you can access the Normal Protocol through a variety of web or mobile interfaces. You are responsible for doing your own diligence on those interfaces to understand the fees and risks they present.

NORMAL PROTOCOL IS PROVIDED TO YOU ON AN "AS IS" AND "AS AVAILABLE" BASIS. YOUR USE OF THE NORMAL PROTOCOL IS ENTIRELY VOLUNTARY AND MUST STRICTLY ADHERE TO THE TERMS. BY USING THE PROTOCOL, YOU ACCEPT AND ACKNOWLEDGE THAT THERE ARE SIGNIFICANT RISKS ASSOCIATED WITH DEFI LENDING, INCLUDING, BUT NOT LIMITED TO, COMPLETE LOSS OF FUNDS, LIQUIDATION OF POSITIONS, BUGS OR EXPLOITS IN SMART CONTRACTS, TEMPORARY OR PERMANENT UNAVAILABILITY OF NETWORK INFRASTRUCTURE, FAILURE OF HARDWARE, SOFTWARE OR INTERNET CONNECTIONS, MALICIOUS SOFTWARE, AND OTHER SECURITY RISKS. YOU ACCEPT AND ACKNOWLEDGE THAT THE COMPANY WILL NOT BE RESPONSIBLE FOR ANY LOSSES, FAILURES, DISRUPTIONS, ERRORS, OR DELAYS YOU MAY EXPERIENCE WHEN USING THE PROTOCOL, HOWEVER CAUSED. THE COMPANY TAKES NO RESPONSIBILITY FOR, AND WILL NOT BE LIABLE TO YOU FOR, YOUR PARTICIPATION IN ANY DEFI LENDING ACTIVITIES. ANY USE OF THE PROTOCOL WILL BE AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND BY NORMAL.

Although Normal Protocol has developed the interface, the underlying DeFi lending functionality is powered by smart contracts deployed on the Stellar blockchain. The Company does not own, control, or custody any assets.

By using Normal Protocol, you agree that no developer or entity involved in creating or maintaining Normal Protocol will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with the protocol, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, loss of profits, USDC, or anything else of value.

By using Normal Protocol, you further agree to waive any loss, damage, liability, claim or demand against Normal Finance, Inc., its affiliates, and any entities involved in creating or operating the Protocol. Use of the Protocol shall be at your own risk.`;
