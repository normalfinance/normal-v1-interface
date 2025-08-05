/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
/* eslint-disable func-names */
/* eslint-disable prefer-rest-params */
/* eslint-disable vars-on-top */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-var */
import { CRISP } from '@/config-global';

// prettier-ignore
export const load = () => {
  window.$crisp=[];window.CRISP_WEBSITE_ID=CRISP.websiteId;(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
}

// Initializes Crisp
export const boot = (options = {}) => {
  window && window.$crisp && window.$crisp.push(['do', 'chat:show']);
};

export const show = () => {
  window && window.$crisp && window.$crisp.push(['do', 'chat:open', []]);
};
