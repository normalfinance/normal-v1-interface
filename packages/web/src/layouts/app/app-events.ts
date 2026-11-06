// ----------------------------------------------------------------------

/**
 * Asks the account drawer for its log-out confirm. The drawer owns logging out
 * (Supabase, the wallet connection, the stored wallet), so the sidebar's
 * "Log out" borrows it instead of keeping a second copy.
 */
export const REQUEST_LOGOUT_EVENT = 'nf:request-logout';
