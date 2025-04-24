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

import { Box } from '@mui/material';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  includesShapeWithText,
  includesTextShape,
  type Point,
  useActiveElements,
  useIsWhiteboardLoading,
  usePresentationMode,
  useSlideElementIds,
  useSlideIsLocked,
  useWhiteboardSlideInstance,
} from '../../state';
import { ElementBar } from '../ElementBar';
import { useElementOverrides } from '../ElementOverridesProvider';
import { useLayoutState } from '../Layout';
import {
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from './constants';
import { CursorRenderer } from './CursorRenderer';
import { DraftPicker } from './Draft/DraftPicker';
import { ConnectedElement } from './Element';
import {
  ElementBarWrapper,
  ElementBorder,
  ElementOutline,
  MoveableElement,
  ResizeElement,
  UnSelectElementHandler,
} from './ElementBehaviors';
import { DragSelect } from './ElementBehaviors/Selection/DragSelect';
import { DotGrid } from './Grid';
import { SlideSkeleton } from './SlideSkeleton';
import { SvgCanvas } from './SvgCanvas';
import { useWheelZoom } from './SvgCanvas/useWheelZoom';

const WhiteboardHost = ({
  contentAreaRef,
  elementIds,
  readOnly = false,
  hideCursors = false,
  hideDotGrid = false,
  withOutline = false,
}: {
  contentAreaRef: RefObject<HTMLDivElement> | undefined;
  elementIds: string[];
  readOnly?: boolean;
  hideCursors?: boolean;
  hideDotGrid?: boolean;
  withOutline?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const slideInstance = useWhiteboardSlideInstance();
  const { isShowCollaboratorsCursors, dragSelectStartCoords } =
    useLayoutState();
  const { activeElementIds } = useActiveElements();
  const overrides = useElementOverrides(activeElementIds);

  const [textToolsEnabled, setTextToolsEnabled] = useState(false);

  const hasElementWithText =
    includesTextShape(Object.values(overrides)) ||
    includesShapeWithText(Object.values(overrides));

  const showTextTools = textToolsEnabled || hasElementWithText;

  const { handleWheelZoom } = useWheelZoom(svgRef);

  useEffect(() => {
    const contentArea = contentAreaRef?.current;

    if (contentArea) {
      const wheelHandler = (event: WheelEvent) => {
        handleWheelZoom(event as unknown as React.WheelEvent<SVGSVGElement>);
      };

      // We cannot use the onWheel prop to prevent the event handler from being passive.
      // In non-passive mode, we can prevent the browser's zooming behaviour.
      contentArea.addEventListener('wheel', wheelHandler, {
        passive: false,
      });

      return () => {
        contentArea.removeEventListener('wheel', wheelHandler);
      };
    }
  }, [handleWheelZoom, contentAreaRef]);

  return (
    <Box
      flex={1}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      alignContent="space-around"
      position="relative"
      data-guided-tour-target="canvas"
      {...(infiniteCanvasMode
        ? {
            sx: {
              touchAction: 'none',
            },
            overflow: 'hidden',
            width: '100vw',
          }
        : {})}
    >
      <SvgCanvas
        ref={svgRef}
        viewportHeight={whiteboardHeight}
        viewportWidth={whiteboardWidth}
        additionalChildren={
          dragSelectStartCoords === undefined &&
          !readOnly &&
          activeElementIds.length > 0 && (
            <ElementBarWrapper elementIds={activeElementIds}>
              <ElementBar showTextTools={showTextTools} />
            </ElementBarWrapper>
          )
        }
        rounded
        withOutline={withOutline}
        onMouseMove={useCallback(
          (position: Point) => {
            slideInstance.publishCursorPosition(position);
          },
          [slideInstance],
        )}
      >
        {!hideDotGrid && <DotGrid />}
        {!readOnly && <UnSelectElementHandler />}

        {elementIds.map((e) => (
          <ConnectedElement
            id={e}
            key={e}
            readOnly={readOnly}
            activeElementIds={activeElementIds}
            overrides={overrides}
            setTextToolsEnabled={setTextToolsEnabled}
          />
        ))}

        {!readOnly && <DraftPicker />}

        {!readOnly && activeElementIds.length > 0 && (
          <MoveableElement overrides={overrides}>
            <ElementBorder elementIds={activeElementIds} />
          </MoveableElement>
        )}

        {dragSelectStartCoords && <DragSelect />}

        {!readOnly && activeElementIds.length > 0 && (
          <>
            <ElementOutline elementIds={activeElementIds} />
            {dragSelectStartCoords === undefined && (
              <ResizeElement elementIds={activeElementIds} />
            )}
          </>
        )}

        {isShowCollaboratorsCursors && !hideCursors && <CursorRenderer />}
      </SvgCanvas>
    </Box>
  );
};

export const WhiteboardHostConnected = ({
  contentAreaRef,
}: {
  contentAreaRef?: RefObject<HTMLDivElement>;
}) => {
  const { loading } = useIsWhiteboardLoading();
  const isLocked = useSlideIsLocked();
  const elementIds = useSlideElementIds();
  const { state: presentationState } = usePresentationMode();
  const isPresenting = presentationState.type === 'presenting';
  const isViewingPresentation = presentationState.type === 'presentation';
  const isEditEnabled =
    presentationState.type === 'idle' || presentationState.isEditMode;

  if (loading) {
    return <SlideSkeleton />;
  }

  return (
    <WhiteboardHost
      contentAreaRef={contentAreaRef}
      elementIds={elementIds}
      readOnly={isLocked || (isViewingPresentation && !isEditEnabled)}
      hideCursors={!isEditEnabled}
      hideDotGrid={isViewingPresentation}
      withOutline={isPresenting}
    />
  );
};
