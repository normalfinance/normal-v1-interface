export interface ErrorActions {
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
}
