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

import { WidgetApiImpl } from '@matrix-widget-toolkit/api';
import {
  createStore,
  mockWhiteboardManager,
} from '@nordeck/matrix-neoboard-react-sdk';
import { render, screen } from '@testing-library/react';
import { AppContainer } from './AppContainer';

describe('AppContainer', () => {
  it('should render error message', async () => {
    const widgetApi = WidgetApiImpl.create();

    const store = createStore({ widgetApi });
    const { whiteboardManager } = mockWhiteboardManager();

    render(
      <AppContainer
        widgetApiPromise={widgetApi}
        store={store}
        whiteboardManager={whiteboardManager}
      />,
    );

    await expect(
      screen.findByText(/only runs as a widget/i),
    ).resolves.toBeInTheDocument();
  });
});
