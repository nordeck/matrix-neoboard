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

import {
  hasStateEventPower,
  PowerLevelsStateEvent,
  STATE_EVENT_POWER_LEVELS,
} from '@matrix-widget-toolkit/api';
import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { STATE_EVENT_WHITEBOARD } from '../../model';
import { useGetPowerLevelsQuery } from './powerLevelsApi';

export type PowerLevels = {
  canInitializeWhiteboard: boolean | undefined;
  canImportWhiteboard: boolean | undefined;
  canStopPresentation: boolean | undefined;
};

export function usePowerLevels({
  userId,
}: { userId?: string } = {}): PowerLevels {
  const { data: powerLevels, isLoading } = useGetPowerLevelsQuery();
  const widgetApi = useWidgetApi();
  userId ??= widgetApi.widgetParameters.userId;

  let canInitializeWhiteboard: boolean | undefined = undefined;
  let canImportWhiteboard: boolean | undefined = undefined;
  let canStopPresentation: boolean | undefined = undefined;

  if (!isLoading && powerLevels) {
    const powerContent = powerLevels.event?.content;
    const userPowerLevel = getUserPowerLevel(userId, powerContent) ?? 0;
    const canModerate = userPowerLevel >= 50;

    canInitializeWhiteboard =
      hasStateEventPower(powerContent, userId, STATE_EVENT_POWER_LEVELS) &&
      hasStateEventPower(powerContent, userId, STATE_EVENT_WHITEBOARD);
    canImportWhiteboard = canModerate;
    canStopPresentation = canModerate;
  }

  return {
    canInitializeWhiteboard,
    canImportWhiteboard,
    canStopPresentation,
  };
}

export const getUserPowerLevel = (
  userId: string | undefined,
  powerLevel: PowerLevelsStateEvent | undefined,
): number | undefined => {
  if (!powerLevel || !userId) {
    return undefined;
  }
  if (powerLevel?.users && userId in powerLevel.users) {
    return powerLevel?.users[userId];
  } else {
    return powerLevel.users_default;
  }
};
