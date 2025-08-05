/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
/* eslint-disable func-names */
/* eslint-disable prefer-rest-params */
/* eslint-disable vars-on-top */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-var */

const CRISP_WEBSITE_ID =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) || '';

// prettier-ignore
export const load = () => {
  // @ts-ignore
  window.$crisp = [];
  // @ts-ignore
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  // prettier-ignore
  (function () {
    const d = document;
    const s = d.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    d.getElementsByTagName('head')[0].appendChild(s);
  })();
};

export const boot = (options: Record<string, unknown> = {}) => {
  // @ts-ignore
  window && window.$crisp && window.$crisp.push(['do', 'chat:show']);
};

export const show = () => {
  // @ts-ignore
  window && window.$crisp && window.$crisp.push(['do', 'chat:open', []]);
};
