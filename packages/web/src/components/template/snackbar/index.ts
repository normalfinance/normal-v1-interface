'use client';

export * from 'notistack';

export { default as SnackbarProvider } from './snackbar-provider';

// ----------------------------------------------------------------------
// Simple toast helper that mimics `toast.promise` API (like react-hot-toast)
// using notistack underneath. Only the subset we need is implemented.

<<<<<<< HEAD
import { closeSnackbar, enqueueSnackbar } from 'notistack';
=======
import { enqueueSnackbar, closeSnackbar } from 'notistack';
>>>>>>> develop

type PromiseMessages<T = any> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: any) => string);
};

export const toast = {
  /*
   * Displays a loading snackbar immediately, then replaces it with success
   * or error message once the promise resolves.
   */
  promise<T>(promise: Promise<T>, { loading, success, error }: PromiseMessages<T>) {
    // Show loading snackbar and keep its key so we can close/update it later.
    const snackbarKey = enqueueSnackbar(loading, { variant: 'info', persist: true });

    return promise
      .then((value) => {
        enqueueSnackbar(typeof success === 'function' ? success(value) : success, {
          variant: 'success',
        });
        // Close loading snackbar
        closeSnackbar(snackbarKey);
        return value;
      })
      .catch((err) => {
        enqueueSnackbar(typeof error === 'function' ? error(err) : error, {
          variant: 'error',
        });
        closeSnackbar(snackbarKey);
        throw err;
      });
  },
};
