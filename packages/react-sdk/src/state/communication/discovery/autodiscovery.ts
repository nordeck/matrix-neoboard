/*
 * Copyright 2018 New Vector Ltd
 * Copyright 2019 The Matrix.org Foundation C.I.C.
 * Copyright 2025-2026 Nordeck IT + Consulting GmbH
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
import { getLogger } from 'loglevel';
import { IOpenIDCredentials } from 'matrix-widget-api';

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

export interface SFUConfig {
  url: string;
  jwt: string;
}

/*
 * This AutoDiscovery class is inspired on the matrix-js-sdk one
 * see: https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/autodiscovery.ts
 */

export default class AutoDiscovery {
  private static logger = getLogger('AutoDiscovery');

  /**
   * This function will try to get the JWT Token from the active focus URL using an OpenID token.
   * The livekit service URL points to the LiveKit JWT Token Service and includes the room name in the alias.
   */
  public static async getSFUConfigWithOpenID(
    openIDToken: IOpenIDCredentials,
    livekitServiceUrl: string,
    livekitAlias: string,
    slotId: string,
    userId: string,
    deviceId: string,
    memberId: string,
  ): Promise<SFUConfig | undefined> {
    try {
      const sfuConfig = await AutoDiscovery.getLiveKitJWT(
        livekitServiceUrl,
        livekitAlias,
        openIDToken,
        slotId,
        userId,
        deviceId,
        memberId,
      );
      return sfuConfig;
    } catch (e) {
      AutoDiscovery.logger.warn(
        `Failed to get JWT from RTC session's active focus URL of ${livekitServiceUrl}.`,
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
    livekitServiceURL: string,
    roomName: string,
    openIDToken: IOpenIDCredentials,
    slotId: string,
    userId: string,
    deviceId: string,
    memberId: string,
  ): Promise<SFUConfig> {
    try {
      const res = await fetch(livekitServiceURL + '/get_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: roomName,
          slot_id: slotId,
          openid_token: openIDToken,
          member: {
            id: memberId,
            claimed_user_id: userId,
            claimed_device_id: deviceId,
          },
        }),
      });
      if (!res.ok) {
        AutoDiscovery.logger.error(
          'SFU Config fetch failed with status code',
          res.status,
        );
        throw new Error(
          'SFU Config fetch failed with status code ' + res.status,
        );
      }
      const sfuConfig = await res.json();
      AutoDiscovery.logger.debug(
        'Get SFU config: \nurl:',
        sfuConfig.url,
        '\njwt',
        sfuConfig.jwt,
      );
      return sfuConfig;
    } catch (e) {
      AutoDiscovery.logger.error('SFU Config fetch failed with exception', e);
      throw new Error('SFU Config fetch failed with exception ' + e);
    }
  }
}
