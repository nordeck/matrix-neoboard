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

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import { GuidedTourProvider } from './GuidedTourProvider';
import { StyledJoyride } from './StyledJoyride';

describe('<StyledJoyride/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    window.localStorage.clear();

    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      return (
        <>
          <div data-guided-tour-target="step-1">Step 1</div>
          <div data-guided-tour-target="step-2">Step 2</div>
          <GuidedTourProvider>{children}</GuidedTourProvider>
        </>
      );
    };
  });

  it('should open the joyride', async () => {
    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
          {
            title: 'Step 2',
            content: 'Details for the second element',
            target: '[data-guided-tour-target="step-2"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    const firstDialog = await screen.findByRole('alertdialog', {
      name: 'Step 1',
      description: 'Details for the first element',
    });

    expect(
      within(firstDialog).getByRole('heading', { name: 'Step 1', level: 3 }),
    ).toBeInTheDocument();
    expect(
      within(firstDialog).getByText('Details for the first element'),
    ).toBeInTheDocument();
    expect(within(firstDialog).getByText('1 of 2')).toBeInTheDocument();
    expect(
      within(firstDialog).getByRole('button', { name: 'Close' }),
    ).toBeInTheDocument();
    expect(
      within(firstDialog).queryByRole('button', { name: 'Back' }),
    ).not.toBeInTheDocument();
    expect(
      within(firstDialog).queryByRole('button', { name: 'Complete' }),
    ).not.toBeInTheDocument();
    expect(
      within(firstDialog).getByRole('button', { name: 'Next' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { baseElement } = render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
          {
            title: 'Step 2',
            content: 'Details for the second element',
            target: '[data-guided-tour-target="step-2"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    expect(
      await screen.findByRole('alertdialog', { name: 'Step 1' }),
    ).toBeInTheDocument();

    // the popover is opened in a portal, so we check the baseElement, i.e. <body/>.
    expect(
      await axe(baseElement, {
        rules: {
          // the menu is opened in a portal, so we must check the baseElement,
          // i.e. <body/>. In that case we get false positive warning
          region: { enabled: false },
        },
      }),
    ).toHaveNoViolations();
  });

  it('should navigate between the steps', async () => {
    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
          {
            title: 'Step 2',
            content: 'Details for the second element',
            target: '[data-guided-tour-target="step-2"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    const firstDialog = await screen.findByRole('alertdialog', {
      name: 'Step 1',
      description: 'Details for the first element',
    });

    expect(within(firstDialog).getByText('1 of 2')).toBeInTheDocument();

    await userEvent.click(
      within(firstDialog).getByRole('button', { name: 'Next' }),
    );

    const secondDialog = await screen.findByRole('alertdialog', {
      name: 'Step 2',
      description: 'Details for the second element',
    });

    expect(within(secondDialog).getByText('2 of 2')).toBeInTheDocument();

    await userEvent.click(
      within(secondDialog).getByRole('button', { name: 'Back' }),
    );

    expect(
      await screen.findByRole('alertdialog', {
        name: 'Step 1',
        description: 'Details for the first element',
      }),
    ).toBeInTheDocument();
  });

  it('should complete the joyride', async () => {
    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    const firstDialog = await screen.findByRole('alertdialog', {
      name: 'Step 1',
      description: 'Details for the first element',
    });

    await userEvent.click(
      within(firstDialog).getByRole('button', { name: 'Complete' }),
    );

    await waitFor(() => {
      expect(firstDialog).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should cancel the joyride', async () => {
    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
          {
            title: 'Step 2',
            content: 'Details for the second element',
            target: '[data-guided-tour-target="step-2"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    const firstDialog = await screen.findByRole('alertdialog', {
      name: 'Step 1',
      description: 'Details for the first element',
    });

    await userEvent.click(
      within(firstDialog).getByRole('button', { name: 'Close' }),
    );

    await waitFor(() => {
      expect(firstDialog).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should set the local storage when completed', async () => {
    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByText('Details for the first element'),
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Complete' }),
    );

    expect(localStorage.getItem('guided_tour_completed')).toBe('true');
  });

  it('should not start when the local storage entry is set', async () => {
    localStorage.setItem('guided_tour_completed', 'true');

    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.queryByText('Details for the first element'),
    ).not.toBeInTheDocument();
  });

  it('should run an onEnter and onLeave action', async () => {
    const onEnter = jest.fn();
    const onLeave = jest.fn();

    render(
      <StyledJoyride
        steps={[
          {
            title: 'Step 1',
            content: 'Details for the first element',
            target: '[data-guided-tour-target="step-1"]',
            disableBeacon: true,
            onLeave,
          },
          {
            title: 'Step 2',
            content: 'Details for the second element',
            target: '[data-guided-tour-target="step-2"]',
            disableBeacon: true,
            onEnter,
          },
        ]}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    expect(
      await screen.findByRole('alertdialog', {
        name: 'Step 2',
        description: 'Details for the second element',
      }),
    ).toBeInTheDocument();

    expect(onEnter).toHaveBeenCalled();
    expect(onLeave).toHaveBeenCalled();
  });

  it('should hide the joyride if disabled', async () => {
    const steps = [
      {
        title: 'Step 1',
        content: 'Details for the first element',
        target: '[data-guided-tour-target="step-1"]',
        disableBeacon: true,
      },
      {
        title: 'Step 2',
        content: 'Details for the second element',
        target: '[data-guided-tour-target="step-2"]',
        disableBeacon: true,
      },
    ];

    const { rerender } = render(<StyledJoyride steps={steps} />, {
      wrapper: Wrapper,
    });

    const firstDialog = await screen.findByRole('alertdialog', {
      name: 'Step 1',
      description: 'Details for the first element',
    });

    rerender(<StyledJoyride disabled steps={steps} />);

    expect(firstDialog).not.toBeInTheDocument();

    rerender(<StyledJoyride steps={steps} />);

    expect(
      await screen.findByRole('alertdialog', {
        name: 'Step 1',
        description: 'Details for the first element',
      }),
    ).toBeInTheDocument();
  });
});
