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

import { renderHook } from '@testing-library/react';
import { useId } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockLineElement } from '../../../lib/testUtils/documentTestUtils';
import { useEndMarker } from './useEndMarker';

vi.mock('react', async (importActual) => ({
  ...(await importActual()),
  useId: vi.fn(),
}));

describe('useEndMarker', () => {
  let reactUseId = 1;

  beforeAll(() => {
    vi.mocked(useId).mockImplementation(() => `id-${reactUseId++}`);
  });

  beforeEach(() => {
    reactUseId = 1;
  });

  it('should return an empty result if there is no end marker', () => {
    const element = mockLineElement();
    const { result } = renderHook(() => useEndMarker(element));
    expect(result.current).toEqual({
      endMarkerId: undefined,
      endMarker: null,
    });
  });

  it('should return an end marker', () => {
    const element = mockLineElement({ endMarker: 'arrow-head-line' });
    const { result } = renderHook(() => useEndMarker(element));
    expect(result.current.endMarkerId).toEqual('end-marker-id-1');
    expect(result.current.endMarker?.props.id).toBe('end-marker-id-1');
  });
});
