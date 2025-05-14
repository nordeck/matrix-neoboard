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

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RemoveIcon from '@mui/icons-material/Remove';

export type LineMarkerPosition = 'start' | 'end';

export type LineMarkerType = {
  name: string;
  value: string;
  icon: React.ElementType;
  position: LineMarkerPosition;
};

export const LINE_MARKER_TYPES: LineMarkerType[] = [
  {
    name: 'None',
    value: 'none',
    icon: RemoveIcon,
    position: 'start',
  },
  {
    name: 'None',
    value: 'none',
    icon: RemoveIcon,
    position: 'end',
  },
  {
    name: 'Arrow Back',
    value: 'arrow-head-line',
    icon: ArrowBackIcon,
    position: 'start',
  },
  {
    name: 'Arrow Forward',
    value: 'arrow-head-line',
    icon: ArrowForwardIcon,
    position: 'end',
  },
];
