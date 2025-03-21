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

import { WidgetApiMockProvider } from '@matrix-widget-toolkit/react';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { renderHook, waitFor } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import { fallbackMaxUploadSize, useMaxUploadSize } from './useMaxUploadSize';

describe('useMaxUploadSize', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let consoleSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    consoleSpy = vi.spyOn(console, 'error');

    Wrapper = ({ children }) => (
      <WidgetApiMockProvider value={widgetApi}>
        {children}
      </WidgetApiMockProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
    consoleSpy.mockRestore();
  });

  it('should provide the fallback size before loading', () => {
    const { result } = renderHook(useMaxUploadSize, { wrapper: Wrapper });

    expect(result.current.maxUploadSizeBytes).toBe(fallbackMaxUploadSize);
  });

  it('should provide the value from the API after load', async () => {
    widgetApi.getMediaConfig.mockResolvedValue({
      'm.upload.size': 1337,
    });

    const { result } = renderHook(useMaxUploadSize, { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.maxUploadSizeBytes).toBe(1337);
    });
  });

  it('should provide the fallback value if loading the value fails', async () => {
    consoleSpy.mockImplementation(() => {});
    const apiError = new Error('api error');
    widgetApi.getMediaConfig.mockImplementation(() => {
      throw apiError;
    });

    const { result } = renderHook(useMaxUploadSize, { wrapper: Wrapper });

    expect(console.error).toHaveBeenCalledWith(
      'Error loading max upload size',
      apiError,
    );
    expect(result.current.maxUploadSizeBytes).toBe(fallbackMaxUploadSize);
  });
});
