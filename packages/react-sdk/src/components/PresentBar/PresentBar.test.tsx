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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { Subject } from 'rxjs';
import {
  Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockFrameElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import {
  mockPowerLevelsEvent,
  mockRoomMember,
} from '../../lib/testUtils/matrixTestUtils';
import {
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../state';
import { Message } from '../../state/communication';
import { LayoutStateProvider } from '../Layout';
import { PresentBar } from './PresentBar';

let widgetApi: MockedWidgetApi;

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

afterEach(() => widgetApi.stop());

beforeEach(() => {
  vi.mocked(getEnvironment).mockImplementation(
    (_, defaultValue) => defaultValue,
  );

  widgetApi = mockWidgetApi();
});

describe('<PresentBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let messageSubject: Subject<Message>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;
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
    activeSlide = activeWhiteboardInstance.getSlide('slide-1');

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

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    ).toBeInTheDocument();
  });

  it('should render without frames in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Add a frame to enable presentation mode',
        checked: false,
      }),
    ).toBeDisabled();
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

  it('should start the presentation in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    activeSlide.addElement(mockFrameElement());

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
        name: 'Next frame',
      }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', {
        name: 'Previous frame',
      }),
    ).toBeInTheDocument();
  });

  it('should stop the presentation', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getPresentationManager()
      ?.startPresentation();

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

  it('should stop the presentation in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const frameId = activeSlide.addElement(mockFrameElement());

    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getPresentationManager()
      ?.startPresentation(frameId);

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

  it('should change to the next frame in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const frameId0 = activeSlide.addElement(mockFrameElement());
    const frameId1 = activeSlide.addElement(mockFrameElement());

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');
    expect(activeWhiteboardInstance.getActiveFrameElementId()).toBe(frameId0);

    await userEvent.click(
      within(toolbar).getByRole('button', {
        name: 'Next frame',
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');
    expect(activeWhiteboardInstance.getActiveFrameElementId()).toBe(frameId1);
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

  it('should change to the previous frame in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const frameId0 = activeSlide.addElement(mockFrameElement());
    const frameId1 = activeSlide.addElement(mockFrameElement());

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    act(() => {
      activeWhiteboardInstance.setActiveFrameElementId(frameId1);
    });

    await userEvent.click(
      within(toolbar).getByRole('button', {
        name: 'Previous frame',
      }),
    );

    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');
    expect(activeWhiteboardInstance.getActiveFrameElementId()).toBe(frameId0);
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

  it('should disabled next frame button if the last frame active in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    activeSlide.addElement(mockFrameElement());
    const frameId1 = activeSlide.addElement(mockFrameElement());

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      }),
    );

    act(() => {
      activeWhiteboardInstance.setActiveFrameElementId(frameId1);
    });

    expect(
      within(toolbar).getByRole('button', {
        name: 'Next frame',
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

  it('should disabled previous frame button if the first frame active in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    activeSlide.addElement(mockFrameElement());

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
        name: 'Previous frame',
      }),
    ).toBeDisabled();
  });

  it('should toggle the edit mode', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getPresentationManager()
      ?.startPresentation();

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
        senderUserId: '@user-alice:example.com',
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
          users: { '@user-id:example.com': 50 },
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

  it('should be able to end presentation of another user if can moderate in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const frameId0 = activeSlide.addElement(mockFrameElement());

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    act(() => {
      messageSubject.next({
        senderUserId: '@user-alice:example.com',
        senderSessionId: 'other',
        type: 'net.nordeck.whiteboard.present_frame',
        content: {
          view: { isEditMode: false, frameId: frameId0 },
        },
      });
    });

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id:example.com': 50 },
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
        senderUserId: '@user-alice:example.com',
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
          users: { '@user-id:example.com': 50 },
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
          users: { '@user-id:example.com': 0 },
          users_default: 0,
        },
      }),
    );

    await waitFor(() => {
      expect(endPresentationButton).not.toBeInTheDocument();
    });
  });

  it('should not be able to end presentation of another user if cannot moderate in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const frameId0 = activeSlide.addElement(mockFrameElement());

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    act(() => {
      messageSubject.next({
        senderUserId: '@user-alice:example.com',
        senderSessionId: 'other',
        type: 'net.nordeck.whiteboard.present_frame',
        content: {
          view: { isEditMode: false, frameId: frameId0 },
        },
      });
    });

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id:example.com': 50 },
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
          users: { '@user-id:example.com': 0 },
          users_default: 0,
        },
      }),
    );

    await waitFor(() => {
      expect(endPresentationButton).not.toBeInTheDocument();
    });
  });
});
