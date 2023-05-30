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

import { from, fromEvent, map, Observable, switchMap, take, tap } from 'rxjs';
import { WhiteboardInstance } from '../../../state';
import { createWhiteboardPdfDefinition } from './createWhiteboardPdfDefinition';

export function createWhiteboardPdf(params: {
  whiteboardInstance: WhiteboardInstance;
  roomName: string;
  authorName: string;
}): Observable<Blob> {
  const contentObservable = from(createWhiteboardPdfDefinition(params));

  if (window.Worker) {
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url));

    return contentObservable.pipe(
      switchMap((content) => {
        const stream = fromEvent<MessageEvent<Blob>>(worker, 'message');

        worker.postMessage(content);
        return stream;
      }),
      map((e) => e.data),
      take(1),
      tap({
        unsubscribe: () => {
          // terminate the worker early
          worker.terminate();
        },
        complete: () => {
          // terminate the worker when ready
          worker.terminate();
        },
      })
    );
  } else {
    return from(import('./pdf.local')).pipe(
      switchMap(({ generatePdf }) =>
        contentObservable.pipe(switchMap(generatePdf))
      ),
      take(1)
    );
  }
}
