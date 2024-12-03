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

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SessionState } from '../../state/communication/discovery/sessionManagerImpl';

const StyledTable = styled(Table)({
  minWidth: 600,
  borderCollapse: 'collapse',
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: '0.875rem',
  padding: '8px 16px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const HeaderCell = styled(StyledTableCell)(({ theme }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette.divider,
  textAlign: 'center',
}));

export function WhiteboardSessionsTable({
  sessions,
}: {
  sessions: SessionState[] | undefined;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <TableContainer component={Paper}>
      <StyledTable
        aria-label={t(
          'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.tableAriaLabel',
          'Whiteboard Sessions',
        )}
      >
        <TableHead>
          <TableRow>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.userId',
                'User ID',
              )}
            </HeaderCell>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.sessionId',
                'Session ID',
              )}
            </HeaderCell>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.expiresState',
                'State',
              )}
            </HeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions && sessions.length > 0 ? (
            sessions
              .sort((a, b) => a.userId.localeCompare(b.userId))
              .map((session) => (
                <TableRow key={session.userId}>
                  <StyledTableCell align="left">
                    {session.userId}
                  </StyledTableCell>
                  <StyledTableCell align="left">
                    {session.sessionId}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {t(
                      'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.expire',
                      'Session will expire in {{expire}}.',
                      { expire: formatTime(session.expiresTs - Date.now()) },
                    )}
                  </StyledTableCell>
                </TableRow>
              ))
          ) : (
            <TableRow>
              <StyledTableCell colSpan={4} align="center">
                <Typography variant="body2" color="textSecondary">
                  {t(
                    'boardBar.developerToolsDialog.communicationChannelStatistics.whiteboardSessionsTable.noData',
                    'No whiteboard sessions available',
                  )}
                </Typography>
              </StyledTableCell>
            </TableRow>
          )}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
}

function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
}
