/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

const lineMarkerSize = 20;

type ArrowHeadLineMarkerProps = {
  id: string;
  strokeColor?: string;
  mirrored?: boolean;
};

export function ArrowHeadLineMarker({
  id,
  strokeColor,
  mirrored = false,
}: ArrowHeadLineMarkerProps) {
  const halfSize = lineMarkerSize / 2;
  return (
    <marker
      id={id}
      data-testid={id}
      viewBox={`0 -1 ${lineMarkerSize} ${lineMarkerSize}`}
      refX={halfSize}
      refY={halfSize / 2}
      markerWidth={halfSize}
      markerHeight={halfSize}
      orient="auto"
      fill="none"
    >
      <path
        transform={
          mirrored ? `scale(-1,1) translate(-${lineMarkerSize},0)` : undefined
        }
        d={`M${halfSize / 2} 0 L${halfSize} ${halfSize / 2} L${halfSize / 2} ${halfSize}`}
        stroke={strokeColor}
        strokeWidth={2}
      />
    </marker>
  );
}
