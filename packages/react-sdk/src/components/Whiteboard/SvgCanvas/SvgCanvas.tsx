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
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  Point,
  useActiveSlideOrFrame,
  useWhiteboardSlideInstance,
} from '../../../state';
import {
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from '../constants';
import {
  calculatePositionAndScaleForElement,
  useSvgScaleContext,
} from '../SvgScaleContext';
import { SvgCanvasContext, SvgCanvasContextType } from './context';
import { useArrowKeys } from './useArrowKeys';
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
  /**
   * If provided overrides svg viewBox calculation based on scale context (scale, translation, ...)
   */
  viewBox?: ViewBox;
  rounded?: boolean;
  additionalChildren?: ReactNode;
  topLevelChildren?: ReactNode;
  withOutline?: boolean;
  preview?: boolean;
  x?: number;
  y?: number;

  onMouseDown?: MouseEventHandler<SVGSVGElement> | undefined;
  onMouseMove?: (position: Point) => void | undefined;
  onMouseLeave?: MouseEventHandler<SVGSVGElement>;
}>;

export type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export const SvgCanvas = function ({
  viewportWidth,
  viewportHeight,
  viewBox,
  children,
  rounded,
  additionalChildren,
  topLevelChildren,
  withOutline,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  preview,
  x,
  y,
}: SvgCanvasProps) {
  const [sizeRef, { width, height }] = useMeasure<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const slideInstance = useWhiteboardSlideInstance();
  const {
    scale,
    translation,
    setContainerDimensions,
    moveToPositionAndScale,
    containerDimensions,
  } = useSvgScaleContext();
  const { activeId: activeSlideOrFrameId } = useActiveSlideOrFrame();
  const { handleWheelZoom, wheelZoomInProgress } = useWheelZoom(svgRef);
  const { handleKeyDown, handleKeyUp } = useArrowKeys();

  useEffect(() => {
    const element = svgRef.current;

    if (infiniteCanvasMode && element && !preview) {
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
  }, [handleWheelZoom, preview]);

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

  useEffect(() => {
    setContainerDimensions({ width, height });
  }, [width, height, setContainerDimensions]);

  // Focus the canvas element when it is mounted
  useEffect(() => {
    if (infiniteCanvasMode && !preview && svgRef.current) {
      svgRef.current.focus();
    }
  }, [svgRef, preview]);

  useEffect(() => {
    // Translate and scale to active frame when active frame changes
    if (infiniteCanvasMode && activeSlideOrFrameId) {
      const frameElement =
        slideInstance.getFrameElements()[activeSlideOrFrameId];
      if (frameElement) {
        const { position, scale } = calculatePositionAndScaleForElement(
          frameElement,
          containerDimensions,
        );
        moveToPositionAndScale(position, scale);
      }
    }
  }, [
    slideInstance,
    activeSlideOrFrameId,
    moveToPositionAndScale,
    containerDimensions,
  ]);

  // Handle auxiliary mouse button clicks (middle/right click)
  // To prevent default paste clipboard action on firefox
  const handleMouseAuxClick: MouseEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    [],
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

  let svgViewBox: string;
  if (viewBox) {
    const { minX, minY, width, height } = viewBox;
    svgViewBox = `${minX} ${minY} ${width} ${height}`;
  } else if (!preview && infiniteCanvasMode) {
    const minX = (whiteboardWidth - width / scale) / 2 - translation.x / scale;
    const minY =
      (whiteboardHeight - height / scale) / 2 - translation.y / scale;
    svgViewBox = `${minX} ${minY} ${width / scale} ${height / scale}`;
  } else {
    svgViewBox = `0 0 ${viewportWidth} ${viewportHeight}`;
  }

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
                  outline: 'none',
                }
          }
          viewBox={svgViewBox}
          onMouseDown={onMouseDown}
          onMouseMove={handleMouseMove}
          onKeyDown={infiniteCanvasMode ? handleKeyDown : undefined}
          onKeyUp={infiniteCanvasMode ? handleKeyUp : undefined}
          tabIndex={infiniteCanvasMode ? -1 : undefined}
          onMouseLeave={onMouseLeave}
          onAuxClick={handleMouseAuxClick}
          x={x}
          y={y}
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
  withOutline,
  preview,
  children,
}) => {
  if (preview) {
    return children;
  }

  return (
    <Box
      ref={sizeRef}
      sx={{
        width: `100%`,
        height: `100%`,
        ...(withOutline && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: 'primary.main',
            borderRadius: 1,
            pointerEvents: 'none',
          },
        }),
      }}
    >
      {children}
    </Box>
  );
};
