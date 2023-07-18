// deno-lint-ignore-file no-inner-declarations
/* eslint-disable no-inner-declarations */
import {Puppeteer} from 'puppeteer-core/lib/esm/puppeteer/common/Puppeteer.js';
import {ExtensionDebuggerTransport} from '../src';

chrome.runtime.onInstalled.addListener(object => {
  //TODO: change to extension homepage and create the page
  const externalUrl = 'https://autozon.sethusenthil.com/welcome.html';

  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({url: externalUrl}, tab => {
      console.log('launched welcom screen');
    });
  }
});

const puppeteer = new Puppeteer({isPuppeteerCore: true});

async function run({
  tabId,
  cardNumber,
  customAmount,
  delayMS,
  times,
}: {
  tabId: number;
  cardNumber: number;
  customAmount: number;
  delayMS: number;
  times: number;
}): Promise<void> {
  const extensionTransport = await ExtensionDebuggerTransport.create(tabId);
  const browser = await puppeteer.connect({
    transport: extensionTransport,
    defaultViewport: null,
  });

  // use first page from pages instead of using browser.newPage()
  const [page] = await browser.pages();
  if (!page) {
    throw new Error('no page!?');
  } else {
    try {
      const CARD_NUMBER = cardNumber;
      const CUSTOM_AMOUNT = customAmount;
      const DELAY_MS = delayMS;
      const TIMES = times;

      for (let i = 0; i < TIMES; i++) {
        await reloadGiftCard(CARD_NUMBER, CUSTOM_AMOUNT);
        // don't delay after the last time
        if (i < TIMES - 1) {
          chrome.notifications.create('NOTFICATION_ID', {
            type: 'basic',
            iconUrl: './icon.png',
            title: 'AutoZon Delay',
            message: `AutoZon is delaying for a ${
              DELAY_MS / 1000
            } seconds before next charge`,
            priority: 2,
          });
          await delay(DELAY_MS);
        } else {
          chrome.tabs.create({
            url: 'https://sethusenthil.com',
            active: true,
          });
        }
      }

      async function delay(ms: number) {
        await new Promise(resolve => setTimeout(resolve, ms));
      }

      async function reloadGiftCard(
        CARD_NUMBER: number,
        CUSTOM_AMOUNT: number
      ) {
        await page!.goto(
          'https://www.amazon.com/gp/gc/create?rw_useCurrentProtocol=1&ref_=gc_reload_button'
        );

        const custom_amount_btn_selector =
          '#gcui-asv-reload-form-custom-amount';

        await page!.waitForSelector(custom_amount_btn_selector);

        await page!.focus(custom_amount_btn_selector);
        await page!.keyboard.type(CUSTOM_AMOUNT.toString());

        const buy_now_btn_selector = 'input[name="submit.gc-buy-now"]';
        await page!.waitForSelector(buy_now_btn_selector);

        await page!.keyboard.press('Enter');

        const change_payment_source_btn_selector = '#payChangeButtonId';
        await page!.waitForSelector(change_payment_source_btn_selector);
        await page!.click(change_payment_source_btn_selector);

        const selected_payment_method = '.pmts-selected';
        await page!.waitForSelector(selected_payment_method);

        //const all_card_details_selector = '.pmts-cc-detail';

        const selectCard = `[data-number="${CARD_NUMBER}"]`;
        await page!.click(selectCard);

        const use_payment_method_selector =
          '[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]';

        try {
          await page!.click(use_payment_method_selector);
        } catch (err) {}

        const selected_billing_accress = '.list-address-selected';
        //TODO: add a check to see if the address is already selected

        const use_this_address_btn =
          '[aria-labelledby="orderSummaryPrimaryActionBtn-announce"]';

        //actually place the order
        const place_order_btn = '[name="placeYourOrder1"]';
        await page!.click(place_order_btn);

        // chrome.notifications.create('NOTFICATION_ID_TEST', {
        //   type: 'basic',
        //   iconUrl:
        //     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAABcCAMAAADUMSJqAAAAY1BMVEX///8AAACXl5fs7OyCgoLx8fGMjIz8/PwLCwv19fX4+PihoaHm5ubW1taIiIhWVlbc3NzOzs4wMDAbGxuysrIpKSkSEhJ5eXkhISFMTEyoqKjHx8e/v79dXV1RUVE7OztsbGwgz85bAAAEU0lEQVRogbWZC2PiIAyAQUopte20U+e57bb//ysvobbyfullzwL5GgMECIQLEpRYXUYTGavOYCfVQ9VZ7KS6vzqTnVT3VWezk+pudQE7qW5XF7GT6uZjITuprhcUs5PqMOSJUMV9ORuU8JdSFH51MQysgrsJG4awXXyI1SYFbBt48MWHcRzB+Eo5KHW/cbLp6Aukm3oP+/0VaJSrdOBvr2JT+mazj1j60U5Tu6sVUJ7aD+QcLXgLZZ+ccR7s7rRw6FX+CaDWqmigjIixucH/pxZGO2tPxXQYij0BUOODE+jUL3Ki1zMhM6VFdDUEgQ3wqwufKeHwhh14qKNCej5dTB7xBBQnG35Gy3d05oSd4Q1kT68FoUCLVa5bxKTcsok7VKOiN0e4Efq48rnkDxl4gQzs8b9UlpurHMIvnS5zlyuXWdO8LG4x1ufGmWfdnDsjnYbNoxfUHxdO6TmP7TZrNuzyCoTvWlOmNkMmS2u3whF8N3+ZRJZ4gme6yQaHYXJ3vBeeXqk9DWho+pfSfdX58DjdW1kAj9H9VSXwMF36K4rgHrowt03CiERlcGIvTn1vbMoO1+6rHm7ZLvpeaj4RZ1O1FG7SeyKl5gsM1n+egRt0AbMSbV+eRgwmw1NwfZqjV8DnC1xgSNzrLdNwcdv7pFfuAK983u69bDslB/7tj65/cXRzSW4UF1vicUoOPBC6L+gQsaxbs/Q5JQd+88N3QnL4Jgd8ANtdp2R1KPduwQWOE7B+cccPbt2ovQGpGC1KpACy5DiBxvXD3OxGlXA1/tYBflzYtlMq4UL2vCePib/Y7u7KauA43QXrtc3V6I6UWjhGFAE+18Phr4ddAxeLRzIOksVw8LfEIL6E8cASVAUXuIvtcQSuS0R01S6Cg83ga/W1lZlr066xt9DZcLRaqNmjFeq2wwHupxaOdLTUXJQftmMM6Krhii7tXlxtFziV9KNZ6WiRvhzKnY6n2m+9PAMuDcHjCMpWLdZspxsY0/CTP56vM3LAIyXSHaeUrUSznii53G1HX7TYq45TcuBbDsM8k6wBVn0woH+9u4ExDe/33sSE1JuDZy70xznE6/DYySJybJmUy+Dn167R4TJ8JoqGkPX4dwjD+Ur3wBNHlpYuI8VutsH5ZrsLTx620DNvbsMVfi+WwgPPSLlO9MzcptQ4QSu6s2/JSV6ug9BoTM2zPwYPC/5EilvBjYBv5VueSXEj3IpzzbmjvqbldO8MvW7w+AIcomtwJ8el3MJYRi4hLJJxhHe25TgljgI2ss/AcR98pG5aD8s6TLdWZ1tBMN2KEdpOt/7XRPELU9xnT96QNZdXoC+NNycp2QhyOFTeKwyjUmeBfCcbhmeuW3pUD1+oMJWjfooesY09wwbHhthLcFDsqukvN/X41VwNPXZHaT0W061kUvQ6tJTu3KJEL3LL6J4bmugVdAndqx+9PM+nB/Sj1/659KA+VEQQWfTIjZj8B+o5LKB4kQ69AAAAAElFTkSuQmCC',
        //   title: 'Would be buying rn',
        //   message: 'Would be buying...',
        //   priority: 2,
        // });
      }
    } catch (err) {
      console.log('AUTOZON ERROR!');
      chrome.notifications.create('NOTFICATION_ID_ERROR', {
        type: 'basic',
        iconUrl: './icon.png',
        title: 'AutoZon Error',
        message: 'An error occured while running AutoZon. Please try again!',
        priority: 2,
      });
      console.error(err);
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.includes('PURCHASE_GIFT_CARD')) {
    const parsedData = JSON.parse(message);
    chrome.tabs.create(
      {
        active: true,
        url: 'https://autozon.sethusenthil.com/start.html',
      },
      tab =>
        tab.id
          ? run({
              tabId: tab.id,
              cardNumber: parsedData.cardEnding,
              customAmount: parsedData.amountCharged,
              times: parsedData.repeatTimes,
              delayMS: parsedData.delayTimeSeconds * 1000,
            })
          : null
    );
  }
});
