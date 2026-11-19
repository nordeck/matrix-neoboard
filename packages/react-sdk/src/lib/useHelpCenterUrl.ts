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
import { useTranslation } from 'react-i18next';
import { defaultLanguage, supportedLanguages } from './locale';

/**
 * Selects the help center URL for the given language. The configured URLs are
 * tried in the following order and the first one is used:
 *
 * 1. The URL for the given language.
 * 2. The URL for english.
 * 3. The first URL in the list, if there is no match for both the user language and the default language
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
 * other configured URL. Updates when the language changes.
 *
 * @returns The URL or `undefined` if no URL is configured.
 */
export function useHelpCenterUrl(): string | undefined {
  const { i18n } = useTranslation('neoboard');

  const urls: Partial<Record<string, string>> = Object.fromEntries(
    supportedLanguages.map((language) => [
      language,
      getEnvironment(`REACT_APP_HELP_CENTER_URL_${language.toUpperCase()}`),
    ]),
  );

  // TODO: Remove the deprecated variable in the next major version
  urls[defaultLanguage] ??= getEnvironment('REACT_APP_HELP_CENTER_URL');

  return selectHelpCenterUrl(urls, i18n.resolvedLanguage);
}
