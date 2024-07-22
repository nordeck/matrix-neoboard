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

import { StateEvent } from '@matrix-widget-toolkit/api';
import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { first } from 'lodash';
import loglevel from 'loglevel';
import { useAsync } from 'react-use';
import { STATE_EVENT_WHITEBOARD_SESSIONS, Whiteboard } from '../model';
import { useAppDispatch } from '../store';
import {
  selectAllWhiteboards,
  selectWhiteboardById,
  useCreateDocumentMutation,
  useGetWhiteboardsQuery,
  usePatchPowerLevelsMutation,
  useUpdateWhiteboardMutation,
} from '../store/api';
import { usePowerLevels } from '../store/api/usePowerLevels';

type UseOwnedWhiteboardResponse =
  | { loading: true; value?: undefined }
  | {
      loading: false;
      value:
        | {
            type: 'whiteboard';
            event?: StateEvent<Whiteboard>; // undefined if board initialization is allowed but not happened yet
          }
        | {
            type: 'waiting';
          };
    };

export function useOwnedWhiteboard(): UseOwnedWhiteboardResponse {
  const widgetApi = useWidgetApi();
  const dispatch = useAppDispatch();
  const [createDocument] = useCreateDocumentMutation();
  const [updateWhiteboard] = useUpdateWhiteboardMutation();
  const [patchPowerLevels] = usePatchPowerLevelsMutation();
  const { canInitializeWhiteboard } = usePowerLevels();

  const {
    data: whiteboardsState,
    isLoading,
    isError,
  } = useGetWhiteboardsQuery();

  // TODO: Build UI to select the whiteboard to display it in the widget
  // For now we select the own / first whiteboard we find.
  const whiteboard = whiteboardsState
    ? (selectWhiteboardById(whiteboardsState, widgetApi.widgetId) ??
      first(selectAllWhiteboards(whiteboardsState)))
    : undefined;

  const {
    value: updatedWhiteboard,
    loading,
    error,
  } = useAsync(async () => {
    if (canInitializeWhiteboard && !whiteboard && !isLoading && !isError) {
      try {
        // TODO: We only set the power level once, if it's later changed we can't
        // handle it. It would be better to show a UI to a moderator to repair
        // the power level setting if it is wrong.
        await patchPowerLevels({
          changes: {
            events: {
              [STATE_EVENT_WHITEBOARD_SESSIONS]: 0,
            },
          },
        }).unwrap();
      } catch (err) {
        loglevel.error('could not configure power level', err);
      }

      const documentId = (await createDocument().unwrap()).event.event_id;
      const result = await updateWhiteboard({
        whiteboardId: widgetApi.widgetId,
        content: {
          documentId,
        },
      }).unwrap();

      return result.event;
    }

    return whiteboard;
  }, [
    dispatch,
    widgetApi.widgetId,
    whiteboard,
    isLoading,
    isError,
    !!canInitializeWhiteboard,
  ]);

  if (isError) {
    throw new Error('could not load whiteboards');
  } else if (error) {
    // TODO: We throw an error if the whiteboard selection/creation fails.
    //       This should be handled with a UI later.
    throw new Error(error.message);
  } else if (canInitializeWhiteboard === undefined || isLoading || loading) {
    return { loading: true };
  }

  return {
    loading: false,
    value:
      !canInitializeWhiteboard && !updatedWhiteboard
        ? {
            type: 'waiting',
          }
        : {
            type: 'whiteboard',
            event: updatedWhiteboard,
          },
  };
}
