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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { Subject } from 'rxjs';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import {
  mockPowerLevelsEvent,
  mockRoomMember,
} from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../state';
import { Message } from '../../state/communication';
import { LayoutStateProvider } from '../Layout';
import { PresentBar } from './PresentBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<PresentBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let messageSubject: Subject<Message>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let setPresentationMode: (enable: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, messageSubject, setPresentationMode } =
      mockWhiteboardManager({
        slides: [
          ['slide-0', []],
          ['slide-1', []],
          ['slide-2', []],
        ],
      }));

    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    activeWhiteboardInstance.setActiveSlideId('slide-1');

    widgetApi.mockSendStateEvent(mockRoomMember());

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await act(async () => {
      expect(
        within(toolbar).getByRole('checkbox', {
          name: 'Start presentation',
          checked: false,
        }),
      ).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<PresentBar />, { wrapper: Wrapper });

    await act(async () => {
      expect(
        screen.getByRole('checkbox', { name: 'Start presentation' }),
      ).toBeInTheDocument();

      expect(await axe.run(container)).toHaveNoViolations();
    });
  });

  it('should have no accessibility violations when viewing a presentation', async () => {
    setPresentationMode(true);

    const { container } = render(<PresentBar />, { wrapper: Wrapper });

    await act(async () => {
      expect(await axe.run(container)).toHaveNoViolations();
    });
  });

  it('should start the presentation', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'End presentation',
        checked: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', {
        name: 'Next slide',
      }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', {
        name: 'Previous slide',
      }),
    ).toBeInTheDocument();
  });

  it('should stop the presentation', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getPresentationManager()
      .startPresentation();

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'End presentation',
        checked: true,
      }),
    );

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    ).toBeInTheDocument();
  });

  it('should change to the next slide', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');

    await userEvent.click(
      within(toolbar).getByRole('button', {
        name: 'Next slide',
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-2');
  });

  it('should change to the previous slide', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');

    await userEvent.click(
      within(toolbar).getByRole('button', {
        name: 'Previous slide',
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-0');
  });

  it('should disabled next slide button if the last slide active', async () => {
    activeWhiteboardInstance.setActiveSlideId('slide-2');
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    expect(
      within(toolbar).getByRole('button', {
        name: 'Next slide',
      }),
    ).toBeDisabled();
  });

  it('should disabled previous slide button if the first slide active', async () => {
    activeWhiteboardInstance.setActiveSlideId('slide-0');
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    expect(
      within(toolbar).getByRole('button', {
        name: 'Previous slide',
      }),
    ).toBeDisabled();
  });

  it('should toggle the edit mode', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getPresentationManager()
      .startPresentation();

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Enable editing',
        checked: false,
      }),
    );

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Disable editing',
        checked: true,
      }),
    );

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Enable editing',
        checked: false,
      }),
    ).toBeInTheDocument();
  });

  it('should be able to end presentation of another user if can moderate', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    act(() => {
      messageSubject.next({
        senderUserId: '@user-alice',
        senderSessionId: 'other',
        type: 'net.nordeck.whiteboard.present_slide',
        content: {
          view: { isEditMode: false, slideId: 'slide-0' },
        },
      });
    });

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id': 50 },
          users_default: 0,
        },
      }),
    );

    const endPresentationButton = await within(toolbar).findByRole('button', {
      name: 'End presentation',
    });

    await userEvent.click(endPresentationButton);

    expect(endPresentationButton).not.toBeInTheDocument();

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    ).toBeInTheDocument();
  });

  it('should not be able to end presentation of another user if cannot moderate', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    act(() => {
      messageSubject.next({
        senderUserId: '@user-alice',
        senderSessionId: 'other',
        type: 'net.nordeck.whiteboard.present_slide',
        content: {
          view: { isEditMode: false, slideId: 'slide-0' },
        },
      });
    });

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id': 50 },
          users_default: 0,
        },
      }),
    );

    const endPresentationButton = await within(toolbar).findByRole('button', {
      name: 'End presentation',
    });

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id': 0 },
          users_default: 0,
        },
      }),
    );

    await waitFor(() => {
      expect(endPresentationButton).not.toBeInTheDocument();
    });
  });
});
