/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

/**
 * Converts an MXC URI to an HTTP URL.
 * {@link https://github.com/matrix-org/matrix-js-sdk/blob/1b7695cdca841672d582168a19bfe77f00207fea/src/content-repo.ts#L36}
 *
 * @todo This should probably live inside the widget toolkit
 * @param mxcUrl - MXC URL {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
 * @param baseUrl - Homeserver base URL
 * @returns HTTP URL or null if the MXC URI cannot be parsed
 */
export function convertMxcToHttpUrl(
  mxcUrl: string,
  baseUrl: string,
): string | null {
  if (mxcUrl.indexOf('mxc://') !== 0) {
    return null;
  }

  const serverAndMediaId = mxcUrl.slice(6);
  const prefix = '/_matrix/media/v3/download/';

  return baseUrl + prefix + serverAndMediaId;
}
