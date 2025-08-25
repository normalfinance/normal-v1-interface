import type { AsyncState } from '@/types/async';

export function combineAsync<A, B>(a: AsyncState<A>, b: AsyncState<B>): AsyncState<[A, B]> {
  const isLoading = a.isLoading || b.isLoading;
  const error = a.error ?? b.error ?? null;
  const isEmpty = (a.isEmpty || b.isEmpty) ?? false;
  const refetch = () => {
    a.refetch?.();
    b.refetch?.();
  };

  const data =
    a.data !== undefined && b.data !== undefined ? ([a.data, b.data] as [A, B]) : undefined;

  return { isLoading, error, isEmpty, data, refetch };
}
