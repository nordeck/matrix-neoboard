/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { DocumentSyncStatistics } from '../../state/types';

export function DocumentSyncStatisticsView({
  document,
}: {
  document: DocumentSyncStatistics | undefined;
}) {
  return (
    <table style={{ width: '100%' }}>
      <caption>Documents</caption>
      <thead>
        <tr>
          <th />
          <th colSpan={3}>Snapshots</th>
        </tr>
        <tr>
          <th>Binary / JSON Size (bytes)</th>
          <th>Received</th>
          <th>Send</th>
          <th>Outstanding</th>
        </tr>
      </thead>

      <tbody>
        {document && (
          <tr>
            <td align="right">
              {document.documentSizeInBytes} / {document.contentSizeInBytes}
            </td>
            <td align="right">{document.snapshotsReceived}</td>
            <td align="right">{document.snapshotsSend}</td>
            <td align="right">
              {document.snapshotOutstanding ? 'true' : 'false'}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
