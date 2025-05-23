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
  mockPeerConnectionStatistics,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { mockRoomMember } from '../../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager, WhiteboardStatistics } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import * as constants from '../../Whiteboard/constants';
import { Collaborators } from './Collaborators';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<Collaborators>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let statistics: WhiteboardStatistics;
  let setPresentationMode: (enable: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    widgetApi.mockSendStateEvent(mockRoomMember({ state_key: '@user-id' }));
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-bob',
        content: {
          displayname: 'Bob',
        },
      }),
    );
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-charlie',
        content: {
          displayname: 'Charlie',
        },
      }),
    );
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-dave',
        content: {
          displayname: 'Dave',
        },
      }),
    );
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-erin',
        content: {
          displayname: 'Erin',
        },
      }),
    );
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-frank',
        content: {
          displayname: 'Frank',
        },
      }),
    );
    widgetApi.mockSendStateEvent(
      mockRoomMember({
        state_key: '@user-grace',
        content: {
          displayname: 'Grace',
        },
      }),
    );

    statistics = {
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: {
          'peer-0': mockPeerConnectionStatistics('@user-bob', 'connected'),
          'peer-1': mockPeerConnectionStatistics('@user-charlie', 'failed'),
          'peer-2': mockPeerConnectionStatistics('@user-dave', 'failed'),
          'peer-3': mockPeerConnectionStatistics('@user-erin', 'connected'),
          'peer-4': mockPeerConnectionStatistics('@user-frank', 'connected'),
          'peer-5': mockPeerConnectionStatistics('@user-grace', 'connected'),
          'peer-6': mockPeerConnectionStatistics('@user-heidi', 'connected'),
        },
        sessions: [
          {
            userId: '@user-bob',
            expiresTs: Date.now() + 1000,
            sessionId: 'session-0',
            whiteboardId: 'whiteboard-id',
          },
          {
            userId: '@user-charlie',
            expiresTs: Date.now() - 1000,
            sessionId: 'session-1',
            whiteboardId: 'whiteboard-id',
          },
          {
            userId: '@user-dave',
            expiresTs: Date.now() - 1000,
            sessionId: 'session-2',
            whiteboardId: 'whiteboard-id',
          },
          {
            userId: '@user-erin',
            expiresTs: Date.now() + 1000,
            sessionId: 'session-3',
            whiteboardId: 'whiteboard-id',
          },
          {
            userId: '@user-frank',
            expiresTs: Date.now() + 1000,
            sessionId: 'session-4',
            whiteboardId: 'whiteboard-id',
          },
          {
            userId: '@user-grace',
            expiresTs: Date.now() + 1000,
            sessionId: 'session-5',
            whiteboardId: 'whiteboard-id',
          },
          {
            userId: '@user-heidi',
            expiresTs: Date.now() + 1000,
            sessionId: 'session-6',
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      document: {
        contentSizeInBytes: 0,
        documentSizeInBytes: 0,
        snapshotOutstanding: false,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
    };

    const activeWhiteboardInstance =
      whiteboardManager.getActiveWhiteboardInstance()!;

    vi.spyOn(
      activeWhiteboardInstance,
      'getWhiteboardStatistics',
    ).mockImplementation(() => statistics);

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <Toolbar>{children}</Toolbar>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should always display the own user', async () => {
    render(<Collaborators />, { wrapper: Wrapper });

    const group = screen.getByRole('group', { name: 'Collaborators' });
    const ownAvatarButton = await within(group).findByRole('button', {
      name: 'Alice (You)',
    });

    // The "presentation" role is searched for here, as the image has an empty alt tag.
    // https://www.w3.org/TR/html-aria/#docconformance
    expect(
      within(ownAvatarButton).getByRole('presentation', { hidden: true }),
    ).toHaveAttribute(
      'src',
      expect.stringMatching(/\/_matrix\/media\/r0\/thumbnail\/alice/i),
    );
  });

  it('should always display the presenter in presentation mode', async () => {
    setPresentationMode(true);

    render(<Collaborators />, { wrapper: Wrapper });

    const group = screen.getByRole('group', { name: 'Collaborators' });

    await act(async () => {
      expect(
        within(group).getByRole('button', {
          name: '@user-alice is presenting',
        }),
      ).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<Collaborators />, { wrapper: Wrapper });

    await act(async () => {
      expect(await axe.run(container)).toHaveNoViolations();
    });
  });

  describe('WebRTC P2P mode', () => {
    it('should show active users', async () => {
      statistics.communicationChannel.peerConnections = {
        'peer-0': mockPeerConnectionStatistics('@user-bob', 'connected'),
        'peer-1': mockPeerConnectionStatistics('@user-charlie', 'failed'),
        'peer-2': mockPeerConnectionStatistics('@user-dave', 'failed'),
        'peer-3': mockPeerConnectionStatistics('@user-erin', 'connected'),
      };

      render(<Collaborators />, { wrapper: Wrapper });

      const group = screen.getByRole('group', { name: 'Collaborators' });

      await waitFor(() => {
        expect(
          within(group)
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label')),
        ).toEqual(['Alice (You)', 'Bob', 'Erin']);
      });
    });

    it('should show more button for more than six users', async () => {
      render(<Collaborators />, { wrapper: Wrapper });

      const group = screen.getByRole('group', { name: 'Collaborators' });
      const moreButton = within(group).getByRole('button', {
        name: 'One further collaborator',
      });

      expect(moreButton).toHaveTextContent('+1');

      await userEvent.click(moreButton);

      const menu = screen.getByRole('menu', {
        name: 'One further collaborator',
      });

      expect(
        within(menu).getByRole('menuitem', { name: '@user-heidi' }),
      ).toBeInTheDocument();

      await userEvent.keyboard('[Space]');

      await waitFor(() => {
        expect(menu).not.toBeInTheDocument();
      });
    });

    it('should show more button for more users', async () => {
      statistics.communicationChannel.peerConnections = {
        'peer-0': mockPeerConnectionStatistics('@user-bob', 'connected'),
        'peer-1': mockPeerConnectionStatistics('@user-charlie', 'failed'),
        'peer-2': mockPeerConnectionStatistics('@user-dave', 'connected'),
        'peer-3': mockPeerConnectionStatistics('@user-erin', 'connected'),
        'peer-4': mockPeerConnectionStatistics('@user-frank', 'connected'),
        'peer-5': mockPeerConnectionStatistics('@user-grace', 'connected'),
        'peer-6': mockPeerConnectionStatistics('@user-heidi', 'connected'),
      };

      render(<Collaborators />, { wrapper: Wrapper });

      const group = screen.getByRole('group', { name: 'Collaborators' });
      const moreButton = within(group).getByRole('button', {
        name: '2 further collaborators',
      });

      expect(moreButton).toHaveTextContent('+2');

      await userEvent.click(moreButton);

      const menu = screen.getByRole('menu', {
        name: '2 further collaborators',
      });

      expect(
        within(menu).getByRole('menuitem', { name: 'Grace' }),
      ).toBeInTheDocument();
      expect(
        within(menu).getByRole('menuitem', { name: '@user-heidi' }),
      ).toBeInTheDocument();

      await userEvent.keyboard('[Escape]');

      await waitFor(() => {
        expect(menu).not.toBeInTheDocument();
      });
    });
  });

  describe('MatrixRTC mode', () => {
    beforeEach(() => {
      vi.spyOn(constants, 'matrixRtcMode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should show active users', async () => {
      statistics.communicationChannel.sessions = [
        {
          userId: '@user-bob',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-0',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-charlie',
          expiresTs: Date.now() - 1000,
          sessionId: 'session-1',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-dave',
          expiresTs: Date.now() - 1000,
          sessionId: 'session-2',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-erin',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-3',
          whiteboardId: 'whiteboard-id',
        },
      ];

      render(<Collaborators />, { wrapper: Wrapper });

      const group = screen.getByRole('group', { name: 'Collaborators' });

      await waitFor(() => {
        expect(
          within(group)
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label')),
        ).toEqual(['Alice (You)', 'Bob', 'Erin']);
      });
    });

    it('should show more button for more than six users', async () => {
      render(<Collaborators />, { wrapper: Wrapper });

      const group = screen.getByRole('group', { name: 'Collaborators' });
      const moreButton = within(group).getByRole('button', {
        name: 'One further collaborator',
      });

      expect(moreButton).toHaveTextContent('+1');

      await userEvent.click(moreButton);

      const menu = screen.getByRole('menu', {
        name: 'One further collaborator',
      });

      expect(
        within(menu).getByRole('menuitem', { name: '@user-heidi' }),
      ).toBeInTheDocument();

      await userEvent.keyboard('[Space]');

      await waitFor(() => {
        expect(menu).not.toBeInTheDocument();
      });
    });

    it('should show more button for more users', async () => {
      statistics.communicationChannel.sessions = [
        {
          userId: '@user-bob',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-0',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-charlie',
          expiresTs: Date.now() - 1000,
          sessionId: 'session-1',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-dave',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-2',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-erin',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-3',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-frank',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-4',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-grace',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-5',
          whiteboardId: 'whiteboard-id',
        },
        {
          userId: '@user-heidi',
          expiresTs: Date.now() + 1000,
          sessionId: 'session-6',
          whiteboardId: 'whiteboard-id',
        },
      ];

      render(<Collaborators />, { wrapper: Wrapper });

      const group = screen.getByRole('group', { name: 'Collaborators' });
      const moreButton = within(group).getByRole('button', {
        name: '2 further collaborators',
      });

      expect(moreButton).toHaveTextContent('+2');

      await userEvent.click(moreButton);

      const menu = screen.getByRole('menu', {
        name: '2 further collaborators',
      });

      expect(
        within(menu).getByRole('menuitem', { name: 'Grace' }),
      ).toBeInTheDocument();
      expect(
        within(menu).getByRole('menuitem', { name: '@user-heidi' }),
      ).toBeInTheDocument();

      await userEvent.keyboard('[Escape]');

      await waitFor(() => {
        expect(menu).not.toBeInTheDocument();
      });
    });
  });
});
