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
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  styled,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PeerConnectionStatistics } from '../../state/communication';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: '8px 16px',
  fontSize: '0.875rem',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

export function PeerConnectionDetail({
  connectionId,
  peerConnection,
}: {
  connectionId: string;
  peerConnection: PeerConnectionStatistics;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <>
      <Typography variant="subtitle1" gutterBottom>
        {connectionId}
      </Typography>
      <Table size="small">
        <TableBody>
          <TableRow>
            <StyledTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.remoteSessionId',
                'Remote Session Id',
              )}
            </StyledTableCell>
            <StyledTableCell>{peerConnection.remoteSessionId}</StyledTableCell>
          </TableRow>
          <TableRow>
            <StyledTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.userId',
                'User Id',
              )}
            </StyledTableCell>
            <StyledTableCell>{peerConnection.remoteUserId}</StyledTableCell>
          </TableRow>
          <TableRow>
            <StyledTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.impolite',
                'Impolite',
              )}
            </StyledTableCell>
            <StyledTableCell>
              {peerConnection.impolite
                ? t(
                    'boardBar.developerToolsDialog.communicationChannelStatistics.true',
                    'true',
                  )
                : t('peerConnectionDetail.false', 'false')}
            </StyledTableCell>
          </TableRow>
          <TableRow>
            <StyledTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.connectionType',
                'Connection Type',
              )}
            </StyledTableCell>
            <StyledTableCell>
              {peerConnection.localCandidateType} /{' '}
              {peerConnection.remoteCandidateType}
            </StyledTableCell>
          </TableRow>
          <TableRow>
            <StyledTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.dataTransfer',
                'Data Transfer',
              )}
            </StyledTableCell>
            <StyledTableCell>
              <Box>
                <Typography variant="subtitle2">
                  {t(
                    'boardBar.developerToolsDialog.communicationChannelStatistics.bytes',
                    'Bytes',
                  )}
                </Typography>
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.received',
                  'Received',
                )}
                : {peerConnection.bytesReceived},{' '}
                {t('peerConnectionDetail.sent', 'Sent')}:{' '}
                {peerConnection.bytesSent}
                <br />
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.messagesReceived',
                  'Messages Received',
                )}
                : {peerConnection.packetsReceived},{' '}
                {t('peerConnectionDetail.messagesSent', 'Sent')}:{' '}
                {peerConnection.packetsSent}
              </Box>
            </StyledTableCell>
          </TableRow>
          <TableRow>
            <StyledTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.connectionStates',
                'Connection States',
              )}
            </StyledTableCell>
            <StyledTableCell>
              <Box>
                ICE: {peerConnection.iceConnectionState} /{' '}
                {peerConnection.iceGatheringState}
                <br />
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.signaling',
                  'Signaling',
                )}
                : {peerConnection.signalingState}
                <br />
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.connection',
                  'Connection',
                )}
                : {peerConnection.connectionState}
                <br />
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.dataChannel',
                  'Data Channel',
                )}
                : {peerConnection.dataChannelState}
              </Box>
            </StyledTableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}
