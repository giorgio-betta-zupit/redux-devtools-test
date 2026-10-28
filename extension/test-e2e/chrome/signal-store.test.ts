import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Browser, Frame, Page } from 'puppeteer-core';
import {
  dispatchOnFixture,
  getDevtoolsPageFor,
  launchWithDockedDevtools,
  readActionRows,
  showReduxPanel,
  startFixtureServer,
  waitFor,
  type FixtureServer,
} from '../helpers/browser.js';

/**
 * NgRx Signal Stores connect with `type: 'signalStore'` and get their own
 * clearable selector. One store connects before the panel opens (replayed by
 * the background) and one after; the Redux store stays the default view.
 */
describe('Signal Store selector in the docked panel', () => {
  let server: FixtureServer;
  let browser: Browser;
  let page: Page;
  let panel: Frame;

  const connectSignalStore = (name: string) =>
    page.evaluate((storeName) => {
      const extension = (
        window as unknown as {
          __REDUX_DEVTOOLS_EXTENSION__: {
            connect: (options: object) => {
              init: (state: object) => void;
              send: (action: { type: string }, state: object) => void;
            };
          };
        }
      ).__REDUX_DEVTOOLS_EXTENSION__;
      const devtools = extension.connect({
        name: storeName,
        type: 'signalStore',
        features: { jump: true },
      });
      devtools.init({ store: storeName, value: 0 });
      devtools.send({ type: `[${storeName}] update` }, { value: 1 });
    }, name);

  const signalStoreInput = () =>
    panel.waitForSelector('input[aria-label="Signal Store"]', {
      timeout: 10_000,
    });

  // Signal Stores declare no `skip` feature, so their rows have no Jump/Skip
  // buttons and `readActionRows` would filter them out.
  const readRows = () =>
    panel.$$eval('[data-testid="actionListRows"] [data-id]', (rows) =>
      rows.map((r) => r.textContent ?? ''),
    );

  beforeAll(async () => {
    server = await startFixtureServer();
    let extensionId: string;
    ({ browser, extensionId } = await launchWithDockedDevtools());
    page = await browser.newPage();
    await page.goto(server.url);
    await connectSignalStore('Counter');
    const devtools = await getDevtoolsPageFor(browser, page);
    panel = await showReduxPanel(devtools, extensionId);
    await connectSignalStore('Todos');
    await dispatchOnFixture(page, 'INCREMENT');
  });

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  test('shows the Redux store while no Signal Store is selected', async () => {
    const rows = await waitFor(
      () => readActionRows(panel),
      (r) => r.length === 2 && /INCREMENT/.test(r[1]),
    );
    expect(rows[0]).toMatch(/@@INIT/);
  });

  test('lists Signal Stores only in their own selector', async () => {
    const input = await signalStoreInput();
    await input!.focus();
    await input!.press('ArrowDown');
    const options = await waitFor(
      () =>
        panel.$$eval('[class*="-option"]', (nodes) =>
          nodes.map((n) => n.textContent ?? ''),
        ),
      (labels) => labels.length === 2,
    );
    expect(options).toEqual(['Counter', 'Todos']);
    await input!.press('Escape');
  });

  test('shows the selected Signal Store', async () => {
    const input = await signalStoreInput();
    await input!.focus();
    await input!.type('Counter');
    await input!.press('Enter');
    const rows = await waitFor(
      readRows,
      (r) => r.length === 2 && /\[Counter\] update/.test(r[1]),
    );
    expect(rows[0]).toMatch(/@@INIT/);
  });

  test('goes back to the Redux store when the selector is cleared', async () => {
    const input = await signalStoreInput();
    await input!.focus();
    await input!.press('Backspace');
    const rows = await waitFor(
      () => readActionRows(panel),
      (r) => r.length === 2 && /INCREMENT/.test(r[1]),
    );
    expect(rows[1]).not.toMatch(/Counter/);
  });
});
