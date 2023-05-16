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

import { IconButtonProps } from '@mui/material';
import { KeyboardEvent, useCallback, useRef } from 'react';
import { ToolbarButton } from './ToolbarButton';

export type ToolbarSubMenuProps = IconButtonProps;

export function ToolbarSubMenu(props: ToolbarSubMenuProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'ArrowDown') {
      ref.current?.click();
      event.preventDefault();
    }
  }, []);

  return <ToolbarButton ref={ref} {...props} onKeyDown={handleKeyDown} />;
}
