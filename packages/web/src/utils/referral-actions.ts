export enum ReferralAction {
  SIGNUP = 'signup',
}

export interface ReferralActionConfig {
  id: ReferralAction;
  name: string;
  description: string;
  category: 'onboarding' | 'trading' | 'defi' | 'governance' | 'verification';
  requiresAmount?: boolean;
  requiresToken?: boolean;
  isEnabled: boolean;
  priority: number;
}

export const REFERRAL_ACTION_CONFIG: Record<ReferralAction, ReferralActionConfig> = {
  [ReferralAction.SIGNUP]: {
    id: ReferralAction.SIGNUP,
    name: 'Sign Up',
    description: 'User first visits and creates account',
    category: 'onboarding',
    requiresAmount: false,
    requiresToken: false,
    isEnabled: true,
    priority: 1,
  },
};

export class ReferralActionUtils {
  static getValidActions(): string[] {
    return Object.values(ReferralAction) as string[];
  }

  static getEnabledActions(): ReferralAction[] {
    return Object.values(ReferralAction).filter(
      (action) => REFERRAL_ACTION_CONFIG[action].isEnabled
    );
  }

  static getEnabledActionStrings(): string[] {
    return this.getEnabledActions().map((action) => action as string);
  }

  static isValidAction(action: string): action is ReferralAction {
    return Object.values(ReferralAction).includes(action as ReferralAction);
  }

  static isEnabledAction(action: string | ReferralAction): boolean {
    if (!this.isValidAction(action)) return false;
    return REFERRAL_ACTION_CONFIG[action as ReferralAction].isEnabled;
  }

  static getActionConfig(action: ReferralAction): ReferralActionConfig {
    return REFERRAL_ACTION_CONFIG[action];
  }

  static getActionsByCategory(category: ReferralActionConfig['category']): ReferralAction[] {
    return Object.values(ReferralAction).filter(
      (action) => REFERRAL_ACTION_CONFIG[action].category === category
    );
  }

  static getActionsByPriority(enabledOnly: boolean = false): ReferralAction[] {
    let actions = Object.values(ReferralAction);

    if (enabledOnly) {
      actions = actions.filter((action) => REFERRAL_ACTION_CONFIG[action].isEnabled);
    }

    return actions.sort(
      (a, b) => REFERRAL_ACTION_CONFIG[a].priority - REFERRAL_ACTION_CONFIG[b].priority
    );
  }

  static validateActionMetadata(
    action: ReferralAction,
    metadata?: { amount?: string; tokenSymbol?: string }
  ): { isValid: boolean; errors: string[] } {
    const config = REFERRAL_ACTION_CONFIG[action];
    const errors: string[] = [];

    if (config.requiresAmount && !metadata?.amount) {
      errors.push('Amount is required for this action');
    }

    if (config.requiresToken && !metadata?.tokenSymbol) {
      errors.push('Token symbol is required for this action');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static getDisplayName(action: ReferralAction): string {
    return REFERRAL_ACTION_CONFIG[action].name;
  }

  static getDescription(action: ReferralAction): string {
    return REFERRAL_ACTION_CONFIG[action].description;
  }

  static setActionEnabled(action: ReferralAction, enabled: boolean): void {
    REFERRAL_ACTION_CONFIG[action].isEnabled = enabled;
  }

  static getActionsForUI(enabledOnly: boolean = true): Array<{
    value: ReferralAction;
    label: string;
    description: string;
    category: string;
    requiresAmount: boolean;
    requiresToken: boolean;
  }> {
    const actions = enabledOnly ? this.getEnabledActions() : Object.values(ReferralAction);

    return actions.map((action) => ({
      value: action,
      label: this.getDisplayName(action),
      description: this.getDescription(action),
      category: REFERRAL_ACTION_CONFIG[action].category,
      requiresAmount: REFERRAL_ACTION_CONFIG[action].requiresAmount || false,
      requiresToken: REFERRAL_ACTION_CONFIG[action].requiresToken || false,
    }));
  }
}

export function isReferralAction(value: any): value is ReferralAction {
  return Object.values(ReferralAction).includes(value);
}

export const VALID_REFERRAL_ACTIONS = Object.values(ReferralAction) as string[];
export const ENABLED_REFERRAL_ACTIONS = ReferralActionUtils.getEnabledActionStrings();
