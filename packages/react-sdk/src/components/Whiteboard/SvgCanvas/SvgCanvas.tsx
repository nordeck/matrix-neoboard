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
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
import { Point } from '../../../state';
import {
  refreshCanvas,
  selectCanvas,
  updateOuterScale,
} from '../../../store/canvasSlice';
import {
  useAppDispatch,
  useAppSelector,
} from '../../../store/reduxToolkitHooks';
import { SvgCanvasContext, SvgCanvasContextType } from './context';
import { useMeasure } from './useMeasure';
import { calculateScale, calculateSvgCoords } from './utils';

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

export function SvgCanvas({
  viewportHeight,
  viewportWidth,
  children,
  rounded,
  additionalChildren,
  withOutline,
  onMouseDown,
  onMouseMove,
  preview,
}: SvgCanvasProps) {
  const [sizeRef, { width, height }] = useMeasure<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
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
      scale: calculateScale(width, height, viewportWidth, viewportHeight),
      calculateSvgCoords: calculateSvgCoordsFunc,
    }),
    [calculateSvgCoordsFunc, height, viewportHeight, viewportWidth, width],
  );

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(updateOuterScale(value.scale));
  }, [dispatch, value.scale]);

  useEffect(() => {
    if (svgRef.current !== undefined) {
      // Refresh the canvas state once after rendering
      dispatch(refreshCanvas());
    }
  }, [dispatch]);

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
  const { scale, translate } = useAppSelector((state) => selectCanvas(state));

  const boxSx = preview
    ? {}
    : {
        maxWidth: '100%',
      };

  const id = useId();

  useEffect(() => {
    const hanldeWindowResize = () => {
      dispatch(refreshCanvas());
    };

    window.addEventListener('resize', hanldeWindowResize);

    return () => window.removeEventListener('resize', hanldeWindowResize);
  }, [dispatch]);

  return (
    <Box
      id={preview ? id : 'board-wrapper'}
      sx={{
        flex: 1,
        aspectRatio,
        position: 'relative',
        ...boxSx,
      }}
    >
      <Box
        ref={sizeRef}
        sx={
          withOutline
            ? {
                overflow: 'hidden',
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
            : preview
              ? {}
              : {
                  position: 'relative',
                  top: '-2700px',
                  left: '-4800px',
                }
        }
      >
        <SvgCanvasContext.Provider value={value}>
          <Canvas
            ref={svgRef}
            rounded={rounded}
            sx={{
              aspectRatio,
              ...(preview
                ? {}
                : {
                    width: '9600px',
                    height: '5400px',
                  }),
            }}
            viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
            onMouseDown={onMouseDown}
            onMouseMove={handleMouseMove}
            transform-origin="center center"
            transform={
              !preview
                ? `translate(${translate.x}, ${translate.y}) scale(${scale})`
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
}
