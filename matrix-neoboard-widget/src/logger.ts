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

import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

// Always make sure that you don't call getLogger in the global scope, otherwise
// it might be executed before the prefix is initialized here. Instead, prefer
// calling getLogger in functions or on class construction.
prefix.reg(log);
prefix.apply(log, {
  template: '!neoboard(%n):',
  nameFormatter(name) {
    return name || 'global';
  },
});

// Add global error handlers to redirect log messages into the prefixed format.
// This makes it easier to notice errors, even if you filter the console for the
// prefix only.
window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  if (event.message.startsWith('ResizeObserver loop limit exceeded')) {
    // This error can come up a lot, therefore we are ignoring it to avoid
    // spamming the console. The error is "save to ignore":
    // https://stackoverflow.com/a/50387233/218902
    return;
  }

  log.error(event.message, event.error);
});
