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

import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ToolbarToggle } from '../../common/Toolbar';
import { calculateTextItalicUpdates } from './calculateTextItalicUpdates';

export function TextItalicButton() {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);
  const { t } = useTranslation();

  const handleClick = useCallback(
    (textItalic: boolean) => {
      const updates = calculateTextItalicUpdates(activeElements, textItalic);

      if (updates.length > 0) {
        slideInstance.updateElements(updates);
      }
    },
    [activeElements, slideInstance],
  );

  if (elements.every((element) => element.type !== 'shape')) {
    return null;
  }

  let textItalic = false;

  for (const element of elements) {
    if (element.type === 'shape' && element.textItalic !== undefined) {
      textItalic = element.textItalic;
      break;
    }
  }

  return (
    <ToolbarToggle
      checked={textItalic}
      checkedIcon={<FormatItalicIcon />}
      icon={<FormatItalicIcon />}
      inputProps={{ 'aria-label': t('elementBar.textItalic', 'Italic') }}
      onClick={() => handleClick(!textItalic)}
    />
  );
}
