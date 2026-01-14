import { Token } from '@normalfinance/types';
import { constants } from '.';

// Filter predicates

export const isNormalToken = (tkn: Token): boolean =>
  tkn.issuer === constants.StellarConfig.NORMAL_ISSUER;

export const isLongToken = (tkn: Token): boolean =>
  isNormalToken(tkn) && !tkn.symbol.startsWith('s');

export const isShortToken = (tkn: Token): boolean =>
  isNormalToken(tkn) && tkn.symbol.startsWith('s');
