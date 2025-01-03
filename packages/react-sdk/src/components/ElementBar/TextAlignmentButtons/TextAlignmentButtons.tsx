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

import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextAlignment,
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ToolbarRadio, ToolbarRadioGroup } from '../../common/Toolbar';
import { calculateTextAlignmentUpdates } from './calculateTextAlignmentUpdates';

export function TextAlignmentButtons() {
  const { t } = useTranslation('neoboard');
  const { activeElementIds } = useActiveElements();
  const elements = useElements(activeElementIds);
  const slideInstance = useWhiteboardSlideInstance();

  const handleRadioClick = useCallback(
    (textAlignment: TextAlignment) => {
      const updates = calculateTextAlignmentUpdates(elements, textAlignment);

      if (updates.length > 0) {
        slideInstance.updateElements(updates);
      }
    },
    [elements, slideInstance],
  );

  const elementsArray = Object.values(elements);
  let textAlignment: TextAlignment = 'center';

  for (const element of elementsArray) {
    if (element.type === 'shape' && element.textAlignment !== undefined) {
      textAlignment = element.textAlignment;
      break;
    }
  }

  return (
    <ToolbarRadioGroup
      aria-label={t('elementBar.textAlignment', 'Text Alignment')}
    >
      <ToolbarRadio
        inputProps={{
          'aria-label': t('elementBar.textAlignmentLeft', 'Left'),
          onClick: () => handleRadioClick('left'),
        }}
        icon={<FormatAlignLeftIcon />}
        checkedIcon={<FormatAlignLeftIcon />}
        value={'left'}
        checked={textAlignment === 'left'}
      />
      <ToolbarRadio
        inputProps={{
          'aria-label': t('elementBar.textAlignmentCenter', 'Center'),
          onClick: () => handleRadioClick('center'),
        }}
        icon={<FormatAlignCenterIcon />}
        checkedIcon={<FormatAlignCenterIcon />}
        value={'center'}
        checked={textAlignment === 'center'}
      />
      <ToolbarRadio
        inputProps={{
          'aria-label': t('elementBar.textAlignmentRight', 'Right'),
          onClick: () => handleRadioClick('right'),
        }}
        icon={<FormatAlignRightIcon />}
        checkedIcon={<FormatAlignRightIcon />}
        value={'right'}
        checked={textAlignment === 'right'}
      />
    </ToolbarRadioGroup>
  );
}
