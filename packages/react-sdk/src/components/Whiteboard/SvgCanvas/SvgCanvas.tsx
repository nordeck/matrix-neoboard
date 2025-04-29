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
import React, {
  KeyboardEvent,
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { Point, usePresentationMode } from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import {
  gridCellSize,
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from '../constants';
import { useSvgScaleContext } from '../SvgScaleContext';
import { SvgCanvasContext, SvgCanvasContextType } from './context';
import { useMeasure } from './useMeasure';
import { useWheelZoom } from './useWheelZoom';
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
  topLevelChildren?: ReactNode;
  withOutline?: boolean;
  preview?: boolean;

  onMouseDown?: MouseEventHandler<SVGSVGElement> | undefined;
  onMouseMove?: (position: Point) => void | undefined;
  onMouseLeave?: MouseEventHandler<SVGSVGElement>;
}>;

export const SvgCanvas = function ({
  viewportHeight,
  viewportWidth,
  children,
  rounded,
  additionalChildren,
  topLevelChildren,
  withOutline,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  preview,
}: SvgCanvasProps) {
  const [sizeRef, { width, height }] = useMeasure<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const { scale, translation, setContainerDimensions, updateTranslation } =
    useSvgScaleContext();
  const { state } = usePresentationMode();
  const isPresenting = state.type === 'presenting';
  // Do avoid issues where users are interacting the content editable part
  // of the whiteboard canvas, we should disable our listeners.
  const { activeScopes } = useHotkeysContext();
  const enableShortcuts =
    activeScopes.includes(HOTKEY_SCOPE_WHITEBOARD) && !isPresenting;
  const pressedKeys = useRef<Set<string>>(new Set());

  const { handleWheelZoom, wheelZoomInProgress } = useWheelZoom(svgRef);

  useEffect(() => {
    const element = svgRef.current;

    if (infiniteCanvasMode && element) {
      const wheelHandler = (event: WheelEvent) => {
        handleWheelZoom(event as unknown as React.WheelEvent<SVGSVGElement>);
      };

      // We cannot use the onWheel prop to prevent the event handler from being passive.
      // In non-passive mode, we can prevent the browser's zooming behaviour.
      element.addEventListener('wheel', wheelHandler, {
        passive: false,
      });

      return () => {
        element.removeEventListener('wheel', wheelHandler);
      };
    }
  }, [handleWheelZoom]);

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

  // Focus the canvas element when it is mounted
  useEffect(() => {
    if (infiniteCanvasMode && !preview && svgRef.current) {
      svgRef.current.focus();
    }
  }, [svgRef, preview]);

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
      if (enableShortcuts && isArrowKey(e.key)) {
        if (!pressedKeys.current.has(e.key)) {
          pressedKeys.current.add(e.key);
        }
        e.preventDefault();
        applyKeyboardNavigation();
      }
    },
    [applyKeyboardNavigation, enableShortcuts],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent<SVGSVGElement>) => {
      if (enableShortcuts && isArrowKey(e.key)) {
        pressedKeys.current.delete(e.key);
        e.preventDefault();
        applyKeyboardNavigation();
      }
    },
    [applyKeyboardNavigation, enableShortcuts],
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

  const CanvasWrapper: React.FC<CanvasWrapperProps> = infiniteCanvasMode
    ? InfiniteCanvasWrapper
    : FiniteCanvasWrapper;

  return (
    <SvgCanvasContext.Provider value={value}>
      <CanvasWrapper
        aspectRatio={aspectRatio}
        sizeRef={sizeRef}
        withOutline={withOutline}
        width={width}
        height={height}
        preview={preview}
      >
        <Canvas
          ref={svgRef}
          rounded={rounded}
          sx={
            !infiniteCanvasMode
              ? {
                  aspectRatio,
                }
              : {
                  ...(withOutline
                    ? {
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                      }
                    : {
                        outline: 'none',
                      }),
                  ...(preview
                    ? {}
                    : {
                        width: `${whiteboardWidth}px`,
                        height: `${whiteboardHeight}px`,
                      }),
                }
          }
          viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
          onMouseDown={onMouseDown}
          onMouseMove={handleMouseMove}
          onKeyDown={infiniteCanvasMode ? handleKeyDown : undefined}
          onKeyUp={infiniteCanvasMode ? handleKeyUp : undefined}
          tabIndex={infiniteCanvasMode ? -1 : undefined}
          onMouseLeave={onMouseLeave}
          transform-origin={infiniteCanvasMode ? 'center center' : undefined}
          transform={
            infiniteCanvasMode
              ? !preview
                ? `translate(${translation.x}, ${translation.y}) scale(${scale})`
                : ''
              : undefined
          }
        >
          {children}
        </Canvas>
        {!wheelZoomInProgress && additionalChildren}
      </CanvasWrapper>
      {topLevelChildren}
    </SvgCanvasContext.Provider>
  );
};

type CanvasWrapperProps = PropsWithChildren<{
  aspectRatio: string;
  sizeRef: Ref<unknown>;
  withOutline?: boolean;
  width: number;
  height: number;
  preview?: boolean;
}>;

const FiniteCanvasWrapper: React.FC<CanvasWrapperProps> = ({
  aspectRatio,
  sizeRef,
  withOutline,
  width,
  height,
  children,
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        maxWidth: '100%',
        aspectRatio,
        position: 'relative',
      }}
    >
      <Box
        ref={sizeRef}
        sx={
          withOutline
            ? {
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width,
                  height,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  pointerEvents: 'none',
                },
              }
            : {}
        }
      >
        {children}
      </Box>
    </Box>
  );
};

const InfiniteCanvasWrapper: React.FC<CanvasWrapperProps> = ({
  sizeRef,
  preview,
  children,
}) => {
  const boxSx = preview
    ? {}
    : {
        maxWidth: '100%',
      };

  const innerBoxSx = preview
    ? {}
    : {
        position: 'relative',
        top: `-${whiteboardHeight / 2}px`,
        left: `-${whiteboardWidth / 2}px`,
      };

  return (
    <Box
      ref={sizeRef}
      sx={{
        flex: 1,
        height: '100%',
        position: 'relative',
        ...boxSx,
        ...(infiniteCanvasMode ? {} : { overflow: 'hidden' }),
      }}
    >
      <Box sx={innerBoxSx}>{children}</Box>
    </Box>
  );
};

function isArrowKey(key: string): boolean {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
}
