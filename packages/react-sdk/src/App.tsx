/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { getLogger } from 'loglevel';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, LayoutProps } from './components/Layout';
import { PageLoader } from './components/common/PageLoader';
import {
  isValidWhiteboardDocumentSnapshot,
  useActiveWhiteboardInstance,
  useOwnedWhiteboard,
  useWhiteboardManager,
} from './state';
import {
  cancelableSnapshotTimer,
  usePersistOnJoinOrInvite,
} from './state/usePersistOnJoinOrInvite';
import { useGetDocumentSnapshotQuery } from './store/api';

export type AppProps = {
  layoutProps?: LayoutProps;
};

const logger = getLogger('App');

export const App = ({ layoutProps }: AppProps) => {
  const { t } = useTranslation('neoboard');
  const { value, loading } = useOwnedWhiteboard();
  const whiteboardManager = useWhiteboardManager();
  const whiteboardInstance = useActiveWhiteboardInstance();
  const widgetApi = useWidgetApi();
  const ownUserId = widgetApi.widgetParameters.userId;
  const { limitedHistoryVisibility, delayedPersist, lastMembershipEventTs } =
    usePersistOnJoinOrInvite();
  const { data: latestSnapshot } = useGetDocumentSnapshotQuery({
    documentId: whiteboardInstance.getDocumentId(),
    validator: isValidWhiteboardDocumentSnapshot,
  });

  const handlePersist = useCallback(() => {
    if (latestSnapshot !== undefined && lastMembershipEventTs !== undefined) {
      if (latestSnapshot.event.origin_server_ts < lastMembershipEventTs) {
        logger.debug('Saving snapshot due to membership updates');
        whiteboardInstance.persist(true);
      }
    }
  }, [latestSnapshot, lastMembershipEventTs, whiteboardInstance]);

  useEffect(() => {
    // We don't need to do anything if we're not in a room with limited history visibility
    // or the whiteboard is still loading
    if (!limitedHistoryVisibility || whiteboardInstance.isLoading()) {
      return;
    }

    // We're in a room with limited history visibility, so we check
    // if a snapshot is required after recent membership changes (invites+joins)
    if (latestSnapshot !== undefined && lastMembershipEventTs !== undefined) {
      // Is the snapshot outdated when compared to the last membership event?
      if (latestSnapshot.event.origin_server_ts < lastMembershipEventTs) {
        // We don't delay persisting if the membership event was sent by the current user
        if (!delayedPersist) {
          logger.debug(
            'Saving snapshot immediately due to current user sending the membership event',
          );

          whiteboardInstance.persist(true);
        } else {
          // Start a cancelable timer to persist the snapshot after a random delay
          // If other clients run this earlier and send a snapshot, we don't need to persist
          const delay = Math.floor(Math.random() * 20) + 10;
          const timer = cancelableSnapshotTimer(handlePersist, delay * 1000);
          logger.debug(
            'Will try to save a snapshot in ',
            delay,
            's due to membership updates',
          );

          // cancel the timer if the component unmounts or the dependencies change
          return () => {
            logger.debug('Canceled delayed snapshot persistence timer');
            timer.cancel();
          };
        }
      } else {
        logger.debug(
          'We have a fresh snapshot after membership updates, no need to persist',
        );
      }
    }
    return;
  }, [
    delayedPersist,
    handlePersist,
    lastMembershipEventTs,
    latestSnapshot,
    limitedHistoryVisibility,
    loading,
    whiteboardInstance,
    widgetApi,
  ]);

  if (!ownUserId) {
    throw new Error('Unknown user id');
  }

  if (!loading && value.type === 'whiteboard' && value.event) {
    whiteboardManager.selectActiveWhiteboardInstance(value.event, ownUserId);
  }

  if (
    loading ||
    (value.type === 'whiteboard' && !value.event) ||
    value.type === 'waiting'
  ) {
    return (
      <PageLoader
        text={
          value?.type === 'waiting'
            ? t('app.waitModeratorJoin', 'Wait for the moderator to join.')
            : undefined
        }
      />
    );
  }

  return <Layout {...layoutProps} />;
};
