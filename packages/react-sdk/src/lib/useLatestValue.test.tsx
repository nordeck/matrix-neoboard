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

import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { Subject } from 'rxjs';
import { useLatestValue } from './useLatestValue';

describe('useLatestValue', () => {
  it('should return the initial value', () => {
    const valueProvider = jest.fn().mockReturnValue(1);

    const { result } = renderHook(() => useLatestValue(valueProvider));

    expect(result.current).toBe(1);
  });

  it('should memoize the return value on rerender', () => {
    const value = { a: 1 };
    const valueProvider = jest
      .fn()
      .mockReturnValueOnce(value)
      .mockReturnValueOnce({ a: 1 });

    const { result, rerender } = renderHook(() =>
      useLatestValue(valueProvider),
    );

    rerender();

    expect(result.current).toBe(value);
  });

  it('should return new value after rerender', () => {
    const value = { a: 1 };
    const valueProvider = jest
      .fn()
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(value);

    const { result, rerender } = renderHook(() =>
      useLatestValue(valueProvider),
    );

    expect(result.current).toBe(1);

    rerender();

    expect(result.current).toBe(value);
  });

  it('should return new value after the observable emits', () => {
    const value = { a: 1 };
    const valueProvider = jest
      .fn()
      .mockReturnValueOnce(1)
      .mockReturnValue(value);

    const renderSubject = new Subject<void>();

    const { result } = renderHook(() =>
      useLatestValue(valueProvider, renderSubject),
    );

    expect(result.current).toBe(1);

    act(() => renderSubject.next());

    expect(result.current).toBe(value);
  });

  it('should only rerender when a new value is available after the observable emits', () => {
    const value = { a: 1 };
    const valueProvider = jest
      .fn()
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)
      .mockReturnValue(value);

    const renderSubject = new Subject<void>();

    let renderCounter = 0;
    const { result } = renderHook(() => {
      renderCounter++;
      return useLatestValue(valueProvider, renderSubject);
    });

    expect(result.current).toBe(1);

    act(() => renderSubject.next());

    act(() => renderSubject.next());

    expect(result.current).toBe(value);

    expect(renderCounter).toBe(2);
  });
});
