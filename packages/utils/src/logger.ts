const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: isDev ? console.log : () => {},
  error: isDev ? console.error : () => {},
  warn: isDev ? console.warn : () => {},
  info: isDev ? console.info : () => {},
  debug: isDev ? console.debug : () => {},
};
