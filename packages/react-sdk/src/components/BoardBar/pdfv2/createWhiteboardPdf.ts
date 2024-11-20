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
import { WhiteboardDocumentExport, WhiteboardInstance } from '../../../state';
import { conv2png } from '../pdf/utils';

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
    worker.onmessageerror = (e) => {
      console.error('Worker error', e);
      worker.terminate();
    }

    // Post the whiteboard instance to the worker and then return the blob that the worker sends back to us when it's done.
    // We must return an observable that emits the blob and then completes.
    // Ensure we also terminate the worker when we're done with it.
    // Also note that we need the whiteboardExport which is a promise and the resolved value must be passed to the worker.
    return from(whiteboardExport).pipe(
      switchMap((exportData) => {
        // Convert all images which are not png or jpeg to png
        exportData = convertAllImagesToPNG(exportData);

        // Pass the whiteboard export data to the worker and wait for the worker to send back the blob.
        // If the worker sends back an error, we should throw it and stop the worker.
        // If the worker sends back the blob, we should return it. We should also stop the worker.

        // Create an observable that emits the blob when the worker sends it back.
        const stream = fromEvent<MessageEvent>(worker, 'message');

        if (import.meta.hot) {
          // Delay the post message to the worker to ensure the worker is ready to receive it.
          new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
            console.log('Posting message to worker');
            worker.postMessage(exportData);
            return;
          }).catch((e) => {
            console.error('Error posting message to worker', e);
            worker.terminate();
          });
        } else {
          // Note that we cant directly return the stream as it needs to be Observable<Blob> and not Observable<MessageEvent<Blob>
          console.log('Posting message to worker');
          worker.postMessage(exportData);
        }
        return stream;
      }),
      map((e) => e.data),
      take(1),
      tap({
        finalize: () => {
          // terminate the worker
          worker.terminate();
        },
      }),
    );
  } else {
    // Async import pdf.local.ts and thn call renderPDF with the whiteboard export data which is a promise too.
    return from(import('./pdf.local')).pipe(
      switchMap(({ renderPDF }) =>
        from(whiteboardExport).pipe(switchMap((exportData) => {
          // Convert all images which are not png or jpeg to png
          exportData = convertAllImagesToPNG(exportData);
          return renderPDF(exportData);
        })),
      ),
      take(1),
    );
  }
}

function convertAllImagesToPNG(exportData: WhiteboardDocumentExport): WhiteboardDocumentExport {
  // Convert all images which are not png or jpeg to png
  exportData.whiteboard.slides.forEach((slide) => {
    slide.elements.forEach((element) => {
      if (element.type === 'image' && element.mimeType !== 'image/png') {
        const file = exportData.whiteboard.files?.find((f) => f.mxc === element.mxc);
        if (file) {
          const data = conv2png(element, file.data);
          file.data = data;
          element.mimeType = 'image/png';
        }
      }
    });
  });

  // Sanity check in debug mode. Report error if any image is not converted to png or jpeg.
  if (import.meta.env.MODE === 'development') {
    exportData.whiteboard.slides.forEach((slide) => {
      slide.elements.forEach((element) => {
        if (element.type === 'image' && element.mimeType !== 'image/png') {
          console.error('Image not converted to png or jpeg', element);
        }
      });
    });
  }

  return exportData;
}
