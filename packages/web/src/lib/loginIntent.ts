const LOGIN_INTENT_KEY = 'normal-login-intent';

export const rememberLoginIntent = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOGIN_INTENT_KEY, 'true');
};

export const consumeLoginIntent = () => {
  if (typeof window === 'undefined') return false;
  const hadIntent = localStorage.getItem(LOGIN_INTENT_KEY) === 'true';
  if (hadIntent) {
    localStorage.removeItem(LOGIN_INTENT_KEY);
  }
  return hadIntent;
};

export const clearLoginIntent = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOGIN_INTENT_KEY);
};
