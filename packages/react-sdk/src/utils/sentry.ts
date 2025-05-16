/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import {
  browserTracingIntegration,
  init,
  replayIntegration,
} from '@sentry/react';

const sentryDSN = getEnvironment('REACT_APP_SENTRY_DSN');
if (!sentryDSN) {
  console.warn(
    'Sentry DSN is not set. Sentry will not be initialized. Please set the REACT_APP_SENTRY_DSN environment variable.',
  );
} else {
  const tracePropagationTargets = getEnvironment(
    'REACT_APP_SENTRY_TRACE_PROPAGATION_TARGETS',
  );
  const listOfTracePropagationTargets = tracePropagationTargets?.split(',');

  init({
    dsn: sentryDSN,

    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#sendDefaultPii
    sendDefaultPii: false,

    integrations: [browserTracingIntegration(), replayIntegration()],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,

    // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
    tracePropagationTargets: listOfTracePropagationTargets
      ? listOfTracePropagationTargets.map((regex) => new RegExp(regex))
      : undefined,

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
