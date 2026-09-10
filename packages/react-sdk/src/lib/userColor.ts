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
  amber,
  blue,
  blueGrey,
  brown,
  cyan,
  deepOrange,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} from '@mui/material/colors';

const colors = [
  amber[500],
  blue[500],
  blueGrey[500],
  brown[500],
  cyan[500],
  deepOrange[500],
  deepPurple[500],
  green[500],
  grey[500],
  indigo[500],
  lightBlue[500],
  lightGreen[500],
  lime[500],
  orange[500],
  pink[500],
  purple[500],
  red[500],
  teal[500],
  yellow[500],
];

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; ++i) {
    const charCode = userId.charCodeAt(i);
    hash = (hash << 5) - hash + charCode;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getUserColor(userId: string): string {
  const hash = hashUserId(userId);
  const index = hash % colors.length;
  return colors[index];
}
