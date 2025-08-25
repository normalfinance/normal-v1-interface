export type AsyncState<T> = {
  data?: T;
  isLoading: boolean;
  error?: unknown | null;
  isEmpty?: boolean;
  refetch?: () => void;
};
