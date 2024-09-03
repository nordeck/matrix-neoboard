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

//import { useTranslation } from 'react-i18next';
import { MenuItem, Select } from '@mui/material';
import { useFontSize } from '../../../lib/text-formatting';
import { useActiveElements, useElements } from '../../../state';

const FONT_SIZES = [8, 10, 12, 14, 16, 20, 24, 32, 36, 40, 48, 64, 96];

export function FontSizeButton() {
  const { fontSize, setFontSize } = useFontSize();

  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);

  if (elements.every((element) => element.type !== 'shape')) {
    return null;
  }

  return (
    <Select
      variant="filled"
      value={fontSize}
      onChange={(event) => {
        setFontSize(event.target.value as number | undefined);
      }}
    >
      <MenuItem value={undefined}>Auto</MenuItem>
      {FONT_SIZES.map((fontSize) => (
        <MenuItem value={fontSize} key={fontSize}>
          {fontSize}
        </MenuItem>
      ))}
    </Select>
  );
}
