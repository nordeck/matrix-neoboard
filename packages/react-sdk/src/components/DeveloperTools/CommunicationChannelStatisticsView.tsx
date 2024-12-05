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
import { CommunicationChannelStatistics } from '../../state/communication';
import { PeerConnectionDetail } from './PeerConnectionDetail';
import {
  StyledDevtoolsHeaderCell,
  StyledDevtoolsTable,
  StyledDevtoolsTableCell,
} from './StyledDevtoolsTable';

export function CommunicationChannelStatisticsView({
  communicationChannel,
}: {
  communicationChannel: CommunicationChannelStatistics;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <StyledDevtoolsTable
      ariaLabel={t(
        'boardBar.developerToolsDialog.communicationChannelStatistics.tableAriaLabel',
        'Communication Channel Statistics',
      )}
    >
      <TableHead>
        <TableRow>
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.localSessionId',
              'Local Session ID',
            )}
          />
          <StyledDevtoolsHeaderCell
            content={t(
              'boardBar.developerToolsDialog.communicationChannelStatistics.peers',
              'Peers',
            )}
          />
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <StyledDevtoolsTableCell align="center" monospace={true}>
            {communicationChannel.localSessionId}
          </StyledDevtoolsTableCell>
          <StyledDevtoolsTableCell align="center">
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
