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
import {
  useAppDispatch,
  useAppSelector,
} from '../../../store/reduxToolkitHooks';
import { selectShapeSizes, setShapeSize } from '../../../store/shapeSizesSlice';
import { useLayoutState } from '../../Layout';
import { WithExtendedSelectionProps } from '../ElementBehaviors';
import { useSvgScaleContext } from '../SvgScaleContext';
import { defaultTextSize, gridCellSize, stickySize } from '../constants';
import { DraftEvent, DraftMouseHandler } from './DraftMouseHandler';
import { calculateShapeCoords } from './calculateShapeCoords';
import { createShape } from './createShape';

export type DraftShapeChildProps = {
  kind: ShapeKind;
  display: ComponentType<ShapeElement & WithExtendedSelectionProps>;
  sameLength?: boolean;
  /**
   * If set, force use of this color.
   * Otherwise use the last active color.
   */
  fixedColor?: string;
  rounded?: boolean;
  stickyNote?: boolean;
};

export const DraftShapeChild = ({
  kind,
  display: Display,
  sameLength,
  fixedColor,
  rounded,
  stickyNote,
}: DraftShapeChildProps) => {
  const { isShowGrid } = useLayoutState();
  const [startCoords, setStartCoords] = useState<Point>();
  const [endCoords, setEndCoords] = useState<Point>();
  const { activeTextColor, activeShapeTextColor, activeShapeColor } =
    useLayoutState();
  const slideInstance = useWhiteboardSlideInstance();
  const { setActiveTool, activeFontFamily } = useLayoutState();
  const shapeSizes = useAppSelector((state) => selectShapeSizes(state));
  const dispatch = useAppDispatch();
  const { scale } = useSvgScaleContext();

  const fillColor = activeShapeColor;
  // Text fields are identified by a transparent background color
  const textColor =
    fixedColor === 'transparent' ? activeTextColor : activeShapeTextColor;

  const updateShapeSize = useCallback(() => {
    if (startCoords === undefined || endCoords === undefined) {
      // Nothing to do if there are not start or end coordinates
      return;
    }

    const shapeSize = {
      width: Math.abs(startCoords.x - endCoords.x),
      height: Math.abs(startCoords.y - endCoords.y),
    };
    dispatch(setShapeSize({ kind, size: shapeSize }));
  }, [dispatch, endCoords, kind, startCoords]);

  const handleClick = useCallback(
    (point: Point) => {
      // Sticky notes have a fixed size, so we need to override the shape size defaults
      const overrideShapeSize = stickyNote ? stickySize : undefined;
      const { startCoords, endCoords } = calculateShapeCoords(
        kind,
        point,
        shapeSizes,
        overrideShapeSize,
        scale,
      );

      slideInstance.addElement(
        createShape({
          kind,
          startCoords,
          endCoords,
          fillColor: fixedColor || fillColor,
          gridCellSize: isShowGrid ? gridCellSize : undefined,
          sameLength,
          rounded,
          textColor,
          stickyNote,
          textFontFamily: activeFontFamily,
          textSize: defaultTextSize,
        }),
      );
      setActiveTool('select');
    },
    [
      kind,
      shapeSizes,
      scale,
      slideInstance,
      fixedColor,
      fillColor,
      isShowGrid,
      sameLength,
      rounded,
      textColor,
      stickyNote,
      activeFontFamily,
      setActiveTool,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (startCoords && endCoords) {
      slideInstance.addElement(
        createShape({
          kind,
          startCoords,
          endCoords,
          fillColor: fixedColor || fillColor,
          gridCellSize: isShowGrid ? gridCellSize : undefined,
          sameLength,
          rounded,
          textColor,
          textFontFamily: activeFontFamily,
          textSize: defaultTextSize,
        }),
      );
      setActiveTool('select');
    }
    updateShapeSize();
    setStartCoords(undefined);
    setEndCoords(undefined);
  }, [
    setActiveTool,
    startCoords,
    endCoords,
    slideInstance,
    kind,
    isShowGrid,
    sameLength,
    fixedColor,
    updateShapeSize,
    rounded,
    textColor,
    fillColor,
    activeFontFamily,
  ]);

  const handleMouseMove = useCallback(
    ({ point }: DraftEvent) => {
      if (startCoords) {
        setEndCoords(point);
      }
    },
    [startCoords],
  );

  const handleMouseDown = useCallback(({ point }: DraftEvent) => {
    setStartCoords(point);
  }, []);

  const shape = useMemo(
    () =>
      startCoords && endCoords
        ? createShape({
            kind,
            startCoords,
            endCoords,
            fillColor: fixedColor || fillColor,
            gridCellSize: isShowGrid ? gridCellSize : undefined,
            sameLength,
            rounded,
            textColor,
            stickyNote,
            textFontFamily: activeFontFamily,
          })
        : undefined,
    [
      endCoords,
      isShowGrid,
      kind,
      sameLength,
      startCoords,
      fixedColor,
      rounded,
      textColor,
      stickyNote,
      fillColor,
      activeFontFamily,
    ],
  );

  return (
    <DraftMouseHandler
      onClick={handleClick}
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
