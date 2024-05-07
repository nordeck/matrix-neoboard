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

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Element,
  useActiveElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { calculateBoundingRectForElements } from '../../../state/crdt/documents/elements';
import { BoundingRect } from '../../../state/crdt/documents/point';
import { gridCellSize, whiteboardWidth } from '../../Whiteboard';
import { ToolbarButton } from '../../common/Toolbar';

export function duplicate(
  element: Element,
  gridCellSize: number,
  boundingRect: BoundingRect,
): Element {
  const elementPositionX = element.position.x;
  const isDuplicationExceedingWhiteboard =
    boundingRect.offsetX +
      boundingRect.width +
      gridCellSize +
      boundingRect.width >
    whiteboardWidth;

  let x = 0;

  if (isDuplicationExceedingWhiteboard) {
    const boundingRectOffsetX = whiteboardWidth - boundingRect.width;
    const offsetX = boundingRectOffsetX - boundingRect.offsetX;

    x = elementPositionX + offsetX;
  } else {
    const offsetX = elementPositionX - boundingRect.offsetX;

    x = boundingRect.offsetX + boundingRect.width + gridCellSize + offsetX;
  }

  return {
    ...element,
    position: { x, y: element.position.y },
  };
}

export function DuplicateActiveElementButton() {
  const { t } = useTranslation();
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();

  const handleDuplicate = useCallback(() => {
    const sortedActiveElementIds =
      slideInstance.sortElementIds(activeElementIds);
    const elements = Object.values(
      slideInstance.getElements(sortedActiveElementIds),
    );
    const boundingRect = calculateBoundingRectForElements(elements);
    const duplicatedElements = elements.map((element) =>
      duplicate(element, gridCellSize, boundingRect),
    );

    slideInstance.addElements(duplicatedElements);
  }, [activeElementIds, slideInstance]);

  const duplicateActiveElementLabel = t(
    'elementBar.duplicateActiveElement',
    'Duplicate the active element',
    { count: activeElementIds.length },
  );

  return (
    <ToolbarButton
      aria-label={duplicateActiveElementLabel}
      onClick={handleDuplicate}
    >
      <ContentCopyIcon />
    </ToolbarButton>
  );
}
