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
import { useTranslation } from 'react-i18next';
import { useToggleBold } from '../../../lib/text-formatting';
import { ToolbarToggle } from '../../common/Toolbar';

export function TextBoldButton() {
  const { t } = useTranslation('neoboard');
  const { isBold, toggleBold } = useToggleBold();

  return (
    <ToolbarToggle
      checked={isBold}
      checkedIcon={<FormatBoldIcon />}
      icon={<FormatBoldIcon />}
      inputProps={{ 'aria-label': t('elementBar.textBold', 'Bold') }}
      onClick={toggleBold}
    />
  );
}
