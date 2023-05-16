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

import {
  defer,
  delay,
  distinctUntilChanged,
  filter,
  fromEvent,
  merge,
  Observable,
  of,
} from 'rxjs';

export type DocumentVisibilityState = Document['visibilityState'];

/**
 * Observe the visibility state of the document. The returned observable is
 * triggered every time the visibility changes It is also triggered once at the
 * beginning and once as "hidden" once.
 * @param hiddenTimeout - Timeout until a "hidden" state is triggered, providing
 *                        a hysteresis when going into the hidden state.
 */
export function observeVisibilityState(
  hiddenTimeout: number
): Observable<DocumentVisibilityState> {
  const visibility = fromEvent(
    document,
    'visibilitychange',
    () => document.visibilityState
  );
  const visibilityVisible = visibility.pipe(filter((v) => v === 'visible'));
  const visibilityHidden = visibility.pipe(
    filter((v) => v === 'hidden'),
    // Is it still hidden after the timeout?
    delay(hiddenTimeout),
    filter(() => document.visibilityState === 'hidden')
  );

  return merge(
    // Always emit a start value
    defer(() => of(document.visibilityState)),
    visibilityVisible,
    visibilityHidden
  ).pipe(distinctUntilChanged());
}
