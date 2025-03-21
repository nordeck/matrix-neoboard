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
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
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
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../../../state';
import { LayoutStateProvider } from '../../../Layout';
import { SlidesProvider } from '../../../Layout/SlidesProvider';
import { WhiteboardHotkeysProvider } from '../../../WhiteboardHotkeysProvider';
import { ElementContextMenu } from './ElementContextMenu';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<ElementContextMenu/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockEllipseElement()],
            ['element-2', mockEllipseElement({ text: 'Hello World' })],
          ],
        ],
      ],
    }));

    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardHotkeysProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <SlidesProvider>
              <svg>{children}</svg>
            </SlidesProvider>
          </WhiteboardTestingContextProvider>
        </WhiteboardHotkeysProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    // restore the mock on window.navigator.userAgent
    vi.restoreAllMocks();
  });

  it('should render without exploding', async () => {
    render(
      <ElementContextMenu activeElementIds={['element-1']}>
        <text data-testid="example-text" />
      </ElementContextMenu>,
      { wrapper: Wrapper },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    expect(
      within(contextMenuTarget).getByTestId('example-text'),
    ).toBeInTheDocument();
  });

  it('should open the context menu on right click', async () => {
    render(<ElementContextMenu activeElementIds={['element-1']} />, {
      wrapper: Wrapper,
    });

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(
      within(menu).getByRole('menuitem', { name: 'Bring forward Ctrl + ↑' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Bring backward Ctrl + ↓' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Bring to front' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Bring to back' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete Del' }),
    ).toBeInTheDocument();
  });

  it('should reopen the context menu', async () => {
    render(<ElementContextMenu activeElementIds={['element-1']} />, {
      wrapper: Wrapper,
    });

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );

    // right click inside the element should open the context menu
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });
    expect(screen.getByRole('menu', { name: 'Element' })).toBeInTheDocument();

    // press ESC should dismiss it
    await userEvent.keyboard('[Escape]');
    expect(
      screen.queryByRole('menu', { name: 'Element' }),
    ).not.toBeInTheDocument();

    // another right click inside the element should open the context menu again
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });
    expect(screen.getByRole('menu', { name: 'Element' })).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ElementContextMenu activeElementIds={['id']} />,
      {
        wrapper: Wrapper,
      },
    );

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations for context menu', async () => {
    const { container } = render(
      <ElementContextMenu activeElementIds={['id']} />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should provide the correct keyboard shortcuts for a mac', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mac OS (jsdom)',
    );

    render(<ElementContextMenu activeElementIds={['element-1']} />, {
      wrapper: Wrapper,
    });

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(
      within(menu).getByRole('menuitem', { name: 'Bring forward ⌘ ↑' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Bring backward ⌘ ↓' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Bring to front' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Bring to back' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete ⌫' }),
    ).toBeInTheDocument();
  });

  it('should move element forward', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Bring forward/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-2',
      'element-1',
    ]);
  });

  it('should move element to top', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-0');
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Bring to front/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-2',
      'element-0',
    ]);
  });

  it('should move elements to top', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-0', 'element-1']);
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Bring to front/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([
      'element-2',
      'element-0',
      'element-1',
    ]);
  });

  it('should move element backward', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Bring backward/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-0',
      'element-2',
    ]);
  });

  it('should move element to bottom', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-2');
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Bring to back/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([
      'element-2',
      'element-0',
      'element-1',
    ]);
  });

  it('should move elements to bottom', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-1', 'element-2']);
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Bring to back/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-2',
      'element-0',
    ]);
  });

  it.each([
    ['should delete a single element', ['element-1']],
    ['should delete multiple elements', ['element-1', 'element-2']],
  ])('%s', async (_testname, elementIdsToBeDeleted) => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(elementIdsToBeDeleted);
    render(
      <ElementContextMenu
        activeElementIds={activeSlide.getActiveElementIds()}
      />,
      {
        wrapper: Wrapper,
      },
    );

    const contextMenuTarget = screen.getByTestId(
      'element-context-menu-container',
    );
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: contextMenuTarget,
    });

    const menu = screen.getByRole('menu', { name: 'Element' });
    const allElementIds = ['element-0', 'element-1', 'element-2'];

    expect(activeSlide.getElementIds()).toEqual(allElementIds);

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: /Delete/ }),
    );

    const remainingElementIds = allElementIds.filter(
      (e) => !elementIdsToBeDeleted.includes(e),
    );
    expect(activeSlide.getElementIds()).toEqual(remainingElementIds);
  });
});
