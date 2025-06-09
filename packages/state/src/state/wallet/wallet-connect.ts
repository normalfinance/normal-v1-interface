import { Connector, NetworkDetails } from "@normalfinance/types";
import { WalletConnect as WalletClient } from "@normalfinance/utils";
import { NETWORK_PASSPHRASE } from "@normalfinance/utils/build/stellar/constants";
import { WalletConnectAllowedMethods } from "@normalfinance/utils/build/stellar/wallets/wallet-connect";

export class WalletConnect implements Connector {
  id: string;
  name: string;
  iconUrl: string;
  iconBackground: string;
  installed: boolean;
  downloadUrls: {
    browserExtension: string;
  };
  client?: WalletClient;
  publicKey?: string;

  constructor(ignoreClient = false) {
    this.id = "wallet-connect";
    this.name = "Wallet Connect";
    this.iconUrl = "https://stellar.creit.tech/wallet-icons/walletconnect.svg";
    this.iconBackground = "#fff";
    this.installed = true;
    this.downloadUrls = {
      browserExtension:
        "https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk?hl=en",
    };
    if (ignoreClient) return;
    this.client = new WalletClient({
      projectId: "1cca500fbafdda38a70f8bf3bcb91b15",
      name: "Normal",
      description: "Serving only the tastiest DeFi",
      url: "https://app.normalfinance.io",
      icons: ["https://app.normalfinance.io/logoIcon.png"],
      method: WalletConnectAllowedMethods.SIGN_AND_SUBMIT,
      network: "stellar:pubnet",
    });
  }

  async isConnected(): Promise<boolean> {
    return true;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async getNetworkDetails(): Promise<NetworkDetails> {
    return {
      network: "public",
      networkPassphrase: NETWORK_PASSPHRASE,
      networkUrl:
        "https://mainnet.stellar.validationcloud.io/v1/YcyPYotN_b6-_656rpr0CabDwlGgkT42NCzPVIqcZh0",
    };
  }

  getPublicKey(): Promise<string> {
    return this.client?.getPublicKey()!;
  }

  signTransaction(
    xdr: string,
    opts?: {
      network?: string;
      networkPassphrase?: string;
      accountToSign?: string;
    }
  ): Promise<any> {
    return this.client!.signTransaction(xdr, opts);
  }
}
