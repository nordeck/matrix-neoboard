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
import { AsyncState } from 'react-use/lib/useAsync';
import { STATE_EVENT_WHITEBOARD_SESSIONS, Whiteboard } from '../model';
import { useAppDispatch } from '../store';
import {
  selectAllWhiteboards,
  selectWhiteboardById,
  useCreateDocumentMutation,
  usePatchPowerLevelsMutation,
  useUpdateWhiteboardMutation,
  whiteboardApi,
} from '../store/api';

export function useOwnedWhiteboard(): AsyncState<StateEvent<Whiteboard>> {
  const widgetApi = useWidgetApi();
  const dispatch = useAppDispatch();
  const [createDocument] = useCreateDocumentMutation();
  const [updateWhiteboard] = useUpdateWhiteboardMutation();
  const [patchPowerLevels] = usePatchPowerLevelsMutation();

  const whiteboardState = useAsync(async () => {
    const whiteboardsState = await dispatch(
      whiteboardApi.endpoints.getWhiteboards.initiate(),
    ).unwrap();

    // TODO: Build UI to select the whiteboard to display it in the widget
    // For now we select the own / first whiteboard we find.
    let ownedWhiteboard =
      selectWhiteboardById(whiteboardsState, widgetApi.widgetId) ??
      first(selectAllWhiteboards(whiteboardsState));

    if (!ownedWhiteboard) {
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

      // TODO: We need to handle the case that only moderators in a room can
      // create/delete whiteboard.
      const documentId = (await createDocument().unwrap()).event.event_id;
      const result = await updateWhiteboard({
        whiteboardId: widgetApi.widgetId,
        content: {
          documentId,
        },
      }).unwrap();

      ownedWhiteboard = result.event;
    }

    return ownedWhiteboard;
  }, [dispatch, widgetApi.widgetId]);

  // TODO: We throw an error if the whiteboard selection/creation fails.
  //       This should be handled with a UI later.
  if (whiteboardState.error) {
    throw new Error(whiteboardState.error.message);
  }

  return whiteboardState;
}
