/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ElementAttachFrameProvider } from './ElementAttachFrameProvider';
import { useGetElementAttachFrame } from './useGetElementAttachFrame';
import { useSetElementAttachFrame } from './useSetElementAttachFrame';

describe('useGetElementAttachFrame', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => {
      return (
        <ElementAttachFrameProvider>{children}</ElementAttachFrameProvider>
      );
    };
  });

  it('should return no elements attached to frames', () => {
    const { result } = renderHook(() => useGetElementAttachFrame(), {
      wrapper: Wrapper,
    });
    expect(result.current.elementAttachFrame).toEqual({});
    expect(result.current.isFrameHasElementMoved('frame-id-0')).toEqual(false);
    expect(result.current.isElementMovedHasFrame('element-id-0')).toEqual(
      false,
    );
  });

  it('should return elements attached to frames that are set', () => {
    const { result } = renderHook(
      () => {
        return { ...useGetElementAttachFrame(), ...useSetElementAttachFrame() };
      },
      {
        wrapper: Wrapper,
      },
    );

    act(() => {
      result.current.setElementAttachFrame({
        'element-id-0': 'frame-id-0',
        'element-id-1': 'frame-id-0',
        'element-id-2': 'frame-id-1',
      });
    });

    expect(result.current.elementAttachFrame).toEqual({
      'element-id-0': 'frame-id-0',
      'element-id-1': 'frame-id-0',
      'element-id-2': 'frame-id-1',
    });
    expect(result.current.isFrameHasElementMoved('frame-id-0')).toEqual(true);
    expect(result.current.isFrameHasElementMoved('frame-id-1')).toEqual(true);
    expect(result.current.isElementMovedHasFrame('element-id-0')).toEqual(true);
    expect(result.current.isElementMovedHasFrame('element-id-1')).toEqual(true);
    expect(result.current.isElementMovedHasFrame('element-id-2')).toEqual(true);
  });

  it('should return elements attached to frames when attached elements are moved by frame', () => {
    const { result } = renderHook(
      () => {
        return { ...useGetElementAttachFrame(), ...useSetElementAttachFrame() };
      },
      {
        wrapper: Wrapper,
      },
    );

    act(() => {
      result.current.setElementAttachFrame({
        'element-id-0': 'frame-id-0',
        'element-id-1': 'frame-id-0',
        'element-id-2': 'frame-id-1',
      });
      result.current.setAttachedElementsMovedByFrame([
        'element-id-0',
        'element-id-2',
      ]);
    });

    expect(result.current.elementAttachFrame).toEqual({
      'element-id-0': 'frame-id-0',
      'element-id-1': 'frame-id-0',
      'element-id-2': 'frame-id-1',
    });
    expect(result.current.isFrameHasElementMoved('frame-id-0')).toEqual(true);
    expect(result.current.isFrameHasElementMoved('frame-id-1')).toEqual(false);
    expect(result.current.isElementMovedHasFrame('element-id-0')).toEqual(
      false,
    );
    expect(result.current.isElementMovedHasFrame('element-id-1')).toEqual(true);
    expect(result.current.isElementMovedHasFrame('element-id-2')).toEqual(
      false,
    );
  });

  it('should return elements attached to frames when connecting paths are moved', () => {
    const { result } = renderHook(
      () => {
        return { ...useGetElementAttachFrame(), ...useSetElementAttachFrame() };
      },
      {
        wrapper: Wrapper,
      },
    );

    act(() => {
      result.current.setElementAttachFrame({
        'element-id-0': 'frame-id-0',
        'element-id-1': 'frame-id-0',
        'element-id-2': 'frame-id-1',
      });
      result.current.setConnectingPathIds(['element-id-0', 'element-id-2']);
    });

    expect(result.current.elementAttachFrame).toEqual({
      'element-id-0': 'frame-id-0',
      'element-id-1': 'frame-id-0',
      'element-id-2': 'frame-id-1',
    });
    expect(result.current.isFrameHasElementMoved('frame-id-0')).toEqual(true);
    expect(result.current.isFrameHasElementMoved('frame-id-1')).toEqual(false);
    expect(result.current.isElementMovedHasFrame('element-id-0')).toEqual(
      false,
    );
    expect(result.current.isElementMovedHasFrame('element-id-1')).toEqual(true);
    expect(result.current.isElementMovedHasFrame('element-id-2')).toEqual(
      false,
    );
  });
});
