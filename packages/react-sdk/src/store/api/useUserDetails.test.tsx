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
import { renderHook, waitFor } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockRoomMember } from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { useUserDetails } from './useUserDetails';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('useUserDetails', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    const store = createStore({ widgetApi });

    widgetApi.mockSendStateEvent(mockRoomMember());

    Wrapper = ({ children }) => {
      return <Provider store={store}>{children}</Provider>;
    };
  });

  it('should generate display name', async () => {
    const { result } = renderHook(useUserDetails, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.getUserDisplayName('@user-alice:example.com')).toBe(
        'Alice',
      );
    });
    expect(
      result.current.getUserDisplayName('@other-user-id:example.com'),
    ).toBe('@other-user-id:example.com');
  });

  it('should generate avatar url', async () => {
    const { result } = renderHook(useUserDetails, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.getUserAvatarUrl('@user-alice:example.com')).toBe(
        'mxc://alice.png',
      );
    });
    expect(
      result.current.getUserAvatarUrl('@other-user-id:example.com'),
    ).toBeUndefined();
  });
});
