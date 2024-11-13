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
import * as state from '../../state';
import {
  useGetRoomEncryptionQuery,
  useGetRoomHistoryVisibilityQuery,
  useGetRoomMembersQuery,
} from '../../store';
import { FallbackSnapshotProvider } from './FallbackSnapshotProvider';

const mockRoomMembers = {
  entities: {
    alice: { content: { membership: 'join' }, origin_server_ts: 1000 },
    bob: { content: { membership: 'invite' }, origin_server_ts: 2000 },
  },
};

const mockEncryptedRoomState = {
  event: {
    content: {
      algorithm: 'm.megolm.v1.aes-sha2',
    },
  },
};

const mockRoomHistoryVisibilityJoined = {
  event: {
    content: {
      history_visibility: 'joined',
    },
  },
};

const mockRoomHistoryVisibilityInvited = {
  event: {
    content: {
      history_visibility: 'invited',
    },
  },
};

const mockRoomHistoryVisibilityShared = {
  event: {
    content: {
      history_visibility: 'shared',
    },
  },
};

const mockWhiteboardInstance = {
  persistIfOlderThan: vi.fn(),
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
    (useGetRoomMembersQuery as Mock).mockReturnValue({ data: mockRoomMembers });

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
      data: mockRoomHistoryVisibilityShared,
    });

    render(<Wrapper />);

    expect(mockWhiteboardInstance.persistIfOlderThan).not.toHaveBeenCalled();
  });

  it('should persist snapshot if the room is encrypted', () => {
    (useGetRoomEncryptionQuery as Mock).mockReturnValue({
      data: mockEncryptedRoomState,
    });
    (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
      data: mockRoomHistoryVisibilityShared,
    });

    render(<Wrapper />);

    expect(mockWhiteboardInstance.persistIfOlderThan).toHaveBeenCalled();
  });

  it.each([
    ['unencrypted', undefined],
    ['encrypted', mockEncryptedRoomState],
  ])(
    'should persist snapshot if the last event is a join and history visibility is invited (%s room)',
    (_, encryptionState) => {
      (useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: mockRoomHistoryVisibilityInvited,
      });

      render(<Wrapper />);

      expect(mockWhiteboardInstance.persistIfOlderThan).toHaveBeenCalledWith(
        2000,
      );
    },
  );

  it.each([
    ['unencrypted', undefined],
    ['encrypted', mockEncryptedRoomState],
  ])(
    'should persist snapshot if the last event is a join and history visibility is joined (%s room)',
    (_, encryptionState) => {
      (useGetRoomEncryptionQuery as Mock).mockReturnValue({
        data: encryptionState,
      });
      (useGetRoomHistoryVisibilityQuery as Mock).mockReturnValue({
        data: mockRoomHistoryVisibilityJoined,
      });

      render(<Wrapper />);

      expect(mockWhiteboardInstance.persistIfOlderThan).toHaveBeenCalledWith(
        1000,
      );
    },
  );
});
