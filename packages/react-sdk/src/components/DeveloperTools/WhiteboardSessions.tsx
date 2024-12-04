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

import { TableBody, TableHead, TableRow } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SessionState } from '../../state/communication/discovery/sessionManagerImpl';
import {
  StyledDevtoolsHeaderCell,
  StyledDevtoolsTable,
  StyledDevtoolsTableCell,
} from './StyledDevtoolsTable';

export function WhiteboardSessionsTable({
  sessions,
}: {
  sessions: SessionState[] | undefined;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <StyledDevtoolsTable
      ariaLabel={t(
        'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.tableAriaLabel',
        'Whiteboard Sessions',
      )}
    >
      <TableHead>
        <TableRow>
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.userId',
              'User ID',
            )}
          />
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.sessionId',
              'Session ID',
            )}
          />
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.expiresState',
              'State',
            )}
          />
        </TableRow>
      </TableHead>
      <TableBody>
        {sessions && sessions.length > 0 ? (
          sessions
            .sort((a, b) => a.userId.localeCompare(b.userId))
            .map((session) => (
              <TableRow key={session.userId}>
                <StyledDevtoolsTableCell align="left">
                  {session.userId}
                </StyledDevtoolsTableCell>
                <StyledDevtoolsTableCell align="left">
                  {session.sessionId}
                </StyledDevtoolsTableCell>
                <StyledDevtoolsTableCell align="right">
                  {t(
                    'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.expire',
                    'Session will expire in {{expire}}.',
                    { expire: formatTime(session.expiresTs - Date.now()) },
                  )}
                </StyledDevtoolsTableCell>
              </TableRow>
            ))
        ) : (
          <TableRow>
            <StyledDevtoolsTableCell colSpan={4} align="center">
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.noData',
                'No whiteboard sessions available',
              )}
            </StyledDevtoolsTableCell>
          </TableRow>
        )}
      </TableBody>
    </StyledDevtoolsTable>
  );
}

function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
}
