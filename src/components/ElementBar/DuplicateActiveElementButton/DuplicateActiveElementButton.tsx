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
import { first } from 'lodash';
import log from 'loglevel';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  calculateBoundingRectForPoints,
  Element,
  useActiveElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ToolbarButton } from '../../common/Toolbar';
import { gridCellSize, whiteboardWidth } from '../../Whiteboard';

export function duplicate(
  element: Element,
  gridCellSize: number
): Element | undefined {
  const activeElementX = element.position.x;

  const calcX = (width: number) => {
    const newX = activeElementX + width + gridCellSize;
    return Math.min(newX, whiteboardWidth - width);
  };

  if (element.type === 'shape') {
    const width = element.width;

    return {
      ...element,
      position: { x: calcX(width), y: element.position.y },
    };
  }
  if (element.type === 'path') {
    const { width } = calculateBoundingRectForPoints(element.points);

    return {
      ...element,
      position: { x: calcX(width), y: element.position.y },
    };
  }
  return undefined;
}

export function DuplicateActiveElementButton() {
  const { t } = useTranslation();
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElementId = first(activeElementIds);

  const handleDuplicate = useCallback(() => {
    if (activeElementId) {
      const activeElement = slideInstance.getElement(activeElementId);

      if (activeElement) {
        const element = duplicate(activeElement, gridCellSize);

        if (element) {
          slideInstance.addElement(element);
        } else {
          log.warn(
            'Duplication failed. The element is neither a shape element nor a points element.'
          );
        }
      }
    }
  }, [activeElementId, slideInstance]);

  const duplicateActiveElementLabel = t(
    'elementBar.duplicateActiveElement',
    'Duplicate the active element'
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
