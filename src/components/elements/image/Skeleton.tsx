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

import { keyframes, styled } from '@mui/material';

const skeletonAnimation = keyframes`
0% { opacity: 1; }
50% { opacity: .4; }
100% { opacity: 1; }
`;

/**
 * Similar to MUIs skeleton but SVG only.
 *
 * MUIs Skeleton component is not used, because there is a bug in Safari regarding foreignObjects
 * {@link https://bugs.webkit.org/show_bug.cgi?id=23113}
 */
export const Skeleton = styled('rect')({
  fill: 'rgba(23, 25, 28, 0.11)',
  animationName: skeletonAnimation,
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
});
