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

import { Box, Table, TableBody, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PeerConnectionStatistics } from '../../state/communication';
import { matrixRtcMode } from '../Whiteboard';
import { StyledDevtoolsTableCell } from './StyledDevtoolsTable';

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
        {`${peerConnection.remoteUserId}: ${connectionId}`}
      </Typography>
      <Table size="small">
        <TableBody>
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.remoteSessionId',
                'Remote Session ID',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell monospace={true}>
              {peerConnection.remoteSessionId}
            </StyledDevtoolsTableCell>
          </TableRow>
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.userId',
                'User ID',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell monospace={true}>
              {peerConnection.remoteUserId}
            </StyledDevtoolsTableCell>
          </TableRow>
          {!matrixRtcMode && (
            <TableRow>
              <StyledDevtoolsTableCell>
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.impolite',
                  'Impolite',
                )}
              </StyledDevtoolsTableCell>
              <StyledDevtoolsTableCell>
                {peerConnection.impolite
                  ? t(
                      'boardBar.developerToolsDialog.communicationChannelStatistics.true',
                      'true',
                    )
                  : t('peerConnectionDetail.false', 'false')}
              </StyledDevtoolsTableCell>
            </TableRow>
          )}
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.connectionType',
                'Connection Type',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell>
              {peerConnection.localCandidateType} /{' '}
              {peerConnection.remoteCandidateType}
            </StyledDevtoolsTableCell>
          </TableRow>
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.dataTransfer',
                'Data Transfer',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell>
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
            </StyledDevtoolsTableCell>
          </TableRow>
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.connectionStates',
                'Connection States',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell>
              <Box>
                {!matrixRtcMode && (
                  <>
                    ICE: {peerConnection.iceConnectionState} /{' '}
                    {peerConnection.iceGatheringState}
                    <br />
                    {t(
                      'boardBar.developerToolsDialog.communicationChannelStatistics.signaling',
                      'Signaling',
                    )}
                    : {peerConnection.signalingState}
                    <br />
                  </>
                )}
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatistics.connection',
                  'Connection',
                )}
                : {peerConnection.connectionState}
                <br />
                {!matrixRtcMode && (
                  <>
                    {t(
                      'boardBar.developerToolsDialog.communicationChannelStatistics.dataChannel',
                      'Data Channel',
                    )}
                    : {peerConnection.dataChannelState}
                  </>
                )}
              </Box>
            </StyledDevtoolsTableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}
