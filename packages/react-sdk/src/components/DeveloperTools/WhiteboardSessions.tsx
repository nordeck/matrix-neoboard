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
import { SessionStatistics } from '../../state/communication';
import {
  StyledDevtoolsHeaderCell,
  StyledDevtoolsTable,
  StyledDevtoolsTableCell,
} from './StyledDevtoolsTable';

export function WhiteboardSessionsTable({
  sessions,
}: {
  sessions: [string, SessionStatistics][];
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
        </TableRow>
      </TableHead>
      <TableBody>
        {sessions.length > 0 ? (
          sessions
            .sort(([_sessionIdA, a], [_sessionIdB, b]) =>
              a.userId.localeCompare(b.userId),
            )
            .map(([sessionId, session]) => (
              <TableRow key={sessionId}>
                <StyledDevtoolsTableCell align="left">
                  {session.userId}
                </StyledDevtoolsTableCell>
                <StyledDevtoolsTableCell align="left">
                  {sessionId}
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
