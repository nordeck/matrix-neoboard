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
import { ChangeEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextAlignment,
  useActiveElement,
  useElement,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ToolbarRadio, ToolbarRadioGroup } from '../../common/Toolbar';

export function TextAlignmentButtons() {
  const { t } = useTranslation();
  const { activeElementId } = useActiveElement();
  const element = useElement(activeElementId);
  const slideInstance = useWhiteboardSlideInstance();

  const handleRadioClick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked && activeElementId) {
        slideInstance.updateElement(activeElementId, {
          textAlignment: event.target.value as TextAlignment,
        });
      }
    },
    [activeElementId, slideInstance],
  );

  if (element?.type !== 'shape') {
    return null;
  }

  const textAlignment: TextAlignment = element.textAlignment ?? 'center';

  return (
    <ToolbarRadioGroup
      flexWrap="wrap"
      aria-label={t('elementBar.textAlignment', 'Text Alignment')}
    >
      <ToolbarRadio
        inputProps={{ 'aria-label': t('elementBar.textAlignmentLeft', 'Left') }}
        icon={<FormatAlignLeftIcon />}
        checkedIcon={<FormatAlignLeftIcon />}
        value={'left'}
        checked={textAlignment === 'left'}
        onChange={handleRadioClick}
      />
      <ToolbarRadio
        inputProps={{
          'aria-label': t('elementBar.textAlignmentCenter', 'Center'),
        }}
        icon={<FormatAlignCenterIcon />}
        checkedIcon={<FormatAlignCenterIcon />}
        value={'center'}
        checked={textAlignment === 'center'}
        onChange={handleRadioClick}
      />
      <ToolbarRadio
        inputProps={{
          'aria-label': t('elementBar.textAlignmentRight', 'Right'),
        }}
        icon={<FormatAlignRightIcon />}
        checkedIcon={<FormatAlignRightIcon />}
        value={'right'}
        checked={textAlignment === 'right'}
        onChange={handleRadioClick}
      />
    </ToolbarRadioGroup>
  );
}
