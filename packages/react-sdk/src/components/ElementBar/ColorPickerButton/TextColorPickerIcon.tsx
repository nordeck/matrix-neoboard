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

type TextColorPickerIconProps = {
  color: string;
};

export function TextColorPickerIcon({ color }: TextColorPickerIconProps) {
  return (
    <div>
      <svg
        width="20"
        height="21"
        viewBox="0 -6 20 21"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 3.5,14 8.75,0 h 2.5 L 16.5,14 H 14.1 L 12.85,10.4 H 7.2 L 5.9,14 Z M 7.9,8.4 h 4.2 L 10.05,2.6 h -0.1 z"
          fill="currentColor"
        />
      </svg>
      <div
        style={{
          width: '100%',
          height: '5px',
          backgroundColor: color,
          border: '1px solid',
          borderColor: 'currentcolor',
        }}
      ></div>
    </div>
  );
}
