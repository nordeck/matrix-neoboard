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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { from, fromEvent, map, Observable, switchMap, take, tap } from 'rxjs';
import { WhiteboardInstance } from '../../../state';

export function createWhiteboardPdf(params: {
  whiteboardInstance: WhiteboardInstance;
  roomName: string;
  authorName: string;
  widgetApi: WidgetApi;
}): Observable<Blob> {
  const whiteboardExport = params.whiteboardInstance.export(params.widgetApi);

  if (window.Worker) {
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Post the whiteboard instance to the worker and then return the blob that the worker sends back to us when it's done.
    // We must return an observable that emits the blob and then completes.
    // Ensure we also terminate the worker when we're done with it.
    // Also note that we need the whiteboardExport which is a promise and the resolved value must be passed to the worker.
    return from(whiteboardExport).pipe(
      switchMap((exportData) => {
        // Pass the whiteboard export data to the worker and wait for the worker to send back the blob.
        // If the worker sends back an error, we should throw it and stop the worker.
        // If the worker sends back the blob, we should return it. We should also stop the worker.

        // Create an observable that emits the blob when the worker sends it back.
        const stream = fromEvent<MessageEvent>(worker, 'message');

        // Note that we cant directly return the stream as it needs to be Observable<Blob> and not Observable<MessageEvent<Blob>
        worker.postMessage(exportData);
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
      }),
    );
  } else {
    // Async import pdf.local.ts and thn call renderPDF with the whiteboard export data which is a promise too.
    return from(import('./pdf.local')).pipe(
      switchMap(({ renderPDF }) =>
        from(whiteboardExport).pipe(switchMap(renderPDF)),
      ),
      take(1),
    );
  }
}
