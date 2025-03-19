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

import { TFontDictionary } from 'pdfmake/interfaces';
import { inter400 } from './inter';
import { notoEmojiRegular } from './noto-emoji-regular';

type FontConfig = {
  vfs: { [file: string]: string };
  fonts: TFontDictionary;
};

export function createFontConfig(): FontConfig {
  const config: FontConfig = {
    vfs: {
      'Inter-400.woff2': inter400,
      'NotoEmoji-Regular.ttf': notoEmojiRegular,
    },
    fonts: {},
  };

  config.fonts['Roboto'] = {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  };
  config.fonts['Abel'] = {
    normal: 'Inter-400.woff2',
  };
  config.fonts['Actor'] = {
    normal: 'Inter-400.woff2',
  };
  config.fonts['Adamina'] = {
    normal: 'Inter-400.woff2',
  };
  config.fonts['Chewy'] = {
    normal: 'Inter-400.woff2',
  };
  config.fonts['Gwendolyn'] = {
    normal: 'Inter-400.woff2',
  };
  config.fonts['Inter'] = {
    normal: 'Inter-400.woff2',
  };
  config.fonts['Noto Emoji'] = {
    normal: 'NotoEmoji-Regular.ttf',
  };
  config.fonts['Pirata One'] = {
    normal: 'Inter-400.woff2',
  };

  return config;
}
