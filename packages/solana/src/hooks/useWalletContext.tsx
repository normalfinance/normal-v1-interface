import { useContext } from 'react';
import { useCommonNormalStore } from '../stores';
import { DriftWalletContext } from '../providers';

export const useWalletContext = () => {
	const walletContextState = useCommonNormalStore(
		(s) => s.currentlyConnectedWalletContext
	);

	return walletContextState;
};

export const useWallet = () => {
	const driftWalletContext = useContext(DriftWalletContext);

	return driftWalletContext;
};
