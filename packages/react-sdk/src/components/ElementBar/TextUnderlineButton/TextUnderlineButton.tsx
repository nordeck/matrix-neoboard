/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import { useTranslation } from 'react-i18next';
import { useToggleUnderline } from '../../../lib/text-formatting';
import { ToolbarToggle } from '../../common/Toolbar';

export function TextUnderlineButton() {
  const { t } = useTranslation('neoboard');
  const { isUnderline, toggleUnderline } = useToggleUnderline();

  return (
    <ToolbarToggle
      checked={isUnderline}
      checkedIcon={<FormatUnderlinedIcon />}
      icon={<FormatUnderlinedIcon />}
      slotProps={{
        input: { 'aria-label': t('elementBar.textUnderline', 'Underline') },
      }}
      onClick={toggleUnderline}
    />
  );
}
