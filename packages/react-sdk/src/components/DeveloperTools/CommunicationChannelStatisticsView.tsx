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

import { TableBody, TableRow } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { isMatrixRtcMode } from '../../lib';
import { CommunicationChannelStatistics } from '../../state/communication';
import { PeerConnectionDetail } from './PeerConnectionDetail';
import {
  StyledDevtoolsTable,
  StyledDevtoolsTableCell,
} from './StyledDevtoolsTable';

export function CommunicationChannelStatisticsView({
  communicationChannel,
}: {
  communicationChannel: CommunicationChannelStatistics;
}) {
  const { t } = useTranslation('neoboard');
  const matrixRtcMode = isMatrixRtcMode();

  return (
    <StyledDevtoolsTable
      ariaLabel={t(
        'boardBar.developerToolsDialog.communicationChannelStatistics.tableAriaLabel',
        'Communication Channel Statistics',
      )}
    >
      <TableBody>
        <TableRow>
          <StyledDevtoolsTableCell>
            {t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.localSessionId',
              'Local Session Id',
            )}
          </StyledDevtoolsTableCell>
          <StyledDevtoolsTableCell>
            {communicationChannel.localSession?.sessionId}
          </StyledDevtoolsTableCell>
        </TableRow>
        {matrixRtcMode && (
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.localMemberId',
                'Local Member Id',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell>
              {communicationChannel.localSession?.memberId}
            </StyledDevtoolsTableCell>
          </TableRow>
        )}
        {matrixRtcMode && (
          <TableRow>
            <StyledDevtoolsTableCell>
              {t(
                'boardBar.developerToolsDialog.communicationChannelStatistics.localSfuConnectionId',
                'Local SFU Connection Id',
              )}
            </StyledDevtoolsTableCell>
            <StyledDevtoolsTableCell>
              {communicationChannel.localSession?.livekitServiceUrl}
            </StyledDevtoolsTableCell>
          </TableRow>
        )}
        <TableRow>
          <StyledDevtoolsTableCell>
            {t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.peers',
              'Peers',
            )}
          </StyledDevtoolsTableCell>
          <StyledDevtoolsTableCell>
            {Object.keys(communicationChannel.peerConnections).length}
          </StyledDevtoolsTableCell>
        </TableRow>
        {Object.entries(communicationChannel.peerConnections).map(
          ([connectionId, peerConnection]) => (
            <TableRow key={connectionId}>
              <StyledDevtoolsTableCell colSpan={2}>
                <PeerConnectionDetail
                  connectionId={connectionId}
                  peerConnection={peerConnection}
                />
              </StyledDevtoolsTableCell>
            </TableRow>
          ),
        )}
      </TableBody>
    </StyledDevtoolsTable>
  );
}
