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

import { TableBody, TableHead, TableRow } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DocumentSyncStatistics } from '../../state/types';
import {
  StyledDevtoolsHeaderCell,
  StyledDevtoolsTable,
  StyledDevtoolsTableCell,
} from './StyledDevtoolsTable';

export function DocumentSyncStatisticsView({
  document,
}: {
  document: DocumentSyncStatistics | undefined;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <StyledDevtoolsTable
      ariaLabel={t(
        'boardBar.developerToolsDialog.documentSyncStatistics.tableAriaLabel',
        'Document Sync Statistics',
      )}
    >
      <TableHead>
        <TableRow>
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.documentSyncStatistics.binaryJsonSize',
              'Binary / JSON Size (bytes)',
            )}
          />
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.documentSyncStatistics.received',
              'Received',
            )}
          />
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.documentSyncStatistics.send',
              'Send',
            )}
          />
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.documentSyncStatistics.outstanding',
              'Outstanding',
            )}
          />
        </TableRow>
      </TableHead>
      <TableBody>
        {document ? (
          <TableRow>
            <StyledDevtoolsTableCell align="right">
              {document.documentSizeInBytes / document.contentSizeInBytes}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell align="right">
              {document.snapshotsReceived}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell align="right">
              {document.snapshotsSend}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell align="right">
              {document.snapshotOutstanding
                ? t(
                    'boardBar.developerToolsDialog.documentSyncStatistics.true',
                    'true',
                  )
                : t(
                    'boardBar.developerToolsDialog.documentSyncStatistics.false',
                    'false',
                  )}
            </StyledDevtoolsTableCell>
          </TableRow>
        ) : (
          <TableRow>
            <StyledDevtoolsTableCell colSpan={4} align="center">
              {t(
                'boardBar.developerToolsDialog.documentSyncStatistics.noData',
                'No data available',
              )}
            </StyledDevtoolsTableCell>
          </TableRow>
        )}
      </TableBody>
    </StyledDevtoolsTable>
  );
}
