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
  styled,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CommunicationChannelStatistics } from '../../state/communication';
import { PeerConnectionDetail } from './PeerConnectionDetail';

const StyledTable = styled(Table)({
  minWidth: 700,
  borderCollapse: 'collapse',
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: '8px 16px',
  fontSize: '0.875rem',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const HeaderCell = styled(StyledTableCell)(({ theme }) => ({
  fontWeight: 'bold',
  textAlign: 'center',
  backgroundColor: theme.palette.divider,
}));

export function CommunicationChannelStatisticsView({
  communicationChannel,
}: {
  communicationChannel: CommunicationChannelStatistics;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <TableContainer component={Paper}>
      <StyledTable
        aria-label={t(
          'boardBar.developerToolsDialog.communicationChannelStatistics.tableAriaLabel',
          'Communication Channel Statistics',
        )}
      >
        <TableHead>
          <TableRow>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.localSessionId',
                'Local Session Id',
              )}
            </HeaderCell>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.peers',
                'Peers',
              )}
            </HeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <StyledTableCell>
              {communicationChannel.localSessionId}
            </StyledTableCell>
            <StyledTableCell>
              {Object.keys(communicationChannel.peerConnections).length}
            </StyledTableCell>
          </TableRow>
          {Object.entries(communicationChannel.peerConnections).map(
            ([connectionId, peerConnection]) => (
              <TableRow key={connectionId}>
                <StyledTableCell colSpan={2}>
                  <PeerConnectionDetail
                    connectionId={connectionId}
                    peerConnection={peerConnection}
                  />
                </StyledTableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
}
