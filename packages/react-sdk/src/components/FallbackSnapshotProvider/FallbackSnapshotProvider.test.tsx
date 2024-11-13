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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  Mocked,
  vi,
} from 'vitest';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import {
  mockRoomEncryption,
  mockRoomHistoryVisibility,
} from '../../lib/testUtils/matrixTestUtils';
import * as state from '../../state';
import {
  useGetRoomEncryptionQuery,
  useGetRoomHistoryVisibilityQuery,
  useGetRoomMembersQuery,
} from '../../store';
import { FallbackSnapshotProvider } from './FallbackSnapshotProvider';

const mockRoomMembersOtherUser = {
  entities: {
    alice: {
      content: { membership: 'join' },
      origin_server_ts: 1000,
      sender: '@other-id',
    },
    bob: {
      content: { membership: 'invite' },
      origin_server_ts: 2000,
      sender: '@other-id',
    },
  },
};

const mockRoomMembersOwnUser = {
  entities: {
    alice: {
      content: { membership: 'join' },
      origin_server_ts: 1000,
      sender: '@user-id',
    },
    bob: {
      content: { membership: 'invite' },
      origin_server_ts: 2000,
      sender: '@user-id',
    },
  },
};

const mockRoomHistoryVisibilityInvited = mockRoomHistoryVisibility({
  content: { history_visibility: 'invited' },
});
const mockRoomHistoryVisibilityJoined = mockRoomHistoryVisibility({
  content: { history_visibility: 'joined' },
});
const mockRoomHistoryVisibilityShared = mockRoomHistoryVisibility();

const mockWhiteboardInstance = {
  persist: vi.fn(),
};

let widgetApi: MockedWidgetApi;
afterEach(() => widgetApi.stop());
beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<FallbackSnapshotProvider />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<state.WhiteboardManager>;

  beforeAll(() => {
    vi.mock('../../store/api', () => {
      return {
        useGetRoomMembersQuery: vi.fn(),
        useGetRoomEncryptionQuery: vi.fn(),
        useGetRoomHistoryVisibilityQuery: vi.fn(),
      };
    });
    vi.mock('../../state', async () => {
      const state =
        await vi.importActual<typeof import('../../state')>('../../state');
      return {
        ...state,
        useActiveWhiteboardInstance: vi.fn(),
      };
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    ({ whiteboardManager } = mockWhiteboardManager());

    (state.useActiveWhiteboardInstance as Mock).mockReturnValue(
      mockWhiteboardInstance,
    );
    (useGetRoomMembersQuery as Mock).mockReturnValue({
      data: mockRoomMembersOtherUser,
    });

    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <FallbackSnapshotProvider>{children}</FallbackSnapshotProvider>
        </WhiteboardTestingContextProvider>
      );
    };
  });

  it('should not persist snapshot if room is unencrypted and history is shared', () => {
    (useGetRoomEncryptionQuery as Mock).mockReturnValue({ data: undefined });
    (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
      data: { event: mockRoomHistoryVisibilityShared },
    });

    render(<Wrapper />);

    expect(mockWhiteboardInstance.persist).not.toHaveBeenCalled();
  });

  it('should persist snapshot if the room is encrypted', () => {
    (useGetRoomEncryptionQuery as Mock).mockReturnValue({
      data: { event: mockRoomEncryption() },
    });
    (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
      data: { event: mockRoomHistoryVisibilityShared },
    });

    render(<Wrapper />);

    expect(mockWhiteboardInstance.persist).toHaveBeenCalled();
  });

  it.each([
    ['unencrypted', undefined],
    ['encrypted', { event: mockRoomEncryption() }],
  ])(
    'should persist snapshot if the last event is a join and history visibility is invited (%s room)',
    (_, encryptionState) => {
      (useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: { event: mockRoomHistoryVisibilityInvited },
      });

      render(<Wrapper />);

      expect(mockWhiteboardInstance.persist).toHaveBeenCalledWith({
        timestamp: 2000,
        immediate: false,
      });
    },
  );

  it.each([
    ['unencrypted', undefined],
    ['encrypted', { event: mockRoomEncryption() }],
  ])(
    'should persist snapshot if the last event is a join and history visibility is joined (%s room)',
    (_, encryptionState) => {
      (useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: { event: mockRoomHistoryVisibilityJoined },
      });

      render(<Wrapper />);

      expect(mockWhiteboardInstance.persist).toHaveBeenCalledWith({
        timestamp: 1000,
        immediate: false,
      });
    },
  );

  it.each([
    ['unencrypted', undefined],
    ['encrypted', { event: mockRoomEncryption() }],
  ])(
    'should persist snapshot immediatly if the last event is an invite and inviter is the current user',
    (_, encryptionState) => {
      (useGetRoomMembersQuery as Mock).mockReturnValue({
        data: mockRoomMembersOwnUser,
      });
      (useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: { event: mockRoomHistoryVisibilityInvited },
      });

      render(<Wrapper />);

      expect(mockWhiteboardInstance.persist).toHaveBeenCalledWith({
        timestamp: 2000,
        immediate: true,
      });
    },
  );
});
