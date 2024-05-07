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

import FormatBoldIcon from '@mui/icons-material/FormatBold';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ToolbarToggle } from '../../common/Toolbar';
import { calculateTextBoldUpdates } from './calculateTextBoldUpdates';

export function TextBoldButton() {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);
  const { t } = useTranslation();

  const handleClick = useCallback(
    (textBold: boolean) => {
      const updates = calculateTextBoldUpdates(activeElements, textBold);

      if (updates.length > 0) {
        slideInstance.updateElements(updates);
      }
    },
    [activeElements, slideInstance],
  );

  if (elements.every((element) => element.type !== 'shape')) {
    return null;
  }

  let textBold = false;

  for (const element of elements) {
    if (element.type === 'shape' && element.textBold !== undefined) {
      textBold = element.textBold;
      break;
    }
  }

  return (
    <ToolbarToggle
      checked={textBold}
      checkedIcon={<FormatBoldIcon />}
      icon={<FormatBoldIcon />}
      inputProps={{ 'aria-label': t('elementBar.textBold', 'Bold') }}
      onClick={() => handleClick(!textBold)}
    />
  );
}
