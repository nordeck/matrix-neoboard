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
import { renderHook } from '@testing-library/react';
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
import { App } from '../App';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../lib/testUtils';
import {
  mockRoomEncryption,
  mockRoomHistoryVisibility,
} from '../lib/testUtils/matrixTestUtils';
import * as state from '../state';
import * as storeApi from '../store/api';
import {
  cancelableSnapshotTimer,
  usePersistOnJoinOrInvite,
} from './usePersistOnJoinOrInvite';

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

const mockLatestDocumentSnapshot = {
  event: { origin_server_ts: 100 },
};

const mockRecentDocumentSnapshot = {
  event: { origin_server_ts: 3000 },
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
  isLoading: () => false,
  getDocumentId: () => '$document-0',
};

let widgetApi: MockedWidgetApi;
afterEach(() => widgetApi.stop());
beforeEach(() => (widgetApi = mockWidgetApi()));

describe('usePersistOnJoinOrInvite', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<state.WhiteboardManager>;

  beforeAll(() => {
    vi.mock('./usePersistOnJoinOrInvite', async () => {
      const usePersistOnJoinOrInvite = await vi.importActual<
        typeof import('./usePersistOnJoinOrInvite')
      >('./usePersistOnJoinOrInvite');
      return {
        ...usePersistOnJoinOrInvite,
        cancelableSnapshotTimer: vi.fn(() => ({ cancel: vi.fn() })),
      };
    });
    vi.mock('../store/api', async () => {
      const storeApi =
        await vi.importActual<typeof import('../store/api')>('../store/api');
      return {
        ...storeApi,
        useGetDocumentSnapshotQuery: vi.fn(),
        useGetRoomMembersQuery: vi.fn(),
        useGetRoomEncryptionQuery: vi.fn(),
        useGetRoomHistoryVisibilityQuery: vi.fn(),
      };
    });
    vi.mock('../state', async () => {
      const state =
        await vi.importActual<typeof import('../state')>('../state');
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
    (storeApi.useGetRoomMembersQuery as Mock).mockReturnValue({
      data: mockRoomMembersOtherUser,
    });
    (storeApi.useGetDocumentSnapshotQuery as Mock).mockReturnValue({
      data: mockLatestDocumentSnapshot,
    });

    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = () => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <App />
      </WhiteboardTestingContextProvider>
    );
  });

  it('should not persist snapshot if room is unencrypted and history is shared', () => {
    (storeApi.useGetRoomEncryptionQuery as Mock).mockReturnValue({
      data: undefined,
    });
    (storeApi.useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
      data: { event: mockRoomHistoryVisibilityShared },
    });

    const { result: _result } = renderHook(usePersistOnJoinOrInvite, {
      wrapper: Wrapper,
    });

    expect(mockWhiteboardInstance.persist).not.toHaveBeenCalled();
  });

  it('should not persist snapshot if the snapshot is more recent than the last membership event', () => {
    (storeApi.useGetRoomEncryptionQuery as Mock).mockReturnValue({
      data: { event: mockRoomEncryption() },
    });
    (storeApi.useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
      data: { event: mockRoomHistoryVisibilityInvited },
    });
    (storeApi.useGetDocumentSnapshotQuery as Mock).mockReturnValue({
      data: mockRecentDocumentSnapshot,
    });

    const { result: _result } = renderHook(usePersistOnJoinOrInvite, {
      wrapper: Wrapper,
    });

    expect(mockWhiteboardInstance.persist).not.toHaveBeenCalled();
  });

  it('should persist snapshot if the room is encrypted', () => {
    (storeApi.useGetRoomEncryptionQuery as Mock).mockReturnValue({
      data: { event: mockRoomEncryption() },
    });
    (storeApi.useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
      data: { event: mockRoomHistoryVisibilityShared },
    });

    const { result: _result } = renderHook(usePersistOnJoinOrInvite, {
      wrapper: Wrapper,
    });

    expect(cancelableSnapshotTimer).toHaveBeenCalled();
  });

  it.each([
    ['unencrypted', undefined],
    ['encrypted', { event: mockRoomEncryption() }],
  ])(
    'should persist snapshot if the last event is a join and history visibility is invited (%s room)',
    (_, encryptionState) => {
      (storeApi.useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (storeApi.useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: { event: mockRoomHistoryVisibilityInvited },
      });

      const { result: _result } = renderHook(usePersistOnJoinOrInvite, {
        wrapper: Wrapper,
      });

      expect(cancelableSnapshotTimer).toHaveBeenCalled();
    },
  );

  it.each([
    ['unencrypted', undefined],
    ['encrypted', { event: mockRoomEncryption() }],
  ])(
    'should persist snapshot if the last event is a join and history visibility is joined (%s room)',
    (_, encryptionState) => {
      (storeApi.useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (storeApi.useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: { event: mockRoomHistoryVisibilityJoined },
      });

      const { result: _result } = renderHook(usePersistOnJoinOrInvite, {
        wrapper: Wrapper,
      });

      expect(cancelableSnapshotTimer).toHaveBeenCalled();
    },
  );

  it.each([
    ['unencrypted', undefined],
    ['encrypted', { event: mockRoomEncryption() }],
  ])(
    'should persist snapshot immediatly if the last event is an invite and inviter is the current user (%s room)',
    (_, encryptionState) => {
      (storeApi.useGetRoomMembersQuery as Mock).mockReturnValue({
        data: mockRoomMembersOwnUser,
      });
      (storeApi.useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (storeApi.useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: { event: mockRoomHistoryVisibilityInvited },
      });

      const { result: _result } = renderHook(usePersistOnJoinOrInvite, {
        wrapper: Wrapper,
      });

      expect(mockWhiteboardInstance.persist).toHaveBeenCalled();
    },
  );
});
