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
import { useCallback, useState } from 'react';
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
import { useSlideImageDropUpload } from '../ImageUpload';
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

const WhiteboardHost = ({
  elementIds,
  readOnly = false,
  hideCursors = false,
  hideDotGrid = false,
  withOutline = false,
}: {
  elementIds: string[];
  readOnly?: boolean;
  hideCursors?: boolean;
  hideDotGrid?: boolean;
  withOutline?: boolean;
}) => {
  const slideInstance = useWhiteboardSlideInstance();
  const { isShowCollaboratorsCursors, dragSelectStartCoords } =
    useLayoutState();
  const { activeElementIds } = useActiveElements();
  const overrides = useElementOverrides(activeElementIds);

  const { handleUploadDragEnter, uploadDragOverlay } =
    useSlideImageDropUpload();

  const [textToolsEnabled, setTextToolsEnabled] = useState(false);

  const hasElementWithText =
    includesTextShape(Object.values(overrides)) ||
    includesShapeWithText(Object.values(overrides));

  const showTextTools = textToolsEnabled || hasElementWithText;

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
      onDragEnter={handleUploadDragEnter}
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
        topLevelChildren={uploadDragOverlay}
        rounded
        withOutline={withOutline}
        onMouseMove={useCallback(
          (position: Point) => {
            slideInstance.setCursorPosition(position);
            slideInstance.publishCursorPosition(position);
          },
          [slideInstance],
        )}
        onMouseLeave={useCallback(() => {
          slideInstance.setCursorPosition(undefined);
        }, [slideInstance])}
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

export const WhiteboardHostConnected = () => {
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
      elementIds={elementIds}
      readOnly={isLocked || (isViewingPresentation && !isEditEnabled)}
      hideCursors={!isEditEnabled}
      hideDotGrid={isViewingPresentation}
      withOutline={isPresenting}
    />
  );
};
