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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { renderHook } from '@testing-library/react-hooks';
import { ComponentType, PropsWithChildren } from 'react';
import { act } from 'react-dom/test-utils';
import { Subject } from 'rxjs';
import {
  WhiteboardTestingContextProvider,
  mockPeerConnectionStatistics,
  mockWhiteboardManager,
} from '../lib/testUtils/documentTestUtils';
import { WhiteboardManager, WhiteboardStatistics } from './types';
import { useActiveWhiteboardMembers } from './useActiveWhiteboardMembers';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('useActiveWhiteboardMembers', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      );
    };
  });

  it('should return no members', () => {
    const statistics = {
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: {},
      },
      document: {
        contentSizeInBytes: 0,
        documentSizeInBytes: 0,
        snapshotOutstanding: false,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
    };

    const activeWhiteboardInstance =
      whiteboardManager.getActiveWhiteboardInstance()!;
    jest
      .spyOn(activeWhiteboardInstance, 'getWhiteboardStatistics')
      .mockReturnValue(statistics);

    const { result } = renderHook(() => useActiveWhiteboardMembers(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual([]);
  });

  it('should return active members', () => {
    const statistics = {
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: {
          'peer-0': mockPeerConnectionStatistics('@user-0', 'connected'),
          'peer-1': mockPeerConnectionStatistics('@user-0', 'failed'),

          'peer-2': mockPeerConnectionStatistics('@user-1', 'failed'),
          'peer-3': mockPeerConnectionStatistics('@user-1', 'connected'),

          'peer-4': mockPeerConnectionStatistics('@user-2', 'failed'),
        },
      },
      document: {
        contentSizeInBytes: 0,
        documentSizeInBytes: 0,
        snapshotOutstanding: false,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
    };

    const activeWhiteboardInstance =
      whiteboardManager.getActiveWhiteboardInstance()!;
    jest
      .spyOn(activeWhiteboardInstance, 'getWhiteboardStatistics')
      .mockReturnValue(statistics);

    const { result } = renderHook(() => useActiveWhiteboardMembers(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual([
      { userId: '@user-0' },
      { userId: '@user-1' },
    ]);
  });

  it('should update the active members if the statistics change', () => {
    let statistics: WhiteboardStatistics = {
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: {
          'peer-0': mockPeerConnectionStatistics('@user-0', 'connected'),
        },
      },
      document: {
        contentSizeInBytes: 0,
        documentSizeInBytes: 0,
        snapshotOutstanding: false,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
    };

    const statisticsSubject = new Subject<WhiteboardStatistics>();

    const activeWhiteboardInstance =
      whiteboardManager.getActiveWhiteboardInstance()!;
    jest
      .spyOn(activeWhiteboardInstance, 'getWhiteboardStatistics')
      .mockImplementation(() => statistics);
    jest
      .spyOn(activeWhiteboardInstance, 'observeWhiteboardStatistics')
      .mockReturnValue(statisticsSubject);

    const { result } = renderHook(() => useActiveWhiteboardMembers(), {
      wrapper: Wrapper,
    });

    act(() => {
      statistics = {
        communicationChannel: {
          localSessionId: 'own',
          peerConnections: {
            'peer-0': mockPeerConnectionStatistics('@user-0', 'connected'),
            'peer-1': mockPeerConnectionStatistics('@user-0', 'failed'),

            'peer-2': mockPeerConnectionStatistics('@user-1', 'failed'),
            'peer-3': mockPeerConnectionStatistics('@user-1', 'connected'),

            'peer-4': mockPeerConnectionStatistics('@user-2', 'failed'),
          },
        },
        document: {
          contentSizeInBytes: 0,
          documentSizeInBytes: 0,
          snapshotOutstanding: false,
          snapshotsReceived: 0,
          snapshotsSend: 0,
        },
      };

      statisticsSubject.next(statistics);
    });

    expect(result.current).toEqual([
      { userId: '@user-0' },
      { userId: '@user-1' },
    ]);
  });
});
