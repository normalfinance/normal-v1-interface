'use client';

export * from 'notistack';

export { default as SnackbarProvider } from './snackbar-provider';

// ----------------------------------------------------------------------
// Simple toast helper that mimics `toast.promise` API (like react-hot-toast)
// using notistack underneath. Only the subset we need is implemented.

import { closeSnackbar, enqueueSnackbar, SnackbarMessage } from 'notistack';

type PromiseMessages<T = any> = {
  loading: SnackbarMessage;
  success: SnackbarMessage | ((value: T) => SnackbarMessage);
  error: SnackbarMessage | ((error: any) => SnackbarMessage);
};

export const toast = {
  /*
   * Displays a loading snackbar immediately, then replaces it with success
   * or error message once the promise resolves.
   */
  promise<T>(promise: Promise<T>, { loading, success, error }: PromiseMessages<T>) {
    const key = enqueueSnackbar(loading, {
      variant: 'info',
      persist: true,
    });

    return promise
      .then((value) => {
        closeSnackbar(key);
        enqueueSnackbar(typeof success === 'function' ? success(value) : success, {
          variant: 'success',
          persist: false,
        });
        return value;
      })
      .catch((err) => {
        closeSnackbar(key);
        enqueueSnackbar(typeof error === 'function' ? error(err) : error, {
          variant: 'error',
          persist: true, // Keep error messages until dismissed
        });
        throw err;
      });
  },
};
