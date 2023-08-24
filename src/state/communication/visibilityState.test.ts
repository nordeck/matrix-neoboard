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

import { waitFor } from '@testing-library/react';
import { firstValueFrom, Observable, Subject, takeUntil } from 'rxjs';
import { mockDocumentVisibilityState } from '../../lib/testUtils/domTestUtils';
import {
  DocumentVisibilityState,
  observeVisibilityState,
} from './visibilityState';

describe('observeVisibilityState', () => {
  let untilSubject: Subject<void>;
  let observable: Observable<DocumentVisibilityState>;

  beforeEach(() => {
    mockDocumentVisibilityState('visible');

    untilSubject = new Subject();
    observable = observeVisibilityState(250);
  });

  it('should emit the current value first', async () => {
    const eventsPromise = firstValueFrom(observable);

    await expect(eventsPromise).resolves.toEqual('visible');
  });

  it('should emit hidden if the document gets hidden', async () => {
    const events: DocumentVisibilityState[] = [];
    observable.pipe(takeUntil(untilSubject)).subscribe((e) => events.push(e));

    mockDocumentVisibilityState('hidden');

    await waitFor(() => expect(events).toEqual(['visible', 'hidden']));

    untilSubject.next();
  });

  it('should not emit hidden if the document gets hidden for a short time', async () => {
    const events: DocumentVisibilityState[] = [];
    observable.pipe(takeUntil(untilSubject)).subscribe((e) => events.push(e));

    mockDocumentVisibilityState('hidden');
    mockDocumentVisibilityState('visible');

    untilSubject.next();

    await waitFor(() => expect(events).toEqual(['visible']));
  });

  it('should emit visible if the document was hidden previously', async () => {
    const events: DocumentVisibilityState[] = [];
    observable.pipe(takeUntil(untilSubject)).subscribe((e) => events.push(e));

    mockDocumentVisibilityState('hidden');

    await waitFor(() => expect(events).toEqual(['visible', 'hidden']));

    mockDocumentVisibilityState('visible');

    untilSubject.next();

    await waitFor(() =>
      expect(events).toEqual(['visible', 'hidden', 'visible']),
    );
  });
});
