/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { act, renderHook } from '@testing-library/react';
import i18next, { i18n as _i18n } from 'i18next';
import { ComponentType, PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import { mockEnvironment } from './testUtils/environmentTestUtils';
import {
  getEnvironmentUrl,
  isValidUrl,
  selectHelpCenterUrl,
  useHelpCenterUrl,
  warnOnce,
} from './useHelpCenterUrl';

// The instance is passed via I18nextProvider and not registered globally with
// initReactI18next, so the other tests keep using the default instance
function setupI18n(instance: _i18n) {
  instance.init({
    lng: 'en',
    resources: {
      en: {
        neoboard: {
          helpCenter: {},
        },
      },
      de: {
        neoboard: {
          helpCenter: {},
        },
      },
    },
  });
  return instance;
}

beforeEach(() => {
  // Each test should see its own warnings
  warnOnce.cache.clear?.();
});

describe('useHelpCenterUrl', () => {
  let i18n: _i18n;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockEnvironment({
      REACT_APP_HELP_CENTER_URL_EN: 'https://example.com/user-guide.pdf',
      REACT_APP_HELP_CENTER_URL_DE: 'https://example.com/handbuch.pdf',
    });

    i18n = i18next.createInstance();
    setupI18n(i18n);

    Wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    );
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should return undefined if no URL is configured', () => {
    mockEnvironment({});

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBeUndefined();
  });

  it('should return the URL for the current language', () => {
    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/user-guide.pdf');
  });

  it('should return the URL for the selected language', async () => {
    await i18n.changeLanguage('de');

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/handbuch.pdf');
  });

  it('should use the supported language for a regional variant', async () => {
    await i18n.changeLanguage('de-CH');

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/handbuch.pdf');
  });

  it('should fall back to the english URL', async () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL_EN: 'https://example.com/user-guide.pdf',
    });
    await i18n.changeLanguage('de');

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/user-guide.pdf');
  });

  it('should ignore an invalid URL and fall back to the english URL', async () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL_EN: 'https://example.com/user-guide.pdf',
      REACT_APP_HELP_CENTER_URL_DE: 'javascript:alert(1)',
    });
    await i18n.changeLanguage('de');

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/user-guide.pdf');
    expect(console.warn).toHaveBeenCalledWith(
      'Environment variable "REACT_APP_HELP_CENTER_URL_DE" value is invalid: "javascript:alert(1)"',
    );
  });

  it('should fall back to the english URL for an unsupported language', async () => {
    await i18n.changeLanguage('fr');

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/user-guide.pdf');
  });

  it('should fall back to the URL of any other language', () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL_DE: 'https://example.com/handbuch.pdf',
    });

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/handbuch.pdf');
  });

  it('should use the deprecated REACT_APP_HELP_CENTER_URL as english URL and warn once', () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL: 'https://example.com/manual.pdf',
    });

    const { result, rerender } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });
    rerender();

    expect(result.current).toBe('https://example.com/manual.pdf');
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      'Environment variable "REACT_APP_HELP_CENTER_URL" is deprecated, use "REACT_APP_HELP_CENTER_URL_EN" and "REACT_APP_HELP_CENTER_URL_DE" instead',
    );
  });

  it('should use the deprecated REACT_APP_HELP_CENTER_URL for other languages', async () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL: 'https://example.com/manual.pdf',
    });
    await i18n.changeLanguage('de');

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/manual.pdf');
  });

  it('should prefer REACT_APP_HELP_CENTER_URL_EN over the deprecated REACT_APP_HELP_CENTER_URL', () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL: 'https://example.com/manual.pdf',
      REACT_APP_HELP_CENTER_URL_EN: 'https://example.com/user-guide.pdf',
    });

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/user-guide.pdf');
  });

  it('should ignore an invalid deprecated REACT_APP_HELP_CENTER_URL', () => {
    mockEnvironment({ REACT_APP_HELP_CENTER_URL: 'javascript:alert(1)' });

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      'Environment variable "REACT_APP_HELP_CENTER_URL" value is invalid: "javascript:alert(1)"',
    );
  });

  it('should update the URL when the language changes', async () => {
    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/user-guide.pdf');

    await act(async () => {
      await i18n.changeLanguage('de');
    });

    expect(result.current).toBe('https://example.com/handbuch.pdf');
  });
});

describe('isValidUrl', () => {
  it.each(['http://example.com', 'https://example.com'])(
    'should return true for valid URL: %s',
    (value) => {
      expect(isValidUrl(value)).toBe(true);
    },
  );

  it.each([
    'example.com',
    'www.example.com',
    'other',
    'manuals/en/user-guide.pdf',
    '/manuals/en/user-guide.pdf',
    'javascript:alert(1)',
    'data:text/html,<p>Manual</p>',
    'https://[invalid',
  ])('should return false for invalid URL: %s', (value) => {
    expect(isValidUrl(value)).toBe(false);
  });
});

describe('getEnvironmentUrl', () => {
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should return URL from environment', () => {
    mockEnvironment({ REACT_APP_URL: 'https://example.com' });

    expect(getEnvironmentUrl('REACT_APP_URL')).toBe('https://example.com');
  });

  it('should return undefined if URL is not set', () => {
    mockEnvironment({});

    expect(getEnvironmentUrl('REACT_APP_URL')).toBeUndefined();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should return undefined if URL is not valid', () => {
    vi.mocked(console.warn).mockImplementation(() => {});

    mockEnvironment({ REACT_APP_URL: 'example' });

    expect(getEnvironmentUrl('REACT_APP_URL')).toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      'Environment variable "REACT_APP_URL" value is invalid: "example"',
    );
  });

  it('should warn only once about the same invalid URL', () => {
    vi.mocked(console.warn).mockImplementation(() => {});

    mockEnvironment({ REACT_APP_URL: 'example' });

    getEnvironmentUrl('REACT_APP_URL');
    getEnvironmentUrl('REACT_APP_URL');

    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

describe('selectHelpCenterUrl', () => {
  it('should return undefined if no URL is configured', () => {
    expect(selectHelpCenterUrl({}, 'de')).toBeUndefined();
  });

  it('should prefer the URL for the current language', () => {
    expect(
      selectHelpCenterUrl(
        {
          en: 'https://example.com/user-guide.pdf',
          de: 'https://example.com/handbuch.pdf',
        },
        'de',
      ),
    ).toBe('https://example.com/handbuch.pdf');
  });

  it('should fall back to the english URL', () => {
    expect(
      selectHelpCenterUrl({ en: 'https://example.com/user-guide.pdf' }, 'de'),
    ).toBe('https://example.com/user-guide.pdf');
  });

  it('should fall back to the URL of any other language', () => {
    expect(
      selectHelpCenterUrl({ de: 'https://example.com/handbuch.pdf' }, 'en'),
    ).toBe('https://example.com/handbuch.pdf');
  });

  it('should use english if no language is available', () => {
    expect(
      selectHelpCenterUrl(
        {
          de: 'https://example.com/handbuch.pdf',
          en: 'https://example.com/user-guide.pdf',
        },
        undefined,
      ),
    ).toBe('https://example.com/user-guide.pdf');
  });
});
