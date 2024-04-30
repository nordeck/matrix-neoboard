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

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Toolbar } from './Toolbar';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarRadio } from './ToolbarRadio';
import { ToolbarRadioGroup } from './ToolbarRadioGroup';
import { ToolbarSubMenu } from './ToolbarSubMenu';
import { ToolbarToggle } from './ToolbarToggle';

describe('Toolbar', () => {
  it('should render without exploding', () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
        <ToolbarRadioGroup aria-label="Radio Group">
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
        </ToolbarRadioGroup>
      </Toolbar>,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Toolbar' });

    expect(
      within(toolbar).getByRole('checkbox', { name: 'A' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: 'B' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: 'C' }),
    ).toBeInTheDocument();
    const radioGroup = within(toolbar).getByRole('radiogroup', {
      name: 'Radio Group',
    });
    expect(
      within(radioGroup).getByRole('radio', { name: 'D' }),
    ).toBeInTheDocument();
    expect(
      within(radioGroup).getByRole('radio', { name: 'E' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Toolbar>
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarButton>C</ToolbarButton>
        <ToolbarSubMenu>D</ToolbarSubMenu>
        <ToolbarRadioGroup aria-label="Radio Group">
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
        </ToolbarRadioGroup>
      </Toolbar>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should make the first toolbar item focusable', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('should focus the next item if arrow right key is pressed', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('button', { name: 'B' }).focus();
    });

    await userEvent.keyboard('[ArrowRight]');
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();
  });

  it('should focus the previous item if arrow left key is pressed', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('button', { name: 'B' }).focus();
    });
    await userEvent.keyboard('[ArrowLeft]');
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveFocus();
  });

  it('should focus the next item if arrow down key is pressed for vertical toolbar', async () => {
    render(
      <Toolbar aria-label="Toolbar" orientation="vertical">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('button', { name: 'B' }).focus();
    });
    await userEvent.keyboard('[ArrowDown]');
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();
  });

  it('should focus the previous item if arrow up key is pressed for vertical toolbar', async () => {
    render(
      <Toolbar aria-label="Toolbar" orientation="vertical">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('button', { name: 'B' }).focus();
    });
    await userEvent.keyboard('[ArrowUp]');
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveFocus();
  });

  it('should wrap focus to the previous item if arrow left key is pressed while the first item is focused', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
        <ToolbarRadioGroup aria-label="Radio Group">
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
        </ToolbarRadioGroup>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('checkbox', { name: 'A' }).focus();
    });
    await userEvent.keyboard('[ArrowLeft]');
    expect(screen.getByRole('radio', { name: 'E' })).toHaveFocus();
  });

  it('should wrap focus to the next item if arrow right key is pressed while the last item is focused', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
        <ToolbarRadioGroup aria-label="Radio Group">
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
        </ToolbarRadioGroup>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('radio', { name: 'E' }).focus();
    });
    await userEvent.keyboard('[ArrowRight]');
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveFocus();
  });

  it('should focus first item if home key is pressed', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('button', { name: 'C' }).focus();
    });
    await userEvent.keyboard('[Home]');
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveFocus();
  });

  it('should focus last item if end key is pressed', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarButton>B</ToolbarButton>
        <ToolbarSubMenu>C</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('checkbox', { name: 'A' }).focus();
    });
    await userEvent.keyboard('[End]');
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();
  });

  it('should restore focus if the toolbar is focused', async () => {
    render(
      <>
        <Toolbar>
          <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
          <ToolbarButton>B</ToolbarButton>
          <ToolbarSubMenu>C</ToolbarSubMenu>
        </Toolbar>
        <button>Outside</button>
      </>,
    );

    act(() => {
      screen.getByRole('checkbox', { name: 'A' }).focus();
    });

    const buttonB = screen.getByRole('button', { name: 'B' });
    await userEvent.keyboard('[ArrowRight]');
    expect(buttonB).toHaveFocus();

    await userEvent.keyboard('[Tab]');
    expect(buttonB).not.toHaveFocus();

    await userEvent.keyboard('{Shift>}[Tab]{/Shift}');
    expect(buttonB).toHaveFocus();
  });

  it('should set focus on click', async () => {
    render(
      <>
        <Toolbar>
          <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
          <ToolbarButton>B</ToolbarButton>
          <ToolbarSubMenu>C</ToolbarSubMenu>
        </Toolbar>
        <button>Outside</button>
      </>,
    );

    const buttonB = screen.getByRole('button', { name: 'B' });
    await userEvent.click(buttonB);
    expect(buttonB).toHaveFocus();

    await userEvent.keyboard('[Tab]');
    expect(buttonB).not.toHaveFocus();

    await userEvent.keyboard('{Shift>}[Tab]{/Shift}');
    expect(buttonB).toHaveFocus();
  });

  it('should focus the next radio button if arrow down key is pressed', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarRadioGroup aria-label="Radio Group 1">
          <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
          <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
        </ToolbarRadioGroup>
        <ToolbarRadioGroup aria-label="Radio Group 2">
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
          <ToolbarRadio value="F" inputProps={{ 'aria-label': 'F' }} />
          <ToolbarRadio value="G" inputProps={{ 'aria-label': 'G' }} />
        </ToolbarRadioGroup>
        <ToolbarButton>H</ToolbarButton>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('radio', { name: 'B' }).focus();
    });
    await userEvent.keyboard('[ArrowDown]');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
  });

  it('should focus the previous radio button if arrow up key is pressed', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarRadioGroup aria-label="Radio Group 1">
          <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
          <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
        </ToolbarRadioGroup>
        <ToolbarRadioGroup aria-label="Radio Group 2">
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
          <ToolbarRadio value="F" inputProps={{ 'aria-label': 'F' }} />
          <ToolbarRadio value="G" inputProps={{ 'aria-label': 'G' }} />
        </ToolbarRadioGroup>
        <ToolbarButton>H</ToolbarButton>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('radio', { name: 'F' }).focus();
    });
    await userEvent.keyboard('[ArrowUp]');
    expect(screen.getByRole('radio', { name: 'E' })).toHaveFocus();
  });

  it('should wrap focus to the previous radio button in the same group if arrow up key is pressed while the first item is focused', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarRadioGroup aria-label="Radio Group 1">
          <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
          <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
        </ToolbarRadioGroup>
        <ToolbarRadioGroup aria-label="Radio Group 2">
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
          <ToolbarRadio value="F" inputProps={{ 'aria-label': 'F' }} />
          <ToolbarRadio value="G" inputProps={{ 'aria-label': 'G' }} />
        </ToolbarRadioGroup>
        <ToolbarButton>H</ToolbarButton>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('radio', { name: 'E' }).focus();
    });
    await userEvent.keyboard('[ArrowUp]');
    expect(screen.getByRole('radio', { name: 'G' })).toHaveFocus();
  });

  it('should wrap focus to the next radio button in the same group if arrow down key is pressed while the last item is focused', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
        <ToolbarRadioGroup aria-label="Radio Group 1">
          <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
          <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
          <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
        </ToolbarRadioGroup>
        <ToolbarRadioGroup aria-label="Radio Group 2">
          <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
          <ToolbarRadio value="F" inputProps={{ 'aria-label': 'F' }} />
          <ToolbarRadio value="G" inputProps={{ 'aria-label': 'G' }} />
        </ToolbarRadioGroup>
        <ToolbarButton>H</ToolbarButton>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('radio', { name: 'D' }).focus();
    });
    await userEvent.keyboard('[ArrowDown]');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveFocus();
  });

  it.each(['[SPACE]', '[ENTER]'])(
    'should select the radio item on %p',
    async (key) => {
      render(
        <Toolbar aria-label="Toolbar">
          <ToolbarToggle inputProps={{ 'aria-label': 'A' }} />
          <ToolbarRadioGroup aria-label="Radio Group 1">
            <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
            <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
            <ToolbarRadio value="D" inputProps={{ 'aria-label': 'D' }} />
          </ToolbarRadioGroup>
          <ToolbarRadioGroup aria-label="Radio Group 2">
            <ToolbarRadio value="E" inputProps={{ 'aria-label': 'E' }} />
            <ToolbarRadio value="F" inputProps={{ 'aria-label': 'F' }} />
            <ToolbarRadio value="G" inputProps={{ 'aria-label': 'G' }} />
          </ToolbarRadioGroup>
          <ToolbarButton>H</ToolbarButton>
        </Toolbar>,
      );

      act(() => {
        screen.getByRole('radio', { name: 'D', checked: false }).focus();
      });
      await userEvent.keyboard(key);
      expect(screen.getByRole('radio', { name: 'D' })).toBeChecked();
    },
  );

  it('should restore focus if the toolbar is focused when the focus is on an uncheck radio', async () => {
    render(
      <>
        <Toolbar aria-label="Toolbar">
          <ToolbarRadioGroup aria-label="Radio Group">
            <ToolbarRadio value="A" inputProps={{ 'aria-label': 'A' }} />
            <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
            <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
          </ToolbarRadioGroup>
        </Toolbar>
        <button>Outside</button>
      </>,
    );

    const radioB = screen.getByRole('radio', { name: 'B' });

    act(() => {
      radioB.focus();
    });

    await userEvent.keyboard('[Tab]');
    expect(radioB).not.toHaveFocus();

    await userEvent.keyboard('{Shift>}[Tab]{/Shift}');
    expect(radioB).toHaveFocus();
  });

  it('should not check radio button when using the arrow keys', async () => {
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarRadioGroup aria-label="Radio Group">
          <ToolbarRadio value="A" inputProps={{ 'aria-label': 'A' }} />
          <ToolbarRadio value="B" inputProps={{ 'aria-label': 'B' }} />
          <ToolbarRadio value="C" inputProps={{ 'aria-label': 'C' }} />
        </ToolbarRadioGroup>
      </Toolbar>,
    );

    const radioB = screen.getByRole('radio', { name: 'B' });
    await userEvent.click(radioB);

    await userEvent.keyboard('[ArrowDown]');
    expect(radioB).toBeChecked();
    expect(screen.getByRole('radio', { name: 'C' })).not.toBeChecked();
  });

  it('should open the submenu when using the arrow down key', async () => {
    const onClick = jest.fn();
    render(
      <Toolbar aria-label="Toolbar">
        <ToolbarSubMenu onClick={onClick}>A</ToolbarSubMenu>
      </Toolbar>,
    );

    act(() => {
      screen.getByRole('button', { name: 'A' }).focus();
    });
    await userEvent.keyboard('[ArrowDown]');

    expect(onClick).toBeCalled();
  });
});
