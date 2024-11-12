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

// TODO
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
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockRoomHistoryVisibility } from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { roomHistoryVisibilityApi } from './roomHistoryVisibilityApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('getRoomHistoryVisibility', () => {
  it('should return room history visibility', async () => {
    const event = widgetApi.mockSendStateEvent(mockRoomHistoryVisibility());

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          roomHistoryVisibilityApi.endpoints.getRoomHistoryVisibility.initiate(),
        )
        .unwrap(),
    ).resolves.toEqual({ event });
  });

  it('should handle missing history visibility', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          roomHistoryVisibilityApi.endpoints.getRoomHistoryVisibility.initiate(),
        )
        .unwrap(),
    ).resolves.toEqual({ event: undefined });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          roomHistoryVisibilityApi.endpoints.getRoomHistoryVisibility.initiate(),
        )
        .unwrap(),
    ).rejects.toEqual({
      message: 'Could not load room history visibility: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe room history visibility', async () => {
    const store = createStore({ widgetApi });

    store.dispatch(
      roomHistoryVisibilityApi.endpoints.getRoomHistoryVisibility.initiate(),
    );

    await waitFor(() =>
      expect(
        roomHistoryVisibilityApi.endpoints.getRoomHistoryVisibility.select()(
          store.getState(),
        ).data,
      ).toEqual({ event: undefined }),
    );

    const event = widgetApi.mockSendStateEvent(mockRoomHistoryVisibility());

    await waitFor(() =>
      expect(
        roomHistoryVisibilityApi.endpoints.getRoomHistoryVisibility.select()(
          store.getState(),
        ).data,
      ).toEqual({ event }),
    );
  });
});
