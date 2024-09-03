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
import '@testing-library/jest-dom';
import fetchMock from 'fetch-mock';
import { toHaveNoViolations } from 'jest-axe';
import log from 'loglevel';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'util';
import './i18n';
import { setLocale } from './lib/locale';
import './lib/testUtils/webRtcMock';

// Use a different configuration for i18next during tests
jest.mock('./i18n', () => {
  const i18n = jest.requireActual('i18next');
  const { initReactI18next } = jest.requireActual('react-i18next');

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

// Add support for jest-axe
expect.extend(toHaveNoViolations);

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
window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();

// global.crypto is used by lib0 (introduced by yjs) that has no automatic
// definition in jsdom
Object.defineProperty(global.globalThis, 'crypto', { value: webcrypto });

// Provide a mock for the Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn() },
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
  return { inverse: jest.fn() };
};

// Mock File APIs

File.prototype.arrayBuffer = jest.fn();

// Mock the fetch API
Object.assign(global, {
  fetch: fetchMock.sandbox(),
});

// @ts-expect-error This does not exist outside of polyfill which this is doing
window.Promise.withResolvers = function () {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
