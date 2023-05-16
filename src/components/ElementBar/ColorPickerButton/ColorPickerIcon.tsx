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

import { useTheme } from '@mui/material';

export const ColorPickerIcon = ({
  color,
  active,
}: {
  color: string;
  active?: boolean;
}) => {
  const theme = useTheme();
  return (
    <svg viewBox="0 0 100 100" width={30} height={30} role="presentation">
      {active && (
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke={theme.palette.primary.main}
          strokeWidth="6"
          fill="none"
        />
      )}

      <circle
        cx="50"
        cy="50"
        r="30"
        fill={color}
        stroke={'grey'}
        strokeWidth="3"
      />
    </svg>
  );
};
