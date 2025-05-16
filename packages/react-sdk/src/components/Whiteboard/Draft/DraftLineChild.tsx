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

import { last } from 'lodash';
import { ComponentType, useCallback, useMemo, useState } from 'react';
import {
  PathElement,
  PathKind,
  Point,
  useWhiteboardSlideInstance,
} from '../../../state';
import { LineMarker } from '../../../state/crdt/documents/elements';
import { useConnectionPoint } from '../../ConnectionPointProvider';
import { useLayoutState } from '../../Layout';
import {
  findConnectData,
  WithExtendedSelectionProps,
} from '../ElementBehaviors';
import { useSvgCanvasContext } from '../SvgCanvas';
import { gridCellSize } from '../constants';
import { DraftEvent, DraftMouseHandler } from './DraftMouseHandler';
import { createShapeFromPoints } from './createShape';

export type DraftLineChildProps = {
  kind: PathKind;
  display: ComponentType<PathElement & WithExtendedSelectionProps>;
  onlyStartAndEndPoints?: boolean;
  startMarker?: LineMarker;
  endMarker?: LineMarker;
};

export const DraftLineChild = ({
  kind,
  onlyStartAndEndPoints = false,
  display: Display,
  startMarker,
  endMarker,
}: DraftLineChildProps) => {
  const { isShowGrid } = useLayoutState();
  const [cursorPoints, setCursorPoints] = useState<Point[]>();
  const [connectedElementStart, setConnectedElementStart] = useState<string>();
  const [connectedElementEnd, setConnectedElementEnd] = useState<string>();
  const { activeColor: strokeColor } = useLayoutState();
  const slideInstance = useWhiteboardSlideInstance();
  const { setActiveTool } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { setConnectElementIds } = useConnectionPoint();

  const handleMouseUp = useCallback(() => {
    if (cursorPoints) {
      if (cursorPoints.length > 1) {
        slideInstance.addPathElementAndConnect(
          createShapeFromPoints({
            kind,
            cursorPoints,
            strokeColor,
            gridCellSize: isShowGrid ? gridCellSize : undefined,
            onlyStartAndEndPoints,
            startMarker,
            endMarker,
            connectedElementStart,
            connectedElementEnd,
          }),
        );
        if (kind !== 'polyline') {
          setActiveTool('select');
        }
      }
      setCursorPoints(undefined);
      setConnectedElementStart(undefined);
      setConnectedElementEnd(undefined);
      setConnectElementIds([]);
    }
  }, [
    setActiveTool,
    cursorPoints,
    slideInstance,
    kind,
    strokeColor,
    isShowGrid,
    onlyStartAndEndPoints,
    startMarker,
    endMarker,
    connectedElementStart,
    connectedElementEnd,
    setConnectElementIds,
  ]);

  const handleMouseMove = useCallback(
    ({ point, clientX, clientY }: DraftEvent) => {
      const { connectElementIds, connectPoint } = findConnectData(
        clientX,
        clientY,
        1,
      );

      const connectElementId = last(connectElementIds);
      setConnectedElementEnd(
        connectElementId && connectPoint ? connectElementId : undefined,
      );
      setConnectElementIds(connectElementIds);

      if (cursorPoints) {
        const newPoint = connectPoint
          ? calculateSvgCoords(connectPoint)
          : point;
        setCursorPoints((p) => (p ? [...p, newPoint] : []));
      }
    },
    [cursorPoints, setConnectElementIds, calculateSvgCoords],
  );

  const handleMouseDown = useCallback(
    ({ point, clientX, clientY }: DraftEvent) => {
      const { connectElementIds, connectPoint } = findConnectData(
        clientX,
        clientY,
        1,
      );

      const connectElementId = last(connectElementIds);
      setConnectedElementStart(
        connectElementId && connectPoint ? connectElementId : undefined,
      );

      const newPoint = connectPoint ? calculateSvgCoords(connectPoint) : point;
      setCursorPoints([newPoint]);
    },
    [calculateSvgCoords],
  );

  const shape = useMemo(
    () =>
      cursorPoints?.length
        ? createShapeFromPoints({
            kind,
            cursorPoints,
            strokeColor,
            gridCellSize: isShowGrid ? gridCellSize : undefined,
            onlyStartAndEndPoints,
            startMarker,
            endMarker,
            connectedElementStart,
            connectedElementEnd,
          })
        : undefined,
    [
      cursorPoints,
      kind,
      strokeColor,
      isShowGrid,
      onlyStartAndEndPoints,
      startMarker,
      endMarker,
      connectedElementStart,
      connectedElementEnd,
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
        <Display {...shape} elementId="draft" readOnly active={false} />
      )}
    </DraftMouseHandler>
  );
};
