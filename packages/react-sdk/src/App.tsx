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
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactSdkThemeProvider } from './ReactSdkThemeProvider';
import { Layout, LayoutProps } from './components/Layout';
import { PageLoader } from './components/common/PageLoader';
import {
  useActiveWhiteboardInstance,
  useOwnedWhiteboard,
  useWhiteboardManager,
} from './state';

export type AppProps = {
  layoutProps?: LayoutProps;
};

export const App = ({ layoutProps }: AppProps) => {
  const { t } = useTranslation('neoboard');
  const { value, loading } = useOwnedWhiteboard();
  const whiteboardManager = useWhiteboardManager();
  const activeWhiteboard = useActiveWhiteboardInstance(false);
  const ownUserId = useWidgetApi().widgetParameters.userId;

  if (!ownUserId) {
    throw new Error('Unknown user id');
  }

  useEffect(() => {
    if (!loading && value.type === 'whiteboard' && value.event) {
      whiteboardManager.selectActiveWhiteboardInstance(value.event, ownUserId);
    }
  }, [loading, ownUserId, value, whiteboardManager]);

  if (activeWhiteboard !== undefined && value?.type !== 'waiting') {
    // Show the whiteboard if there is one and we are not waiting for a moderator
    return (
      <ReactSdkThemeProvider>
        <Layout {...layoutProps} />
      </ReactSdkThemeProvider>
    );
  }

  return (
    <PageLoader
      text={
        value?.type === 'waiting'
          ? t('app.waitModeratorJoin', 'Wait for the moderator to join.')
          : undefined
      }
    />
  );
};
