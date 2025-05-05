/*
 * Copyright 2018 New Vector Ltd
 * Copyright 2019 The Matrix.org Foundation C.I.C.
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

// Ignore that the license notice does not match the template due to other
// copyright notices

// eslint-disable-next-line notice/notice
export enum AutoDiscoveryAction {
  SUCCESS = 'SUCCESS',
  IGNORE = 'IGNORE',
  PROMPT = 'PROMPT',
  FAIL_PROMPT = 'FAIL_PROMPT',
  FAIL_ERROR = 'FAIL_ERROR',
}

export interface IWellKnownConfig<T = IClientWellKnown> {
  raw?: T;
  action?: AutoDiscoveryAction;
  reason?: string;
  error?: Error | string;
  base_url?: string | null;
  server_name?: string;
}

export interface IClientWellKnown {
  [key: string]: unknown;
  'm.homeserver'?: IWellKnownConfig;
  'm.identity_server'?: IWellKnownConfig;
}

export enum AutoDiscoveryError {
  Invalid = 'Invalid homeserver discovery response',
  MissingWellknown = 'No .well-known JSON file found',
  InvalidJson = 'Invalid JSON',
}

export const FOCI_WK_KEY = 'org.matrix.msc4143.rtc_foci';

/*
 * This AutoDiscovery class is a slimmed down version of the matrix-js-sdk one
 * see: https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/autodiscovery.ts
 */

export default class AutoDiscovery {
  public static readonly ERROR_MISSING_WELLKNOWN =
    AutoDiscoveryError.MissingWellknown;
  public static readonly ERROR_INVALID = AutoDiscoveryError.Invalid;
  public static readonly ERROR_INVALID_JSON = AutoDiscoveryError.InvalidJson;
  public static readonly FAIL_PROMPT = AutoDiscoveryAction.FAIL_PROMPT;

  /**
   * Gets the raw discovery client configuration for the given base URL.
   * @param baseUrl - The base URL to get the client config for.
   * @returns Promise which resolves to the domain's client config. Can
   * be an empty object.
   */
  public static async getRawClientConfig(
    baseUrl: string | undefined,
  ): Promise<IClientWellKnown> {
    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.length === 0) {
      throw new Error("'baseUrl' must be a string of non-zero length");
    }

    const response = await this.fetchWellKnownObject(
      `${baseUrl}/.well-known/matrix/client`,
    );
    if (!response) return {};
    return response.raw !== undefined ? response.raw : {};
  }

  /**
   * Fetches a JSON object from a given URL, as expected by all .well-known
   * related lookups. If the server gives a 404 then the `action` will be
   * IGNORE. If the server returns something that isn't JSON, the `action`
   * will be FAIL_PROMPT. For any other failure the `action` will be FAIL_PROMPT.
   *
   * The returned object will be a result of the call in object form with
   * the following properties:
   *   raw: The JSON object returned by the server.
   *   action: One of SUCCESS, IGNORE, or FAIL_PROMPT.
   *   reason: Relatively human-readable description of what went wrong.
   *   error: The actual Error, if one exists.
   * @param url - The URL to fetch a JSON object from.
   * @returns Promise which resolves to the returned state.
   * @internal
   */
  private static async fetchWellKnownObject<T = IWellKnownConfig>(
    url: string,
  ): Promise<IWellKnownConfig<Partial<T>>> {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404) {
        return {
          raw: {},
          action: AutoDiscoveryAction.IGNORE,
          reason: AutoDiscovery.ERROR_MISSING_WELLKNOWN,
        };
      }

      if (!response.ok) {
        return {
          raw: {},
          action: AutoDiscoveryAction.FAIL_PROMPT,
          reason: 'General failure',
        };
      }
    } catch (err) {
      const error = err as AutoDiscoveryError | string | undefined;
      let reason = '';
      if (typeof error === 'object' && error !== null) {
        const errorObj = <Error>error;
        reason = errorObj.message !== undefined ? errorObj.message : '';
      }

      return {
        error,
        raw: {},
        action: AutoDiscoveryAction.FAIL_PROMPT,
        reason: reason || 'General failure',
      };
    }

    try {
      return {
        raw: await response.json(),
        action: AutoDiscoveryAction.SUCCESS,
      };
    } catch (err) {
      const error = err as Error;
      return {
        error,
        raw: {},
        action: AutoDiscoveryAction.FAIL_PROMPT,
        reason:
          error !== null &&
          typeof error === 'object' &&
          (error as Error).name === 'SyntaxError'
            ? AutoDiscovery.ERROR_INVALID_JSON
            : AutoDiscovery.ERROR_INVALID,
      };
    }
  }
}
