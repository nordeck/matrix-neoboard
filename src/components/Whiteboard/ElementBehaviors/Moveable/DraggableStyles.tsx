/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { GlobalStyles } from '@mui/material';

// Custom version of the addUserSelectStyles from react-draggable. The original
// version doesn't support our nonce-based CSP.
// https://github.com/react-grid-layout/react-draggable/blob/31798e920647f40308a144a9f989c771755a21db/lib/utils/domFns.js#L154-L166
export function DraggableStyles() {
  return (
    <GlobalStyles
      styles={{
        '.react-draggable-transparent-selection *::-moz-selection': {
          all: 'inherit',
        },
        '.react-draggable-transparent-selection *::selection': {
          all: 'inherit',
        },
      }}
    />
  );
}

export function addUserSelectStyles() {
  document.body.classList.add('react-draggable-transparent-selection');
}

export function removeUserSelectStyles() {
  document.body.classList.remove('react-draggable-transparent-selection');

  const selection = (document.defaultView || window).getSelection();
  if (selection && selection.type !== 'Caret') {
    selection.removeAllRanges();
  }
}
