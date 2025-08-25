import React from 'react';

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
};

export function AsyncGuard<T>({ state, loading, empty, error, children }: Props<T>) {
  const { isLoading, error: err, isEmpty, data, refetch } = state;

  if (isLoading) {
    return (
      <div role="status" aria-live="polite">
        {loading ?? <div>Loading…</div>}
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
            <p>Something went wrong.</p>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{String((err as any)?.message ?? err)}</pre>
            {refetch && (
              <button onClick={refetch} type="button" className="mt-2 rounded border px-3 py-1">
                Try again
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  if (isEmpty ?? (!data && !isLoading && !err)) {
    return typeof empty === 'function' ? empty(refetch) : (empty ?? <div>No data yet.</div>);
  }

  return <>{children(data as NonNullable<typeof data>)}</>;
}
