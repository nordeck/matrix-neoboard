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

import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveElements, useWhiteboardSlideInstance } from '../../../state';
import { ToolbarButton } from '../../common/Toolbar';

export function DeleteActiveElementButton() {
  const { t } = useTranslation('neoboard');
  const { activeElementIds } = useActiveElements();
  const slideInstance = useWhiteboardSlideInstance();

  const handleDelete = useCallback(() => {
    if (activeElementIds.length) {
      slideInstance.removeElements(activeElementIds);
    }
  }, [activeElementIds, slideInstance]);

  const deleteActiveElementLabel = t(
    'elementBar.deleteElement',
    'Delete element',
    { count: activeElementIds.length, defaultValue_other: 'Delete elements' },
  );

  return (
    <ToolbarButton aria-label={deleteActiveElementLabel} onClick={handleDelete}>
      <DeleteOutlinedIcon sx={{ color: 'error.main' }} />
    </ToolbarButton>
  );
}
