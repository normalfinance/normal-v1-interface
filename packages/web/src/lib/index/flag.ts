// The crypto index ships OFF. NEXT_PUBLIC_INDEX_ENABLED=true (set by the team
// per environment, never in code) shows it in the app and lets the server
// accept purchases. Read on both sides so a hidden page can't be called anyway.
export const indexEnabled = (): boolean => process.env.NEXT_PUBLIC_INDEX_ENABLED === 'true';
