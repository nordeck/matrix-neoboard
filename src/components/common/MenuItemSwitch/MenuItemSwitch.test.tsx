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

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Menu } from '@mui/material';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import { MenuItemSwitch } from './MenuItemSwitch';

describe('<MenuItemSwitch>', () => {
  const onChange = jest.fn();
  const onClick = jest.fn();

  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => (
      <Menu
        open
        anchorReference="anchorPosition"
        anchorPosition={{ left: 0, top: 0 }}
      >
        {children}
      </Menu>
    );
  });

  it('should render without exploding', () => {
    render(
      <MenuItemSwitch
        icon={<LockOutlinedIcon />}
        title="Title"
        checked={true}
        onChange={onChange}
        onClick={onClick}
      />,
      { wrapper: Wrapper }
    );

    const item = screen.getByRole('menuitemcheckbox', {
      name: 'Title',
      checked: true,
    });

    expect(
      within(item).getByRole('checkbox', { name: 'Title', checked: true })
    ).toBeInTheDocument();
    expect(within(item).getByTestId('LockOutlinedIcon')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { baseElement } = render(
      <MenuItemSwitch
        icon={<LockOutlinedIcon />}
        title="Title"
        checked={true}
        onChange={onChange}
        onClick={onClick}
      />,
      { wrapper: Wrapper }
    );

    expect(
      await axe(baseElement, {
        rules: {
          // the menu is opened in a portal, so we must check the baseElement,
          // i.e. <body/>. In that case we get false positive warning
          region: { enabled: false },
          // the switch in the menu item seems to not be allowed, but we
          // accept it for now.
          'nested-interactive': { enabled: false },
        },
      })
    ).toHaveNoViolations();
  });

  it('should toggle by click on menu item and close the menu', async () => {
    render(
      <MenuItemSwitch
        icon={<LockOutlinedIcon />}
        title="Title"
        checked={true}
        onChange={onChange}
        onClick={onClick}
      />,
      { wrapper: Wrapper }
    );

    await userEvent.click(screen.getByRole('menuitemcheckbox'));

    expect(onChange).toBeCalledWith(false);
    expect(onClick).toBeCalled();
  });

  it('should toggle click on switch', async () => {
    render(
      <MenuItemSwitch
        icon={<LockOutlinedIcon />}
        title="Title"
        checked={true}
        onChange={onChange}
        onClick={onClick}
      />,
      { wrapper: Wrapper }
    );

    await userEvent.click(screen.getByRole('checkbox'));

    expect(onChange).toBeCalledWith(false);
    expect(onClick).not.toBeCalled();
  });

  it('should toggle switch by pressing space', async () => {
    render(
      <MenuItemSwitch
        icon={<LockOutlinedIcon />}
        title="Title"
        checked={true}
        onChange={onChange}
        onClick={onClick}
      />,
      { wrapper: Wrapper }
    );

    await userEvent.keyboard('[Space]');

    expect(onChange).toBeCalledWith(false);
    expect(onClick).not.toBeCalled();
  });

  it('should toggle switch and close menu by pressing enter', async () => {
    render(
      <MenuItemSwitch
        icon={<LockOutlinedIcon />}
        title="Title"
        checked={true}
        onChange={onChange}
        onClick={onClick}
      />,
      { wrapper: Wrapper }
    );

    await userEvent.keyboard('[Enter]');

    expect(onChange).toBeCalledWith(false);
    expect(onClick).toBeCalled();
  });
});
