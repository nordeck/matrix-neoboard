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

import {
  MouseEvent,
  PropsWithChildren,
  TouchEvent,
  useCallback,
  useRef,
} from 'react';
import { Point, usePresentationMode } from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { useSvgScaleContext } from '../../SvgScaleContext';

const DRAG_SELECT_SHOW_TIMEOUT_MS = 300;

const UnSelectElementHandlerTouchWrapper: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { isDragSelecting, setDragSelectStartCoords } = useLayoutState();
  const { updateTranslation } = useSvgScaleContext();
  const { state: presentationState } = usePresentationMode();

  const touchTimestamp = useRef(new Date());

  const panEnabled = presentationState.type === 'idle';

  // for setTimeout
  const isDragSelectingRef = useRef(isDragSelecting);
  isDragSelectingRef.current = isDragSelecting;

  const fingerRef = useRef<{ pos?: Point; dt: Date }>({
    pos: void 0,
    dt: new Date(),
  });

  const handleTouchMove = (e: TouchEvent<SVGRectElement>) => {
    const position = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    const finger = fingerRef.current;

    if (!finger.pos) return;

    const deltaX = finger.pos.x - position.x;
    const deltaY = finger.pos.y - position.y;

    if (panEnabled) {
      updateTranslation(-deltaX, -deltaY);
    }

    finger.pos = position;
    touchTimestamp.current = new Date();
  };

  const handleTouchStart = (e: TouchEvent<SVGGElement>) => {
    e.preventDefault();

    const position = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    fingerRef.current.pos = position;
    fingerRef.current.dt = new Date();

    touchTimestamp.current = new Date();
  };

  const handleTouchEnd = () => {
    touchTimestamp.current = new Date();
  };
  const handleTouchCancel = () => {
    touchTimestamp.current = new Date();
  };

  // a default mouse down event may happen from a tap
  const handleMouseDown = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      if (event.button === 0) {
        // if we had touch recently, show drag select layer briefly
        if (new Date().getTime() - touchTimestamp.current.getTime() < 200) {
          setTimeout(() => {
            if (!isDragSelectingRef.current) setDragSelectStartCoords();
          }, DRAG_SELECT_SHOW_TIMEOUT_MS);
        }
      }
    },
    [setDragSelectStartCoords],
  );

  return (
    <g
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchCancel={handleTouchCancel}
    >
      {children}
    </g>
  );
};

export default UnSelectElementHandlerTouchWrapper;
