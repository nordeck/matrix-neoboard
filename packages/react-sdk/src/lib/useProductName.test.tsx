/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductName } from './useProductName';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('useProductName', () => {
  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );
  });

  it('should return NeoBoard if no product name is configured', () => {
    const { result } = renderHook(() => useProductName());

    expect(result.current).toBe('NeoBoard');
  });

  it('should read the product name from REACT_APP_PRODUCT_NAME', () => {
    renderHook(() => useProductName());

    expect(getEnvironment).toHaveBeenCalledWith(
      'REACT_APP_PRODUCT_NAME',
      'NeoBoard',
    );
  });

  it('should return the configured product name', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_PRODUCT_NAME' ? 'Whiteboard' : defaultValue,
    );

    const { result } = renderHook(() => useProductName());

    expect(result.current).toBe('Whiteboard');
  });

  it('should keep the product name stable across rerenders', () => {
    vi.mocked(getEnvironment).mockClear();

    const { result, rerender } = renderHook(() => useProductName());
    rerender();

    expect(result.current).toBe('NeoBoard');
    expect(getEnvironment).toHaveBeenCalledTimes(1);
  });
});
