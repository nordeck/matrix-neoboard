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

export async function makePreferredLivekitFoci(
  domain: string | undefined,
  livekitAlias: string,
): Promise<LivekitFocus[]> {
  const logger = getLogger('makePreferredLivekitFoci');
  logger.debug('Building preferred foci list for', domain, livekitAlias);

  const preferredFoci: LivekitFocus[] = [];

  if (domain) {
    logger.debug(
      'Trying to fetch .well-known/matrix/client from domain',
      domain,
    );
    const clientConfig = await AutoDiscovery.getRawClientConfig(domain);
    const wellKnownFoci = clientConfig ? clientConfig[FOCI_WK_KEY] : undefined;
    if (Array.isArray(wellKnownFoci)) {
      preferredFoci.push(
        ...wellKnownFoci
          .filter((f) => !!f)
          .filter(isLivekitFocusConfig)
          .map((wellKnownFocus) => {
            logger.log(
              'Adding livekit focus from well known: ',
              wellKnownFocus,
            );
            return { ...wellKnownFocus, livekit_alias: livekitAlias };
          }),
      );
    }
  }

  const envFoci = getEnvironment('REACT_APP_RTC_LIVEKIT_SERVICE_URL');
  if (envFoci) {
    logger.debug('Using environment variable for LiveKit service URL', envFoci);
    const livekit_config: LivekitFocus = {
      type: 'livekit',
      livekit_service_url: envFoci,
      livekit_alias: livekitAlias,
    };
    preferredFoci.push(livekit_config);
  }

  return preferredFoci;
}

const isLivekitFocusConfig = (object: RTCFocus): object is LivekitFocusConfig =>
  object.type === 'livekit' && 'livekit_service_url' in object;

export function areLiveKitFociEqual(a: LivekitFocus, b: LivekitFocus): boolean {
  return (
    isLivekitFocusConfig(a) &&
    isLivekitFocusConfig(a) &&
    a.livekit_service_url === b.livekit_service_url &&
    a.type === b.type
  );
}
