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
import { useTranslation } from 'react-i18next';
import { Layout } from './components/Layout';
import { PageLoader } from './components/common/PageLoader';
import { useOwnedWhiteboard, useWhiteboardManager } from './state';

export const App = () => {
  const { t } = useTranslation();
  const { value, loading } = useOwnedWhiteboard();
  const whiteboardManager = useWhiteboardManager();
  const ownUserId = useWidgetApi().widgetParameters.userId;

  if (!ownUserId) {
    throw new Error('Unknown user id');
  }

  if (
    !loading &&
    value.type === 'whiteboard' &&
    value.event &&
    whiteboardManager.getActiveWhiteboardInstance() === undefined
  ) {
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

  return <Layout />;
};
