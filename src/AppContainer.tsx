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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import {
  MuiThemeProvider,
  MuiWidgetApiProvider,
} from '@matrix-widget-toolkit/mui';
import { Suspense } from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { PageLoader } from './components/common/PageLoader';
import { GuidedTourProvider } from './components/GuidedTour';
import { LayoutStateProvider } from './components/Layout';
import { DraggableStyles } from './components/Whiteboard';
import { WhiteboardHotkeysProvider } from './components/WhiteboardHotkeysProvider';
import { FontsLoadedContextProvider } from './lib';
import { WhiteboardManager, WhiteboardManagerProvider } from './state';
import { StoreType } from './store';

export const AppContainer = ({
  store,
  whiteboardManager,
  widgetApiPromise,
}: {
  widgetApiPromise: Promise<WidgetApi>;
  store: StoreType;
  whiteboardManager: WhiteboardManager;
}) => {
  return (
    <Provider store={store}>
      <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
        <MuiThemeProvider>
          {/* Only apply styles inside the MuiThemeProvider as the nonce is
              otherwise missing */}
          <DraggableStyles />

          <Suspense fallback={<PageLoader />}>
            <MuiWidgetApiProvider
              widgetApiPromise={widgetApiPromise}
              widgetRegistration={{
                name: 'NeoBoard',
                // "pad" suffix to get a custom icon
                type: 'net.nordeck.whiteboard:pad',
              }}
            >
              <FontsLoadedContextProvider>
                <LayoutStateProvider>
                  <WhiteboardHotkeysProvider>
                    <GuidedTourProvider>
                      <App />
                    </GuidedTourProvider>
                  </WhiteboardHotkeysProvider>
                </LayoutStateProvider>
              </FontsLoadedContextProvider>
            </MuiWidgetApiProvider>
          </Suspense>
        </MuiThemeProvider>
      </WhiteboardManagerProvider>
    </Provider>
  );
};
