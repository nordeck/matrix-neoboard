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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import memoize from 'lodash/memoize';
import { useTranslation } from 'react-i18next';

// Languages with translations in `src/locales`
const helpCenterLanguages = ['en', 'de'];
const defaultLanguage = 'en';
const allowedProtocols = ['http:', 'https:'];

/**
 * Logs each warning message only once, as the environment is read on every
 * render.
 */
export const warnOnce = memoize((message: string): void => {
  console.warn(message);
});

/**
 * Checks whether the value is a valid URL. Only `http(s)` URLs are accepted
 * to avoid e.g. `javascript:` links.
 *
 * @param value - The URL to check.
 * @returns true if the URL is valid, false otherwise
 */
export function isValidUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return allowedProtocols.includes(protocol);
  } catch {
    return false;
  }
}

/**
 * Reads the environment variable and return the value if is a valid URL.
 * Warns once about an invalid value.
 * @param name variable name
 * @returns URL or undefined if missing or not valid
 */
export function getEnvironmentUrl(name: string): string | undefined {
  const value = getEnvironment(name);

  if (!value) {
    return undefined;
  }

  if (!isValidUrl(value)) {
    warnOnce(`Environment variable "${name}" value is invalid: "${value}"`);
    return undefined;
  }

  return value;
}

/**
 * Selects the help center URL for the given language. The configured URLs are
 * tried in the following order and the first one is used:
 *
 * 1. The URL for the given language.
 * 2. The URL for english.
 * 3. The URL for any other language.
 *
 * @param urls - The configured URLs, keyed by language code.
 * @param language - The current language, defaults to `en` if not available.
 * @returns The selected URL or `undefined` if no URL is configured.
 */
export function selectHelpCenterUrl(
  urls: Partial<Record<string, string>>,
  language: string | undefined,
): string | undefined {
  return (
    urls[language || defaultLanguage] ||
    urls[defaultLanguage] ||
    Object.values(urls).find((url) => url)
  );
}

/**
 * Returns the help center URL for the current language, configured via
 * `REACT_APP_HELP_CENTER_URL_<LANGUAGE>` (e.g. `REACT_APP_HELP_CENTER_URL_DE`).
 * The deprecated `REACT_APP_HELP_CENTER_URL` is used as the english URL if
 * `REACT_APP_HELP_CENTER_URL_EN` is not set. Falls back to the english or any
 * other configured URL. Invalid URLs are ignored. Updates when the language
 * changes.
 *
 * @returns The URL or `undefined` if no valid URL is configured.
 */
export function useHelpCenterUrl(): string | undefined {
  const { i18n } = useTranslation('neoboard');

  if (getEnvironment('REACT_APP_HELP_CENTER_URL')) {
    warnOnce(
      'Environment variable "REACT_APP_HELP_CENTER_URL" is deprecated, use "REACT_APP_HELP_CENTER_URL_EN" and "REACT_APP_HELP_CENTER_URL_DE" instead',
    );
  }

  const urls: Partial<Record<string, string>> = Object.fromEntries(
    helpCenterLanguages.map((language) => [
      language,
      getEnvironmentUrl(`REACT_APP_HELP_CENTER_URL_${language.toUpperCase()}`),
    ]),
  );

  // TODO: Remove the deprecated variable in the next major version
  urls[defaultLanguage] ??= getEnvironmentUrl('REACT_APP_HELP_CENTER_URL');

  return selectHelpCenterUrl(urls, i18n.resolvedLanguage);
}
