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

import { Toolbar as MuiToolbar, SxProps, Theme, styled } from '@mui/material';
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

const ToolbarStyled = styled(MuiToolbar)(
  ({ theme, 'aria-orientation': ariaOrientation }) => ({
    border: `1px solid ${theme.palette.divider}`,
    padding: 2,
    gap: 2,
    minHeight: 'auto',
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2],
    flexDirection: ariaOrientation === 'vertical' ? 'column' : 'row',
  })
);

export type ToolbarProps = PropsWithChildren<
  Partial<React.ComponentPropsWithRef<'div'>> & {
    sx?: SxProps<Theme>;
    orientation?: 'vertical' | 'horizontal';
  }
>;

export function Toolbar({
  children,
  orientation = 'horizontal',
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
          if (orientation === 'horizontal') {
            event.preventDefault();
            moveFocus(list, currentFocus, previousItem);
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            event.preventDefault();
            moveFocus(list, currentFocus, nextItem);
          }
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
          } else if (orientation === 'vertical') {
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
          } else if (orientation === 'vertical') {
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
    [orientation]
  );

  return (
    <ToolbarStyled
      ref={ref}
      role="toolbar"
      onKeyDown={handleKeyDown}
      disableGutters
      variant="dense"
      aria-orientation={orientation}
      {...props}
    >
      <ToolbarStateContext.Provider value={context}>
        {children}
      </ToolbarStateContext.Provider>
    </ToolbarStyled>
  );
}
