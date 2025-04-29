export type ConfettiContextValue = {
  confettiConfig: ConfettiConfig;
  isConfettiShowing: boolean;
  showConfetti: (config?: ConfettiConfig) => void;
};

export type ConfettiProviderProps = {
  defaultConfig: ConfettiConfig;
  children: React.ReactNode;
};

export type ConfettiConfig = {
  numberOfPieces: number;
  recycle: boolean;
  run: boolean;
  duration: number;
  onConfettiComplete?: () => void;
};
