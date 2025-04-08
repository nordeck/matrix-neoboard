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

import { Box, styled } from '@mui/material';
import {
  forwardRef,
  KeyboardEvent,
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Point } from '../../../state';
import {
  gridCellSize,
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from '../constants';
import { useSvgScaleContext } from '../SvgScaleContext';
import { SvgCanvasContext, SvgCanvasContextType } from './context';
import { useMeasure } from './useMeasure';
import { calculateSvgCoords } from './utils';

const Canvas = styled('svg', {
  shouldForwardProp: (p) => p !== 'rounded' && p !== 'sx',
})<{ rounded?: boolean }>(({ theme, rounded }) => ({
  background: theme.palette.common.white,
  margin: 'auto',
  display: 'block',
  borderRadius: rounded ? theme.shape.borderRadius : undefined,
}));

export type SvgCanvasProps = PropsWithChildren<{
  viewportWidth: number;
  viewportHeight: number;
  rounded?: boolean;
  additionalChildren?: ReactNode;
  withOutline?: boolean;
  preview?: boolean;

  onMouseDown?: MouseEventHandler<SVGSVGElement> | undefined;
  onMouseMove?: (position: Point) => void | undefined;
}>;

export const SvgCanvas = forwardRef(function SvgCanvas(
  {
    viewportHeight,
    viewportWidth,
    children,
    rounded,
    additionalChildren,
    withOutline,
    onMouseDown,
    onMouseMove,
    preview,
  }: SvgCanvasProps,
  forwardedRef,
) {
  const [sizeRef, { width, height }] = useMeasure<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const { scale, translation, setContainerDimensions, updateTranslation } =
    useSvgScaleContext();
  const pressedKeys = useRef<Set<string>>(new Set());

  // by that svgRef can be used here, while also forwarding the ref
  useImperativeHandle(forwardedRef, () => svgRef.current);

  const calculateSvgCoordsFunc = useCallback(
    (position: Point) => {
      if (!svgRef.current) {
        throw new Error('SvgCanvas not mounted');
      }

      return calculateSvgCoords(position, svgRef.current);
    },
    [svgRef],
  );

  const value = useMemo<SvgCanvasContextType>(
    () => ({
      width,
      height,
      viewportWidth,
      viewportHeight,
      calculateSvgCoords: calculateSvgCoordsFunc,
    }),
    [calculateSvgCoordsFunc, height, viewportHeight, viewportWidth, width],
  );

  useLayoutEffect(() => {
    setContainerDimensions({ width, height });
  }, [width, height, setContainerDimensions]);

  const handleCanvasClick = useCallback(() => {
    if (svgRef.current) {
      svgRef.current.focus();
    }
  }, []);

  const getKeyboardOffset = useCallback(() => {
    const scrollStep = gridCellSize * scale;
    let dx = 0;
    let dy = 0;

    if (pressedKeys.current.has('ArrowUp')) dy += scrollStep;
    if (pressedKeys.current.has('ArrowDown')) dy -= scrollStep;
    if (pressedKeys.current.has('ArrowLeft')) dx += scrollStep;
    if (pressedKeys.current.has('ArrowRight')) dx -= scrollStep;

    return { dx, dy };
  }, [scale]);

  // Apply keyboard navigation offset if needed
  const applyKeyboardNavigation = useCallback(() => {
    const { dx, dy } = getKeyboardOffset();
    if (dx !== 0 || dy !== 0) {
      updateTranslation(dx, dy);
    }
  }, [getKeyboardOffset, updateTranslation]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<SVGSVGElement>) => {
      const isArrowKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.key);

      if (isArrowKey) {
        if (!pressedKeys.current.has(e.key)) {
          pressedKeys.current.add(e.key);
        }
        e.preventDefault();
        applyKeyboardNavigation();
      }
    },
    [applyKeyboardNavigation],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent<SVGSVGElement>) => {
      const isArrowKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.key);

      if (isArrowKey) {
        pressedKeys.current.delete(e.key);
        e.preventDefault();
        applyKeyboardNavigation();
      }
    },
    [applyKeyboardNavigation],
  );

  const handleMouseMove: MouseEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      const position = calculateSvgCoordsFunc({
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
      });
      if (onMouseMove) {
        onMouseMove(position);
      }
    },
    [calculateSvgCoordsFunc, onMouseMove],
  );

  const aspectRatio = `${viewportWidth} / ${viewportHeight}`;

  const boxSx = preview
    ? {}
    : {
        maxWidth: '100%',
      };

  const idProp = preview ? {} : { id: 'board-wrapper' };

  const innerBoxSx = preview
    ? {}
    : {
        position: 'relative',
        top: `-${whiteboardHeight / 2}px`,
        left: `-${whiteboardWidth / 2}px`,
      };

  const outlineSx = withOutline
    ? {
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'primary.main',
        borderRadius: 1,
      }
    : {};

  return (
    <Box
      {...idProp}
      ref={sizeRef}
      sx={{
        flex: 1,
        aspectRatio,
        position: 'relative',
        ...boxSx,
        ...(infiniteCanvasMode ? {} : { overflow: 'hidden' }),
      }}
    >
      <Box sx={innerBoxSx}>
        <SvgCanvasContext.Provider value={value}>
          <Canvas
            ref={svgRef}
            rounded={rounded}
            sx={{
              aspectRatio,
              ...outlineSx,
              ...(preview
                ? {}
                : {
                    width: `${whiteboardWidth}px`,
                    height: `${whiteboardHeight}px`,
                  }),
            }}
            viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
            onClick={handleCanvasClick}
            onMouseDown={onMouseDown}
            onMouseMove={handleMouseMove}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            tabIndex={0}
            transform-origin="center center"
            transform={
              !preview
                ? `translate(${translation.x}, ${translation.y}) scale(${scale})`
                : ''
            }
          >
            {children}
          </Canvas>
          {additionalChildren}
        </SvgCanvasContext.Provider>
      </Box>
    </Box>
  );
});
