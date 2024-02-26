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

type ArrowHeadLineEndMarkerProps = {
  id: string;
  strokeColor?: string;
};

export function ArrowHeadLineEndMarker({
  id,
  strokeColor,
}: ArrowHeadLineEndMarkerProps) {
  return (
    <marker
      id={id}
      data-testid={id}
      viewBox="0 0 3.5 7"
      refX="3.5"
      refY="3.5"
      markerWidth="3.5"
      markerHeight="7"
      orient="auto"
      fill="none"
    >
      <path d="M0 0 L3.5 3.5 M3.5 3.5 L0 7" stroke={strokeColor} />
    </marker>
  );
}
