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
import { i18n as _i18n } from 'i18next';
import { ComponentType, PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockEnvironment } from './testUtils/environmentTestUtils';
import { setupI18n } from './testUtils/i18nTestUtils';
import { selectHelpCenterUrl, useHelpCenterUrl } from './useHelpCenterUrl';

describe('useHelpCenterUrl', () => {
  let i18n: _i18n;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL_EN: 'https://example.com/user-guide.pdf',
      REACT_APP_HELP_CENTER_URL_DE: 'https://example.com/handbuch.pdf',
    });

    i18n = setupI18n('en', {
      en: { neoboard: { helpCenter: {} } },
      de: { neoboard: { helpCenter: {} } },
    });

    Wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    );
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

  it('should use the deprecated REACT_APP_HELP_CENTER_URL as english URL', () => {
    mockEnvironment({
      REACT_APP_HELP_CENTER_URL: 'https://example.com/manual.pdf',
    });

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('https://example.com/manual.pdf');
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

  it('should accept a relative path in the deprecated REACT_APP_HELP_CENTER_URL', () => {
    mockEnvironment({ REACT_APP_HELP_CENTER_URL: '/manuals/user-guide.pdf' });

    const { result } = renderHook(() => useHelpCenterUrl(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe('/manuals/user-guide.pdf');
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
