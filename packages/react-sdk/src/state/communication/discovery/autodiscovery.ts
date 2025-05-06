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
import { WidgetApi } from '@matrix-widget-toolkit/api';
import { getLogger } from 'loglevel';
import { IOpenIDCredentials } from 'matrix-widget-api';
import { SFUConfig } from '../matrixRtcCommunicationChannel';
import { LivekitFocus } from './matrixRtcFocus';

export interface IWellKnownConfig<T = IClientWellKnown> {
  raw?: T;
  base_url?: string | null;
  server_name?: string;
}

export interface IClientWellKnown {
  [key: string]: unknown;
  'm.homeserver'?: IWellKnownConfig;
  'm.identity_server'?: IWellKnownConfig;
}

export const FOCI_WK_KEY = 'org.matrix.msc4143.rtc_foci';

/*
 * This AutoDiscovery class is inspired on the matrix-js-sdk one
 * see: https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/autodiscovery.ts
 */

export default class AutoDiscovery {
  /**
   * Gets the raw discovery client configuration for the given domain.
   * @param domain - The homeserver domain to get the client config for, without the protocol prefix.
   * @returns Promise which resolves to the domain's client config. Can be an empty object.
   */
  public static async getRawClientConfig(
    domain: string | undefined,
  ): Promise<IClientWellKnown> {
    if (!domain || typeof domain !== 'string' || domain.length === 0) {
      throw new Error("'domain' must be a string of non-zero length");
    }

    const response = await this.fetchWellKnownObject(
      `https://${domain}/.well-known/matrix/client`,
    );
    if (!response) return {};
    return response.raw !== undefined ? response.raw : {};
  }

  /**
   * Fetches a JSON object from a given URL, as expected by all .well-known
   * related lookups.
   *
   * @param url - The URL to fetch a JSON object from.
   * @returns Promise which resolves to the returned state.
   */
  private static async fetchWellKnownObject<T = IWellKnownConfig>(
    url: string,
  ): Promise<IWellKnownConfig<Partial<T>>> {
    let response: Response;

    try {
      response = await AutoDiscovery.fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404 || !response.ok) {
        return {
          raw: {},
        };
      }

      return {
        raw: await response.json(),
      };
    } catch {
      return {
        raw: {},
      };
    }
  }

  private static fetch(
    resource: URL | string,
    options?: RequestInit,
  ): ReturnType<typeof globalThis.fetch> {
    if (this.fetchFn) {
      return this.fetchFn(resource, options);
    }
    return globalThis.fetch(resource, options);
  }

  private static fetchFn?: typeof globalThis.fetch;

  public static setFetchFn(fetchFn: typeof globalThis.fetch): void {
    AutoDiscovery.fetchFn = fetchFn;
  }

  /**
   * This function will try to get the JWT Token from the active focus URL using an OpenID token.
   * The focus URL points to the LiveKit JWT Token Service and includes the room name in the alias.
   *
   * @param widgetApi - The widget API promise.
   * @param activeFocus - The active focus of the RTC session.
   * @returns
   */
  public static async getSFUConfigWithOpenID(
    widgetApi: WidgetApi,
    activeFocus: LivekitFocus,
  ): Promise<SFUConfig | undefined> {
    const logger = getLogger('getSFUConfigWithOpenID');
    const openIdToken = await widgetApi.requestOpenIDConnectToken();

    logger.debug('Got openID token', openIdToken);

    try {
      logger.info(
        `Trying to get JWT from call's active focus URL of ${activeFocus.livekit_service_url}...`,
      );
      const sfuConfig = await AutoDiscovery.getLiveKitJWT(
        widgetApi,
        activeFocus.livekit_service_url,
        activeFocus.livekit_alias,
        openIdToken,
      );
      logger.info(`Got JWT from call's active focus URL.`);

      return sfuConfig;
    } catch (e) {
      logger.warn(
        `Failed to get JWT from RTC session's active focus URL of ${activeFocus.livekit_service_url}.`,
        e,
      );
      return undefined;
    }
  }

  /**
   * Invokes the LiveKit JWT Token Service to get a JWT token for the given room name.
   *
   * @param widgetApi - The widget API promise.
   * @param livekitServiceURL - The LiveKit JWT Token Service URL.
   * @param roomName  - The room name to get the JWT token for.
   * @param openIDToken - The OpenID token to use for authentication.
   * @returns
   */
  public static async getLiveKitJWT(
    widgetApi: WidgetApi,
    livekitServiceURL: string,
    roomName: string,
    openIDToken: IOpenIDCredentials,
  ): Promise<SFUConfig> {
    const logger = getLogger('getLiveKitJWT');

    try {
      const res = await fetch(livekitServiceURL + '/sfu/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: roomName,
          openid_token: openIDToken,
          device_id: widgetApi.widgetParameters.deviceId,
        }),
      });
      if (!res.ok) {
        logger.error('SFU Config fetch failed with status code', res.status);
        throw new Error(
          'SFU Config fetch failed with status code ' + res.status,
        );
      }
      const sfuConfig = await res.json();
      logger.debug(
        'Get SFU config: \nurl:',
        sfuConfig.url,
        '\njwt',
        sfuConfig.jwt,
      );
      return sfuConfig;
    } catch (e) {
      logger.error('SFU Config fetch failed with exception', e);
      throw new Error('SFU Config fetch failed with exception ' + e);
    }
  }
}
