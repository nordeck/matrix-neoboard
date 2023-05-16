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

import { createSvgIcon } from '@mui/material';

export const SidebarLeftIcon = createSvgIcon(
  <path d="M 8,20 H 22 V 4 H 8 Z M 6,8 H 2 V 4 H 6 Z M 6,20 H 2 V 16 H 6 Z M 6,14 H 2 v -4 h 4 z" />,
  'SidebarLeft'
);
