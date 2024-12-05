/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { DeveloperToolsDialog } from './DeveloperToolsDialog';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.baseUrl = 'https://example.com';
});

describe('<DeveloperToolsDialog/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  const onClose = vi.fn();

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <LayoutStateProvider>{children}</LayoutStateProvider>
        </WhiteboardTestingContextProvider>
      );
    };
  });

  it('should render without exploding', async () => {
    render(<DeveloperToolsDialog open handleClose={onClose} />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('dialog', {
        name: 'Developer Tools',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Document Sync Statistics (Snapshots)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Communication Channel Statistics (WRTC)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { baseElement } = render(
      <DeveloperToolsDialog open handleClose={onClose} />,
      { wrapper: Wrapper },
    );

    // the popover is opened in a portal, so we check the baseElement, i.e. <body/>.
    await act(async () => {
      expect(await axe.run(baseElement)).toHaveNoViolations();
    });
  });

  it('should close dialog on close', async () => {
    render(<DeveloperToolsDialog open handleClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should open and close the "Document Sync Statistics (Snapshots)" accordion when clicked', async () => {
    render(<DeveloperToolsDialog open handleClose={onClose} />, {
      wrapper: Wrapper,
    });

    const documentSyncAccordion = screen.getByRole('button', {
      name: 'Document Sync Statistics (Snapshots)',
    });

    await userEvent.click(documentSyncAccordion);

    await waitFor(() => {
      expect(documentSyncAccordion).toHaveAttribute('aria-expanded', 'true');
    });

    await userEvent.click(documentSyncAccordion);

    await waitFor(() => {
      expect(documentSyncAccordion).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('should open and close the "Communication Channel Statistics (WRTC)" accordion when clicked', async () => {
    render(<DeveloperToolsDialog open handleClose={onClose} />, {
      wrapper: Wrapper,
    });

    const communicationChannelAccordion = screen.getByRole('button', {
      name: 'Communication Channel Statistics (WRTC)',
    });

    await userEvent.click(communicationChannelAccordion);

    await waitFor(() => {
      expect(communicationChannelAccordion).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    await userEvent.click(communicationChannelAccordion);

    await waitFor(() => {
      expect(communicationChannelAccordion).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });

  it('should open and close the "Sessions" accordion when clicked', async () => {
    render(<DeveloperToolsDialog open handleClose={onClose} />, {
      wrapper: Wrapper,
    });

    const sessionsAccordion = screen.getByRole('button', {
      name: 'Sessions',
    });

    await userEvent.click(sessionsAccordion);

    await waitFor(() => {
      expect(sessionsAccordion).toHaveAttribute('aria-expanded', 'true');
    });

    await userEvent.click(sessionsAccordion);

    await waitFor(() => {
      expect(sessionsAccordion).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
