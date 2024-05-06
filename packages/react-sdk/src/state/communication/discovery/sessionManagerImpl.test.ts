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
import { waitFor } from '@testing-library/react';
import { firstValueFrom, take, toArray } from 'rxjs';
import { mockWhiteboardSessions } from '../../../lib/testUtils/matrixTestUtils';
import { WhiteboardSession } from '../../../model';
import { SessionManagerImpl } from './sessionManagerImpl';

describe('SessionManagerImpl', () => {
  const sessionTimeout = 60 * 1000;
  let widgetApi: MockedWidgetApi;
  let sessionManager: SessionManagerImpl;

  afterEach(() => {
    jest.useRealTimers();

    widgetApi.stop();
  });

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => +new Date('2023-02-01T10:11:12.345Z'));

    sessionManager = new SessionManagerImpl(widgetApi, sessionTimeout, 100);
  });

  it('should join a whiteboard', async () => {
    const { sessionId } = await sessionManager.join('whiteboard-id');

    expect(sessionId).toEqual(expect.any(String));
    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 1675246332345,
            sessionId,
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
    expect(sessionManager.getSessions()).toEqual([]);
  });

  it('should join another whiteboard', async () => {
    const { sessionId: firstSessionId } =
      await sessionManager.join('whiteboard-id-0');

    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 1675246332345,
            sessionId: firstSessionId,
            whiteboardId: 'whiteboard-id-0',
          },
        ],
      },
      { stateKey: '@user-id' },
    );

    const { sessionId: secondSessionId } =
      await sessionManager.join('whiteboard-id-1');

    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 1675246332345,
            sessionId: secondSessionId,
            whiteboardId: 'whiteboard-id-1',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
  });

  it('should keep own existing sessions while joining', async () => {
    widgetApi.mockSendStateEvent(mockWhiteboardSessions());

    const { sessionId } = await sessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 2525599520143,
            sessionId: 'session-id',
            whiteboardId: 'whiteboard-id',
          },
          {
            expiresTs: 1675246332345,
            sessionId,
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
  });

  it('should cleanup own expired sessions while joining', async () => {
    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({
        sessions: [
          {
            expiresTs: +new Date('2010-01-12T11:25:20.143Z'),
            sessionId: 'session-id',
            whiteboardId: 'whiteboard-id',
          },
        ],
      }),
    );

    const { sessionId } = await sessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 1675246332345,
            sessionId,
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
  });

  it('should update own session if it is about to timeout', async () => {
    jest.spyOn(Date, 'now').mockRestore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-02-01T10:11:12.345Z'));

    const { sessionId } = await sessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toBeCalledTimes(1);

    jest.advanceTimersByTime(sessionTimeout * 0.8);

    await waitFor(() => expect(widgetApi.sendStateEvent).toBeCalledTimes(2));

    expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
      2,
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: expect.any(Number),
            sessionId,
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
  });

  it('should handle invalid session event while joining', async () => {
    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({
        // Invalid session event
        sessions: [{} as WhiteboardSession],
      }),
    );

    const { sessionId } = await sessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 1675246332345,
            sessionId,
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
  });

  it('should handle new sessions while joining', async () => {
    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user' }),
    );

    const joinedPromise = firstValueFrom(
      sessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );
    await sessionManager.join('whiteboard-id');

    await expect(joinedPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@another-user' },
    ]);
  });

  it('should handle new sessions joining a whiteboard', async () => {
    const joinedPromise = firstValueFrom(
      sessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );
    await sessionManager.join('whiteboard-id');

    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user' }),
    );

    await expect(joinedPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@another-user' },
    ]);
  });

  it('should handle sessions leaving a whiteboard', async () => {
    const leftPromise = firstValueFrom(
      sessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user' }),
    );

    await sessionManager.join('whiteboard-id');

    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user', sessions: [] }),
    );

    await expect(leftPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@another-user' },
    ]);
  });

  it('should handle expiring sessions', async () => {
    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user' }),
    );

    await sessionManager.join('whiteboard-id');

    const leftPromise = firstValueFrom(
      sessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => +new Date('2050-01-12T12:00:00.000Z'));

    await expect(leftPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@another-user' },
    ]);
  });

  it('should handle updated sessions', async () => {
    await sessionManager.join('whiteboard-id');

    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user' }),
    );
    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@expiring-user' }),
    );

    const leftPromise = firstValueFrom(
      sessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({
        state_key: '@another-user',
        sessions: [
          {
            expiresTs: +new Date('2060-01-12T11:25:20.143Z'),
            sessionId: 'session-id',
            whiteboardId: 'whiteboard-id',
          },
        ],
      }),
    );

    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => +new Date('2050-01-12T12:00:00.000Z'));

    await expect(leftPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@expiring-user' },
    ]);
  });

  it('should ignore invalid sessions events', async () => {
    const joinedPromise = firstValueFrom(
      sessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );

    await sessionManager.join('whiteboard-id');

    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({
        // Invalid event
        sessions: {} as [],
        state_key: '@invalid-user',
      }),
    );
    widgetApi.mockSendStateEvent(
      mockWhiteboardSessions({ state_key: '@another-user' }),
    );

    await expect(joinedPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@another-user' },
    ]);
  });

  it('should leave a whiteboard', async () => {
    widgetApi.mockSendStateEvent(mockWhiteboardSessions());

    await sessionManager.join('whiteboard-id');

    const leftPromise = firstValueFrom(
      sessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    await sessionManager.leave();

    await expect(leftPromise).resolves.toEqual([
      { sessionId: 'session-id', userId: '@user-id' },
    ]);

    expect(sessionManager.getSessions()).toEqual([]);
    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard.sessions',
      {
        sessions: [
          {
            expiresTs: 2525599520143,
            sessionId: 'session-id',
            whiteboardId: 'whiteboard-id',
          },
        ],
      },
      { stateKey: '@user-id' },
    );
  });

  it('should close observables', async () => {
    const joinedPromise = firstValueFrom(
      sessionManager.observeSessionJoined().pipe(toArray()),
    );
    const leftPromise = firstValueFrom(
      sessionManager.observeSessionJoined().pipe(toArray()),
    );

    sessionManager.destroy();

    await expect(joinedPromise).resolves.toEqual([]);
    await expect(leftPromise).resolves.toEqual([]);
  });
});
