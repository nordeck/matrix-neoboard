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

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TabsListProps, TabsListProvider, useTabsList } from '@mui/base';
import { Box } from '@mui/material';
import { forwardRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveSlide,
  useActiveWhiteboardInstanceSlideIds,
} from '../../state';
import { SlideListItem } from './SlideListItem';
import { SlidesDragDropContext } from './SlidesDragDropContext';

export function SlideList() {
  const { t } = useTranslation('neoboard');
  const slideIds = useActiveWhiteboardInstanceSlideIds();
  const { activeSlideId } = useActiveSlide();

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const onDraggingOver = useCallback(() => {
    setIsDraggingOver(true);
  }, [setIsDraggingOver]);

  const slideListTitle = t('slideOverviewBar.slideListTitle', 'Slides');

  return (
    <SlidesDragDropContext onDraggingOver={onDraggingOver}>
      <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
        <SlideListTabs
          isDraggingOver={isDraggingOver}
          aria-label={slideListTitle}
        >
          {slideIds.map((slideId, index) => (
            <SlideListItem
              active={slideId === activeSlideId}
              key={slideId}
              slideId={slideId}
              slideIndex={index}
            />
          ))}
        </SlideListTabs>
      </SortableContext>
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
      <Box flex="1" display="flex" flexDirection="column" {...tabProps} />
    </TabsListProvider>
  );
});
