/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
/* eslint-disable func-names */
/* eslint-disable prefer-rest-params */
/* eslint-disable vars-on-top */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-var */

// prettier-ignore
export const load = () => {
  (function () {
    const frame = document.createElement('iframe');
    frame.src = 'https://grmcl3nnw63w.statuspage.io/embed/frame';
    frame.style.position = 'fixed';
    frame.style.border = 'none';
    frame.style.boxShadow = '0 20px 32px -8px rgba(9,20,66,0.25)';
    frame.style.zIndex = '9999';
    frame.style.transition = 'left 1s ease, bottom 1s ease, right 1s ease';

    frame.title = 'Normal Status';
    frame.ariaHidden = true;

    let mobile;
    // eslint-disable-next-line no-cond-assign, no-restricted-globals
    if ((mobile = screen.width < 450)) {
      frame.src += '?mobile=true';
      frame.style.height = '20vh';
      frame.style.width = '100vw';
      frame.style.left = '-9999px';
      frame.style.bottom = '-9999px';
      frame.style.transition = 'bottom 1s ease';
    } else {
      frame.style.height = '115px';
      frame.style.width = '320px';
      frame.style.left = 'auto';
      frame.style.right = '-9999px';
      frame.style.bottom = '60px';
    }

    document.body.appendChild(frame);

    const actions = {
      showFrame () {
        frame.tabIndex = '0';
        if (mobile) {
          frame.style.left = '0';
          frame.style.bottom = '0';
        } else {
          frame.style.left = 'auto';
          frame.style.right = '60px';
        }
      },
      dismissFrame () {
        frame.style.left = '-9999px';
        frame.tabIndex = '-1';
      },
    };

    window.addEventListener(
      'message',
      (event) => {
        // eslint-disable-next-line no-prototype-builtins
        if (event.data.action && actions.hasOwnProperty(event.data.action)) {
          actions[event.data.action](event.data);
        }
      },
      false
    );

    window.statusEmbedTest = actions.showFrame;
  })();
}
