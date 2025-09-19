/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockRoomMember } from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { roomMemberApi } from './roomMemberApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('getRoomMembers', () => {
  it('should return room members', async () => {
    widgetApi.mockSendStateEvent(mockRoomMember());
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-bob:example.com',
        content: {
          displayname: 'Bob',
          avatar_url: undefined,
        },
      }),
    );

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(roomMemberApi.endpoints.getRoomMembers.initiate())
        .unwrap(),
    ).resolves.toEqual({
      ids: ['@user-alice:example.com', '@user-bob:example.com'],
      entities: {
        '@user-alice:example.com': expect.objectContaining({
          state_key: '@user-alice:example.com',
          content: {
            avatar_url: 'mxc://alice.png',
            membership: 'join',
            displayname: 'Alice',
          },
        }),
        '@user-bob:example.com': expect.objectContaining({
          state_key: '@user-bob:example.com',
          content: {
            membership: 'join',
            displayname: 'Bob',
            avatar_url: undefined,
          },
        }),
      },
    });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(roomMemberApi.endpoints.getRoomMembers.initiate())
        .unwrap(),
    ).rejects.toEqual({
      message: 'Could not load room members: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe room members', async () => {
    widgetApi.mockSendStateEvent(mockRoomMember());

    const store = createStore({ widgetApi });

    store.dispatch(roomMemberApi.endpoints.getRoomMembers.initiate());

    await waitFor(() =>
      expect(
        roomMemberApi.endpoints.getRoomMembers.select()(store.getState()).data,
      ).toEqual(expect.objectContaining({ ids: ['@user-alice:example.com'] })),
    );

    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-bob:example.com',
        content: {
          displayname: 'Bob',
        },
      }),
    );

    await waitFor(() =>
      expect(
        roomMemberApi.endpoints.getRoomMembers.select()(store.getState()).data,
      ).toEqual(
        expect.objectContaining({
          ids: ['@user-alice:example.com', '@user-bob:example.com'],
        }),
      ),
    );
  });
});
