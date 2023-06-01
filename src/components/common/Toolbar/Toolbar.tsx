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

import { styled, SxProps, Theme, Toolbar as MuiToolbar } from '@mui/material';
import React, {
  KeyboardEvent,
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ToolbarState, ToolbarStateContext } from './useToolbarItem';
import {
  findParentRadioGroup,
  isRadioInput,
  moveFocus,
  nextItem,
  previousItem,
} from './utils';

const ToolbarStyled = styled(MuiToolbar)<{
  toolbarDirection: ToolbarDirection;
}>(({ theme, toolbarDirection }) => ({
  border: `1px solid ${theme.palette.divider}`,
  padding: 2,
  gap: 2,
  minHeight: 'auto',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  flexDirection: toolbarDirection,
}));

export type ToolbarDirection = 'row' | 'column';

export type ToolbarProps = PropsWithChildren<
  Partial<
    React.ComponentPropsWithRef<'div'> & { sx?: SxProps<Theme> } & {
      toolbarDirection?: ToolbarDirection;
    }
  >
>;

export function Toolbar({
  children,
  toolbarDirection = 'row',
  ...props
}: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusedToolbarKey, setFocusedToolbarKey] = useState<
    string | undefined
  >();

  const context = useMemo<ToolbarState>(
    () => ({
      focusedToolbarKey,
      setFocusedToolbarKey,
      registerToolbarKey: (toolbarKey) =>
        setFocusedToolbarKey((oldKey) => (oldKey ? oldKey : toolbarKey)),
    }),
    [focusedToolbarKey]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const list = ref.current;
      const currentFocus = document.activeElement;

      // Keyboard interactions are based on
      // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/toolbar_role#keyboard_interactions
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(list, currentFocus, previousItem);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(list, currentFocus, nextItem);
          break;
        case 'ArrowUp':
          // Up and down arrow keys are used to navigate in a single radio group in a toolbar
          // https://developer.mozilla.org/en-US/docs/web/accessibility/aria/roles/radiogroup_role#keyboard_interactions
          if (isRadioInput(currentFocus)) {
            event.preventDefault();
            moveFocus(
              findParentRadioGroup(currentFocus, list),
              currentFocus,
              previousItem
            );
          } else if (toolbarDirection && toolbarDirection === 'column') {
            event.preventDefault();
            moveFocus(list, currentFocus, previousItem);
          }
          break;
        case 'ArrowDown':
          if (isRadioInput(currentFocus)) {
            event.preventDefault();
            moveFocus(
              findParentRadioGroup(currentFocus, list),
              currentFocus,
              nextItem
            );
          } else if (toolbarDirection && toolbarDirection === 'column') {
            event.preventDefault();
            moveFocus(list, currentFocus, nextItem);
          }
          break;
        case 'Home':
          event.preventDefault();
          moveFocus(list, null, nextItem);
          break;
        case 'End':
          event.preventDefault();
          moveFocus(list, null, previousItem);
          break;
      }
    },
    [toolbarDirection]
  );

  return (
    <ToolbarStyled
      ref={ref}
      role="toolbar"
      onKeyDown={handleKeyDown}
      disableGutters
      variant="dense"
      toolbarDirection={toolbarDirection}
      {...props}
    >
      <ToolbarStateContext.Provider value={context}>
        {children}
      </ToolbarStateContext.Provider>
    </ToolbarStyled>
  );
}
