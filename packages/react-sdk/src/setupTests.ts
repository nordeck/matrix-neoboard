/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { AxeResults } from 'axe-core';
import log from 'loglevel';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'util';
import { afterEach, expect, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import './i18n';
import { setLocale } from './lib/locale';
import './lib/testUtils/webRtcMock';

// Prevent act warnings https://github.com/testing-library/react-testing-library/issues/1061
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

// Add support for axe
expect.extend({
  toHaveNoViolations(results: AxeResults) {
    const violations = results.violations ?? [];

    return {
      pass: violations.length === 0,
      actual: violations,
      message() {
        if (violations.length === 0) {
          return '';
        }

        return `Expected no accessibility violations but received some.

${violations
  .map(
    (violation) => `[${violation.impact}] ${violation.id}
${violation.description}
${violation.helpUrl}
`,
  )
  .join('\n')}
`;
      },
    };
  },
});

// Use a different configuration for i18next during tests
vi.mock('./i18n', async () => {
  const i18n = await vi.importActual<typeof import('i18next')>('i18next');
  const { initReactI18next } =
    await vi.importActual<typeof import('react-i18next')>('react-i18next');

  i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: { en: {} },
  });

  return i18n;
});

log.setLevel('silent');

// Provide a mock for the CSS Font Loading API
Object.defineProperty(document, 'fonts', {
  value: { ready: Promise.resolve([]) },
  configurable: true,
});

setLocale('en');

// Polyfills required for jsdom
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Provide mocks for the object URL related
// functions that are not provided by jsdom.
window.URL.createObjectURL = vi.fn();
window.URL.revokeObjectURL = vi.fn();

// global.crypto is used by lib0 (introduced by yjs) that has no automatic
// definition in jsdom
Object.defineProperty(global.globalThis, 'crypto', { value: webcrypto });

// Provide a mock for the Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn() },
});

// Set up SVG mocks
class MockDOMPoint implements DOMPoint {
  public x = 23;
  public y = 42;
  public w = 0;
  public z = 0;

  public matrixTransform(): DOMPoint {
    return new MockDOMPoint();
  }

  toJSON() {
    return {};
  }
}

SVGSVGElement.prototype.createSVGPoint = function () {
  return new MockDOMPoint();
};

// only mocking necessary props here
// @ts-expect-error test setup
SVGSVGElement.prototype.getScreenCTM = function () {
  return { inverse: vi.fn() };
};

// Mock File APIs

File.prototype.arrayBuffer = vi.fn();

// Mock the fetch API
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

afterEach(() => {
  cleanup();
});
