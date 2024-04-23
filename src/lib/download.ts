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
 * Trigger a download.
 *
 * @param url - URL to download
 * @param filename - Filename of the download
 * @param [target] - Target of the download, defaults to '_blank'
 *
 * @returns void
 */
export function download(url: string, filename: string, target: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);

  if (target) {
    link.setAttribute('target', target);
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}
