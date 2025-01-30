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

import { createTheme } from '@mui/material/styles';
import AbelRegular from './fonts/Abel-Regular.ttf';
import ActorRegular from './fonts/Actor-Regular.ttf';
import AdaminaRegular from './fonts/Adamina-Regular.ttf';
import ChewyRegular from './fonts/Chewy-Regular.ttf';
import GwendolynRegular from './fonts/Gwendolyn-Regular.ttf';
import InterRegular from './fonts/Inter_24pt-Regular.ttf';
import PirataOneRegular from './fonts/PirataOne-Regular.ttf';

const theme = createTheme({
  typography: {
    fontFamily:
      'Abel, Actor, Adamina, Chewy, Gwendolyn, Inter, Pirata One, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Abel';
          src: local('Abel'), url(${AbelRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Actor';
          src: local('Actor'), url(${ActorRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Adamina';
          src: local('Adamina'), url(${AdaminaRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Chewy';
          src: local('Chewy'), url(${ChewyRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Gwendolyn';
          src: local('Gwendolyn'), url(${GwendolynRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Inter';
          src: local('Inter'), url(${InterRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Pirata One';
          src: local('Pirata One'), url(${PirataOneRegular}) format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `,
    },
  },
});

export default theme;
