import { useCommonNormalStore } from '../stores';

/**
 * Checks if the app is running on mainnet based on its environment variables.
 */
const useIsMainnet = () => {
	const env = useCommonNormalStore((s) => s.env);

	const isMainnet = env.driftEnv === 'mainnet-beta';

	return isMainnet;
};

export default useIsMainnet;
