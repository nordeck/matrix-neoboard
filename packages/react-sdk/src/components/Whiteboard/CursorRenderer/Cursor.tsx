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

import { styled, useTheme } from '@mui/material';
import { CSSProperties, forwardRef } from 'react';
import { getUserColor } from '../../../lib';
import { Point } from '../../../state';
import { useMeasure } from '../SvgCanvas/useMeasure';
import { useSvgScaleContext } from '../SvgScaleContext';

const CursorRoot = styled('g')(({ theme }) => ({
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
    easing: 'linear',
  }),
}));

export const Cursor = forwardRef<
  SVGGElement,
  {
    userId: string;
    displayName: string;
    position: Point;
    style?: CSSProperties;
  }
>(({ userId, position, displayName, style }, ref) => {
  const color = getUserColor(userId);
  const { scale } = useSvgScaleContext();
  const transform = `translate(${position.x}px, ${position.y}px) scale(${
    1 / scale
  })`;

  return (
    <CursorRoot style={{ transform }}>
      <g ref={ref} style={style}>
        <Triangle color={color} />

        <Bubble color={color} displayName={displayName} />
      </g>
    </CursorRoot>
  );
});

function Triangle({ color }: { color: string }) {
  return <path fill={color} d="M0 0L12.1642 3.97791L2.40385 11.8554L0 0Z" />;
}

function Bubble({
  color,
  displayName,
}: {
  color: string;
  displayName: string;
}) {
  const theme = useTheme();
  const [ref, size] = useMeasure<SVGTextElement>();
  const offsetX = 10;
  const offsetY = 10;
  const textPaddingX = 12;
  const textPaddingY = 6;
  const baseLine = 3.5;

  return (
    <>
      <rect
        x={offsetX}
        y={offsetY}
        width={textPaddingX + size.width + textPaddingX}
        height={textPaddingY + size.height + textPaddingY}
        rx={theme.shape.borderRadius}
        stroke={color}
        strokeWidth={2}
        fill={theme.palette.common.white}
      />
      <text
        x={offsetX + textPaddingX}
        y={offsetY + textPaddingY + size.height - baseLine}
        fontSize={14}
        fontWeight={500}
        fill={theme.palette.getContrastText(theme.palette.common.white)}
        ref={ref}
      >
        {displayName}
      </text>
    </>
  );
}
