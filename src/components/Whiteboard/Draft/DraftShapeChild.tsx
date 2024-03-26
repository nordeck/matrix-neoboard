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

import { ComponentType, useCallback, useMemo, useState } from 'react';
import {
  Point,
  ShapeElement,
  ShapeKind,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import { WithExtendedSelectionProps } from '../ElementBehaviors';
import { gridCellSize } from '../constants';
import { DraftMouseHandler } from './DraftMouseHandler';
import { createShape } from './createShape';

export type DraftShapeChildProps = {
  kind: ShapeKind;
  display: ComponentType<ShapeElement & WithExtendedSelectionProps>;
  sameLength?: boolean;
  fixedColor?: string;
};

export const DraftShapeChild = ({
  kind,
  display: Display,
  sameLength,
  fixedColor,
}: DraftShapeChildProps) => {
  const { isShowGrid } = useLayoutState();
  const [startCoords, setStartCoords] = useState<Point>();
  const [endCoords, setEndCoords] = useState<Point>();
  const { activeColor } = useLayoutState();
  const slideInstance = useWhiteboardSlideInstance();
  const { setActiveTool } = useLayoutState();

  const handleMouseUp = useCallback(() => {
    if (startCoords && endCoords) {
      slideInstance.addElement(
        createShape({
          kind,
          startCoords,
          endCoords,
          fillColor: fixedColor || activeColor,
          gridCellSize: isShowGrid ? gridCellSize : undefined,
          sameLength,
        }),
      );
      setActiveTool('select');
    }
    setStartCoords(undefined);
    setEndCoords(undefined);
  }, [
    setActiveTool,
    startCoords,
    endCoords,
    slideInstance,
    kind,
    activeColor,
    isShowGrid,
    sameLength,
    fixedColor,
  ]);

  const handleMouseMove = useCallback(
    (point: Point) => {
      if (startCoords) {
        setEndCoords(point);
      }
    },
    [startCoords],
  );

  const handleMouseDown = useCallback((point: Point) => {
    setStartCoords(point);
  }, []);

  const shape = useMemo(
    () =>
      startCoords && endCoords
        ? createShape({
            kind,
            startCoords,
            endCoords,
            fillColor: fixedColor || activeColor,
            gridCellSize: isShowGrid ? gridCellSize : undefined,
            sameLength,
          })
        : undefined,
    [
      endCoords,
      activeColor,
      isShowGrid,
      kind,
      sameLength,
      startCoords,
      fixedColor,
    ],
  );

  return (
    <DraftMouseHandler
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {shape && (
        <Display
          {...shape}
          elementId="draft"
          readOnly
          active={false}
          elementIds={[]}
          overrides={{}}
        />
      )}
    </DraftMouseHandler>
  );
};
