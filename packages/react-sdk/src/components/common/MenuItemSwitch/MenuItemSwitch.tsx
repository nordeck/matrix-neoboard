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

import {
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuItemProps,
  Switch,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { KeyboardEvent, MouseEvent, ReactNode, useCallback } from 'react';

export type MenuItemSwitchProps = {
  checked: boolean;
  title: string;
  icon: ReactNode;
  onClick: () => void;
  onChange: (value: boolean) => void;
} & Omit<MenuItemProps, 'onChange'>;

export function MenuItemSwitch({
  checked,
  title,
  icon,
  onClick,
  onChange,
  ...props
}: MenuItemSwitchProps) {
  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      // menuitemcheckbox should not close the menu if the space key is pressed.
      // The menu should be closed on enter. See
      // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/menuitemcheckbox_role#keyboard_interactions
      if (e.code === 'Space') {
        onChange(!checked);
        e.preventDefault();
      }
    },
    [onChange, checked],
  );

  const handleMenuItemClick = useCallback(() => {
    onChange(!checked);
    onClick();
  }, [onChange, onClick, checked]);

  const handleSwitchClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    // Don't forward the click to the menu item, otherwise the menu would
    // close
    e.stopPropagation();
  }, []);

  const handleSwitchChange = useCallback(
    (_, value: boolean) => {
      onChange(value);
    },
    [onChange],
  );

  const titleId = useId();

  return (
    <MenuItem
      // Forward all other props as Mui uses them to set the initial focus of
      // the menu.
      {...props}
      role="menuitemcheckbox"
      onClick={handleMenuItemClick}
      onKeyUp={handleKeyUp}
      aria-checked={checked}
      aria-labelledby={titleId}
    >
      <ListItemIcon sx={{ color: 'currentcolor' }}>{icon}</ListItemIcon>
      <ListItemText id={titleId}>{title}</ListItemText>
      <Switch
        inputProps={{ 'aria-labelledby': titleId }}
        edge="end"
        onChange={handleSwitchChange}
        onClick={handleSwitchClick}
        size="small"
        checked={checked}
        sx={{ ml: 1 }}
      />
    </MenuItem>
  );
}
