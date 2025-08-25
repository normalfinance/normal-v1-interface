import React from 'react';
import { useTranslate } from '@/locales';

type Labels = {
  loading?: React.ReactNode;
  genericError?: React.ReactNode;
  retry?: React.ReactNode;
  empty?: React.ReactNode;
};

type Props<T> = {
  state: {
    data?: T;
    isLoading: boolean;
    error?: unknown | null;
    isEmpty?: boolean;
    refetch?: () => void;
  };
  loading?: React.ReactNode;
  empty?: React.ReactNode | ((refetch?: () => void) => React.ReactNode);
  error?: (err: unknown, refetch?: () => void) => React.ReactNode;
  children: (data: NonNullable<T>) => React.ReactNode;
  i18nNs?: Parameters<typeof useTranslate>[0];
  labels?: Labels;
};

export function AsyncGuard<T>({
  state,
  loading,
  empty,
  error,
  children,
  i18nNs = 'common',
  labels,
}: Props<T>) {
  const { t } = useTranslate(i18nNs);
  const { isLoading, error: err, isEmpty, data, refetch } = state;

  if (isLoading) {
    return (
      <div role="status" aria-live="polite">
        {loading ?? labels?.loading ?? <div>{t('async.loading')}</div>}
      </div>
    );
  }

  if (err) {
    return (
      <>
        {error ? (
          error(err, refetch)
        ) : (
          <div role="alert" className="text-red-600">
            <p>{labels?.genericError ?? t('async.error.generic')}</p>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{String((err as any)?.message ?? err)}</pre>
            {refetch && (
              <button onClick={refetch} type="button" className="mt-2 rounded border px-3 py-1">
                {labels?.retry ?? t('async.retry')}
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  if (isEmpty ?? (!data && !isLoading && !err)) {
    return typeof empty === 'function'
      ? empty(refetch)
      : (empty ?? labels?.empty ?? <div>{t('async.empty')}</div>);
  }

  return <>{children(data as NonNullable<typeof data>)}</>;
}
