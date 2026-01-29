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

import { TabsListProps, TabsListProvider, useTabsList } from '@mui/base';
import { Box } from '@mui/material';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { isInfiniteCanvasMode } from '../../lib';
import {
  useActiveSlideOrFrame,
  useActiveWhiteboardInstanceSlideOrFrameIds,
} from '../../state';
import { SlideListItem } from './SlideListItem';
import { SlidesDragDropContext } from './SlidesDragDropContext';
import { StrictModeDroppable } from './StrictModeDroppable';

export function SlideList() {
  const { t } = useTranslation('neoboard');
  const slideOrFrameIds = useActiveWhiteboardInstanceSlideOrFrameIds();
  const { activeId } = useActiveSlideOrFrame();

  const slideListTitle = isInfiniteCanvasMode()
    ? t('slideOverviewBar.frameListTitle', 'Frames')
    : t('slideOverviewBar.slideListTitle', 'Slides');

  return (
    <SlidesDragDropContext>
      <StrictModeDroppable droppableId="slide-overview" type="slide">
        {(provided, snapshot) => (
          <SlideListTabs
            aria-label={slideListTitle}
            isDraggingOver={snapshot.isDraggingOver}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {slideOrFrameIds.map((slideOrFrameId, index) => (
              <SlideListItem
                active={slideOrFrameId === activeId}
                key={slideOrFrameId}
                slideOrFrameId={slideOrFrameId}
                slideIndex={index}
              />
            ))}

            {provided.placeholder}
          </SlideListTabs>
        )}
      </StrictModeDroppable>
    </SlidesDragDropContext>
  );
}

const SlideListTabs = forwardRef<
  Element,
  TabsListProps & { isDraggingOver: boolean }
>((props, ref) => {
  const { isDraggingOver, ...restProps } = props;

  const { getRootProps, contextValue } = useTabsList({ rootRef: ref });

  const tabProps = getRootProps(restProps);

  if (isDraggingOver) {
    // If the tabs are being moved, disable the keydown handler that would
    // otherwise select the tab instead.
    tabProps.onKeyDown = undefined;
  }

  return (
    <TabsListProvider value={contextValue}>
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        {...tabProps}
        sx={{
          '& button[data-rbd-placeholder-context-id="1"]': {
            // Remove all styling from the placeholder, as it would otherwise look
            // like a button.
            visibility: 'hidden',
          },
        }}
      />
    </TabsListProvider>
  );
});
