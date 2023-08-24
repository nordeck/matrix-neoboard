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
  PathElement,
  PathKind,
  Point,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import { WithSelectionProps } from '../ElementBehaviors';
import { gridCellSize } from '../constants';
import { DraftMouseHandler } from './DraftMouseHandler';
import { createShapeFromPoints } from './createShape';

export type DraftLineChildProps = {
  kind: PathKind;
  display: ComponentType<PathElement & WithSelectionProps>;
  onlyStartAndEndPoints?: boolean;
};

export const DraftLineChild = ({
  kind,
  onlyStartAndEndPoints = false,
  display: Display,
}: DraftLineChildProps) => {
  const { isShowGrid } = useLayoutState();
  const [cursorPoints, setCursorPoints] = useState<Point[]>();
  const { activeColor: strokeColor } = useLayoutState();
  const slideInstance = useWhiteboardSlideInstance();
  const { setActiveTool } = useLayoutState();

  const handleMouseUp = useCallback(() => {
    if (cursorPoints) {
      if (cursorPoints.length > 1) {
        slideInstance.addElement(
          createShapeFromPoints({
            kind,
            cursorPoints,
            strokeColor,
            gridCellSize: isShowGrid ? gridCellSize : undefined,
            onlyStartAndEndPoints,
          }),
        );
        if (kind !== 'polyline') {
          setActiveTool('select');
        }
      }
      setCursorPoints(undefined);
    }
  }, [
    setActiveTool,
    cursorPoints,
    slideInstance,
    kind,
    strokeColor,
    isShowGrid,
    onlyStartAndEndPoints,
  ]);

  const handleMouseMove = useCallback(
    (point: Point) => {
      if (cursorPoints) {
        setCursorPoints((p) => (p ? [...p, point] : []));
      }
    },
    [cursorPoints],
  );

  const handleMouseDown = useCallback((point: Point) => {
    setCursorPoints([point]);
  }, []);

  const shape = useMemo(
    () =>
      cursorPoints?.length
        ? createShapeFromPoints({
            kind,
            cursorPoints,
            strokeColor,
            gridCellSize: isShowGrid ? gridCellSize : undefined,
            onlyStartAndEndPoints,
          })
        : undefined,
    [cursorPoints, kind, strokeColor, isShowGrid, onlyStartAndEndPoints],
  );

  return (
    <DraftMouseHandler
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {shape && (
        <Display {...shape} elementId="draft" readOnly active={false} />
      )}
    </DraftMouseHandler>
  );
};
