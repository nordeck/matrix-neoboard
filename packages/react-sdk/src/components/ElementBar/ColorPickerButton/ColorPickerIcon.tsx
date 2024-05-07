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

import { styled } from '@mui/material';

type InnerProps = {
  color: string;
};

const Inner = styled('div', {
  shouldForwardProp: (p) => p !== 'color',
})<InnerProps>(({ color }) => ({
  alignItems: 'center',
  backgroundColor: color,
  borderColor: 'grey',
  borderRadius: '50%',
  borderStyle: 'solid',
  borderWidth: '1px',
  display: 'flex',
  height: '20px',
  justifyContent: 'center',
  overflow: 'hidden',
  width: '20px',
}));

type OuterProps = {
  active?: boolean;
};

const Outer = styled('div')<OuterProps>(({ active, theme }) => ({
  alignItems: 'center',
  borderColor: active ? theme.palette.primary.main : 'transparent',
  borderRadius: '50%',
  borderStyle: 'solid',
  borderWidth: '2px',
  display: 'flex',
  height: '30px',
  justifyContent: 'center',
  width: '30px',
}));

const ChequerboardPattern = function () {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20">
      <path d="M0 0h5v5H0z" fill="rgba(0, 0, 0, .7)" />
      <path d="M4.983.059h5v5h-5z" fill="rgba(255, 255, 255, .8)" />
      <path
        d="M0 5h5v5H0zM0 15h5v5H0zM10 15h5v5h-5zM15 10h5v5h-5zM15 0h5v5h-5z"
        fill="rgba(255, 255, 255, .8)"
      />
      <path
        d="M0 10h5v5H0zM5 5h5v5H5zM5 15h5v5H5zM10 0h5v5h-5zM10 10h5v5h-5zM15 5h5v5h-5zM15 15h5v5h-5z"
        fill="rgba(0, 0, 0, .7)"
      />
      <path d="M10 5h5v5h-5zM5 10h5v5H5z" fill="rgba(255, 255, 255, .8)" />
    </svg>
  );
};

export const ColorPickerIcon = ({
  color,
  active,
}: {
  color: string;
  active?: boolean;
}) => {
  return (
    <Outer active={active}>
      <Inner color={color}>
        {color === 'transparent' ? <ChequerboardPattern /> : null}
      </Inner>
    </Outer>
  );
};
