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

import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import { ChangeEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextAlignment,
  useActiveElement,
  useElement,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ToolbarRadio, ToolbarRadioGroup } from '../../common/Toolbar';

export function TextAlignButtons() {
  const { t } = useTranslation();
  const { activeElementId } = useActiveElement();
  const element = useElement(activeElementId);
  const slideInstance = useWhiteboardSlideInstance();

  const handleRadioClick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked && activeElementId) {
        slideInstance.updateElement(activeElementId, {
          textAlign: event.target.value as TextAlignment,
        });
      }
    },
    [activeElementId, slideInstance]
  );

  if (element?.type !== 'shape') {
    return null;
  }

  const alignment: TextAlignment = element.textAlign ?? 'center';

  return (
    <ToolbarRadioGroup
      flexWrap="wrap"
      aria-label={t('elementBar.alignment', 'Text Alignment')}
    >
      <ToolbarRadio
        inputProps={{ 'aria-label': t('elementBar.alignmentLeft', 'Left') }}
        icon={<FormatAlignLeftIcon />}
        checkedIcon={<FormatAlignLeftIcon />}
        value={'left'}
        checked={alignment === 'left'}
        onChange={handleRadioClick}
      />
      <ToolbarRadio
        inputProps={{ 'aria-label': t('elementBar.alignmentCenter', 'Center') }}
        icon={<FormatAlignCenterIcon />}
        checkedIcon={<FormatAlignCenterIcon />}
        value={'center'}
        checked={alignment === 'center'}
        onChange={handleRadioClick}
      />
      <ToolbarRadio
        inputProps={{ 'aria-label': t('elementBar.alignmentRight', 'Right') }}
        icon={<FormatAlignRightIcon />}
        checkedIcon={<FormatAlignRightIcon />}
        value={'right'}
        checked={alignment === 'right'}
        onChange={handleRadioClick}
      />
    </ToolbarRadioGroup>
  );
}
