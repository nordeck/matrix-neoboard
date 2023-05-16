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

import { CommunicationChannelStatistics } from '../../state/communication';

export function CommunicationChannelStatisticsView({
  communicationChannel,
}: {
  communicationChannel: CommunicationChannelStatistics;
}) {
  return (
    <table style={{ width: '100%' }}>
      <caption>Communication (WebRTC)</caption>

      <thead>
        <tr>
          <th>Local Session Id</th>
          <th>Peers</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>{communicationChannel.localSessionId}</td>
          <td>{Object.keys(communicationChannel.peerConnections).length}</td>
        </tr>
        {Object.entries(communicationChannel.peerConnections).map(
          ([connectionId, peerConnection]) => (
            <tr key={connectionId}>
              <td colSpan={2}>
                <table>
                  <caption>{connectionId}</caption>

                  <tbody>
                    <tr>
                      <td>Remote Session Id</td>
                      <td>{peerConnection.remoteSessionId}</td>
                    </tr>
                    <tr>
                      <td>User Id</td>
                      <td>{peerConnection.remoteUserId}</td>
                    </tr>
                    <tr>
                      <td>Impolite</td>
                      <td>{peerConnection.impolite ? 'true' : 'false'}</td>
                    </tr>
                    <tr>
                      <td>Connection Type</td>
                      <td>
                        {peerConnection.localCandidateType}
                        {' / '}
                        {peerConnection.remoteCandidateType}
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={2}>
                        <table style={{ width: '100%' }}>
                          <tbody>
                            <tr>
                              <td>Bytes Received</td>
                              <td align="right">
                                {peerConnection.bytesReceived}
                              </td>
                              <td>Bytes Send</td>
                              <td align="right">{peerConnection.bytesSent}</td>
                            </tr>
                            <tr>
                              <td>Messages Received</td>
                              <td align="right">
                                {peerConnection.packetsReceived}
                              </td>
                              <td>Messages Send</td>
                              <td align="right">
                                {peerConnection.packetsSent}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={2}>
                        <table style={{ width: '100%' }}>
                          <tbody>
                            <tr>
                              <td>ICE Gathering</td>
                              <td>{peerConnection.iceGatheringState}</td>
                              <td>ICE Connection</td>
                              <td>{peerConnection.iceConnectionState}</td>
                            </tr>
                            <tr>
                              <td>Signaling</td>
                              <td>{peerConnection.signalingState}</td>
                              <td>Connection</td>
                              <td>{peerConnection.connectionState}</td>
                            </tr>
                            <tr>
                              <td>Data channel</td>
                              <td>{peerConnection.dataChannelState}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}
