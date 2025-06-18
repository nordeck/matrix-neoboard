/*
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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { isEqual, uniqWith } from 'lodash';
import { getLogger } from 'loglevel';
import AutoDiscovery, { FOCI_WK_KEY } from './autodiscovery';

export type RTCFocus = {
  type: string;
  [key: string]: unknown;
};

export interface LivekitFocusConfig extends RTCFocus {
  type: 'livekit';
  livekit_service_url: string;
}

export interface LivekitFocus extends LivekitFocusConfig {
  livekit_alias: string;
}

export interface LivekitFocusActive extends RTCFocus {
  type: 'livekit';
  focus_selection: 'oldest_membership';
}

export async function getWellKnownFoci(
  domain: string | undefined,
): Promise<RTCFocus[]> {
  const logger = getLogger('matrixRtcFocus.getWellKnownFoci');

  const foci: RTCFocus[] = [];

  if (domain) {
    logger.debug(
      'Fetching foci from .well-known/matrix/client on domain',
      domain,
    );

    const clientConfig = await AutoDiscovery.getRawClientConfig(domain);
    const wellKnownFoci = clientConfig ? clientConfig[FOCI_WK_KEY] : undefined;

    if (Array.isArray(wellKnownFoci)) {
      foci.push(...wellKnownFoci);
    } else {
      logger.debug('No foci found in .well-known/matrix/client');
    }
  } else {
    logger.debug('No domain provided to fetch .well-known/matrix/client from');
  }

  return foci;
}

// As defined in MSC4143
// https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md#choosing-the-value-of-foci_preferred-for-the-mrtcmember-state-event
export function makeFociPreferred(
  memberFocus: RTCFocus | undefined,
  wellKnownFoci: RTCFocus[],
): RTCFocus[] {
  const logger = getLogger('matrixRtcFocus.makeFociPreferred');

  const preferredFoci: RTCFocus[] = [];

  if (memberFocus) {
    logger.debug('Adding member focus to preferred foci', memberFocus);
    preferredFoci.push(memberFocus);
  } else {
    logger.debug('No member focus provided, skipping');
  }

  if (wellKnownFoci.length > 0) {
    logger.debug('Adding .well-known foci to preferred foci');
    preferredFoci.push(...wellKnownFoci);
  } else {
    logger.debug('No .well-known preferred foci provided, skipping');
  }

  // check for specific livekit backend config underride
  const envFoci = getEnvironment('REACT_APP_RTC_LIVEKIT_SERVICE_URL');
  if (envFoci) {
    logger.debug(
      'Adding environment variable for LiveKit service URL',
      envFoci,
    );
    const livekit_config: LivekitFocusConfig = {
      type: 'livekit',
      livekit_service_url: envFoci,
    };
    preferredFoci.push(livekit_config);
  }

  const foci = uniqWith(preferredFoci, isEqual);

  logger.debug('Final preferred foci:', foci);
  return foci;
}

export const isLivekitFocusConfig = (
  object: RTCFocus,
): object is LivekitFocusConfig =>
  object.type === 'livekit' && 'livekit_service_url' in object;
