import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Browser, Frame, Page } from 'puppeteer-core';
import {
  getDevtoolsPageFor,
  launchWithDockedDevtools,
  showReduxPanel,
  startFixtureServer,
  waitFor,
  type FixtureServer,
} from '../helpers/browser.js';

const connectSignalStore = (page: Page, name: string) =>
  page.evaluate((storeName) => {
    const extension = (
      window as unknown as {
        __REDUX_DEVTOOLS_EXTENSION__: {
          connect: (options: object) => { init: (state: object) => void };
        };
      }
    ).__REDUX_DEVTOOLS_EXTENSION__;
    extension
      .connect({ name: storeName, type: 'signalStore' })
      .init({ value: 0 });
  }, name);

/**
 * A panel opened on a tab without stores gets nothing replayed when another
 * tab only holds Signal Stores (they never become the background's `current`
 * instance), so that tab going away can be the first message the panel sees.
 */
describe('panel opened before its tab has a store', () => {
  let server: FixtureServer;
  let browser: Browser;
  let other: Page;
  let page: Page;
  let panel: Frame;
  const panelLogs: string[] = [];

  beforeAll(async () => {
    server = await startFixtureServer();
    let extensionId: string;
    ({ browser, extensionId } = await launchWithDockedDevtools());
    other = await browser.newPage();
    await other.goto(`${server.url}blank.html?other`);
    await connectSignalStore(other, 'Other');
    page = await browser.newPage();
    await page.goto(`${server.url}blank.html?inspected`);
    const devtools = await getDevtoolsPageFor(browser, page);
    panel = await showReduxPanel(devtools, extensionId);
    // Errors thrown in the panel's port listener only reach its own target.
    const target = await browser.waitForTarget((t) =>
      t.url().includes('/devpanel.html'),
    );
    const session = await target.createCDPSession();
    session.on('Log.entryAdded', ({ entry }) => panelLogs.push(entry.text));
    await session.send('Log.enable');
  });

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  test('ignores another tab going away', async () => {
    await other.reload();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(panelLogs.filter((text) => /TypeError/.test(text))).toEqual([]);
  });

  test("still shows the inspected tab's store afterwards", async () => {
    await connectSignalStore(page, 'Inspected');
    const input = await panel.waitForSelector(
      'input[aria-label="Signal Store"]',
      { timeout: 10_000 },
    );
    await input!.focus();
    await input!.press('ArrowDown');
    const options = await waitFor(
      () =>
        panel.$$eval('[class*="-option"]', (nodes) =>
          nodes.map((n) => n.textContent ?? ''),
        ),
      (labels) => labels.includes('Inspected'),
    );
    expect(options).toContain('Inspected');
  });
});
