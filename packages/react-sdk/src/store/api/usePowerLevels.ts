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
  calculateUserPowerLevel,
  hasStateEventPower,
  STATE_EVENT_POWER_LEVELS,
  UserPowerLevelType,
} from '@matrix-widget-toolkit/api';
import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { STATE_EVENT_WHITEBOARD } from '../../model';
import {
  useGetCreateEventQuery,
  useGetPowerLevelsQuery,
} from './powerLevelsApi';

export type PowerLevels = {
  canInitializeWhiteboard: boolean | undefined;
  canImportWhiteboard: boolean | undefined;
  canStopPresentation: boolean | undefined;
};

export function usePowerLevels({
  userId,
}: { userId?: string } = {}): PowerLevels {
  const { data: powerLevels, isLoading: isLoadingPowerLevels } =
    useGetPowerLevelsQuery();
  const { data: createEvent, isLoading: isLoadingCreateEvent } =
    useGetCreateEventQuery();
  const isLoading = isLoadingPowerLevels || isLoadingCreateEvent;
  const widgetApi = useWidgetApi();
  userId ??= widgetApi.widgetParameters.userId;

  let canInitializeWhiteboard: boolean | undefined = undefined;
  let canImportWhiteboard: boolean | undefined = undefined;
  let canStopPresentation: boolean | undefined = undefined;

  if (!isLoading && powerLevels) {
    const powerContent = powerLevels.event?.content;
    const userPowerLevel =
      calculateUserPowerLevel(powerContent, createEvent?.event, userId ?? '') ??
      0;
    const canModerate = compareUserPowerLevelToNormalPowerLevel(
      userPowerLevel,
      50,
    );

    canInitializeWhiteboard =
      hasStateEventPower(
        powerContent,
        createEvent?.event,
        userId,
        STATE_EVENT_POWER_LEVELS,
      ) &&
      hasStateEventPower(
        powerContent,
        createEvent?.event,
        userId,
        STATE_EVENT_WHITEBOARD,
      );
    canImportWhiteboard = canModerate;
    canStopPresentation = canModerate;
  }

  return {
    canInitializeWhiteboard,
    canImportWhiteboard,
    canStopPresentation,
  };
}

// TODO: We should fix toolkit to instead export this method and then use it from toolkit.
const ROOM_VERSION_12_CREATOR = 'ROOM_VERSION_12_CREATOR';

// TODO: We should fix toolkit to instead export this method and then use it from toolkit.
function compareUserPowerLevelToNormalPowerLevel(
  userPowerLevel: UserPowerLevelType,
  normalPowerLevel: number,
): boolean {
  if (userPowerLevel === ROOM_VERSION_12_CREATOR) {
    // Room version 12 creator has the highest power level.
    return true;
  }
  if (typeof userPowerLevel !== 'number') {
    // If the user power level is not a number, we cannot compare it to a normal power level.
    return false;
  }
  // Compare the user power level to the normal power level.
  return userPowerLevel >= normalPowerLevel;
}
