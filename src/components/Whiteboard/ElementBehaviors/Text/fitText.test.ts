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

import { fitText, getTemporaryElement } from './fitText';

describe('fitText', () => {
  it('should render without exploding', () => {
    const container = createContainerElement(173, 162, {
      '405px': [593, 526],
      '208px': [347, 309],
      '109px': [223, 201],
      '59px': [173, 162],
      '84px': [192, 173],
      '72px': [177, 162],
      '66px': [173, 162],
      '69px': [173, 162],
      '70px': [174, 162],
    });

    fitText(container);

    expect(container.style.fontSize).toEqual('69px');
  });

  it('should limit to min font size if container is to small', () => {
    const container = createContainerElement(1, 12, {
      '405px': [177, 451],
      '208px': [91, 234],
      '109px': [48, 126],
      '59px': [27, 71],
      '35px': [16, 44],
      '22px': [11, 30],
      '16px': [8, 23],
      '13px': [7, 20],
      '12px': [6, 19],
      '11px': [6, 18],
    });

    fitText(container);

    expect(container.style.fontSize).toEqual('10px');
  });

  it('should limit to max font size if container is to big', () => {
    const container = createContainerElement(1882, 1012, {
      '405px': [1882, 1012],
      '603px': [1882, 1012],
      '701px': [1882, 1012],
      '751px': [1882, 1012],
      '775px': [1882, 1012],
      '788px': [1882, 1012],
      '794px': [1882, 1012],
      '797px': [1882, 1012],
      '798px': [1882, 1012],
      '799px': [1882, 1012],
    });

    fitText(container);

    expect(container.style.fontSize).toEqual('799px');
  });

  it('should not get wrong font size if best fit is hit early', () => {
    const container = createContainerElement(91, 70, {
      '405px': [222, 480],
      '208px': [136, 263],
      '109px': [93, 155],
      '59px': [91, 100],
      '35px': [91, 70],
      '47px': [91, 70],
      '53px': [91, 70],
      '56px': [91, 96],
      '55px': [91, 70],
    });

    fitText(container);

    expect(container.style.fontSize).toEqual('55px');
  });

  it('should not get wrong font size if bounding rect is too large by a fraction', () => {
    const container = createContainerElement(173, 162, {
      '405px': [593, 526],
      '208px': [347, 309],
      '109px': [223, 201],
      '59px': [173, 162],
      '84px': [192, 173],
      '72px': [177, 162],
      '66px': [173, 162],
      '69px': [173, 162],
      '70px': [173.1, 162],
    });

    fitText(container);

    expect(container.style.fontSize).toEqual('69px');
  });

  it('should center the text with padding', () => {
    const container = createContainerElement(
      91,
      70,
      {
        '405px': [222, 480],
        '208px': [136, 263],
        '109px': [93, 155],
        '59px': [91, 100],
        '35px': [91, 70],
        '47px': [91, 70],
        '53px': [91, 70],
        '56px': [91, 96],
        '55px': [91, 70],
      },
      { '55px': 60 }
    );

    container.style.height = '70px';

    fitText(container);

    expect(container.style.fontSize).toEqual('55px');
    expect(container.style.paddingTop).toEqual('5px');
    expect(container.style.height).toEqual('70px');
  });
});

function createContainerElement(
  width: number,
  height: number,
  scrollLookup: Record<string, number[]>,
  clientHeightLookup: Record<string, number> = {}
): HTMLElement {
  const container = document.createElement('div');
  jest.spyOn(container, 'clientWidth', 'get').mockReturnValue(width);
  jest.spyOn(container, 'clientHeight', 'get').mockReturnValue(height);

  const { textElement: calculationContainer } = getTemporaryElement();
  jest
    .spyOn(calculationContainer, 'clientHeight', 'get')
    .mockImplementation(
      () => clientHeightLookup[calculationContainer.style.fontSize] ?? height
    );
  jest
    .spyOn(calculationContainer, 'getBoundingClientRect')
    .mockImplementation(() => ({
      width: scrollLookup[calculationContainer.style.fontSize][0],
      height: scrollLookup[calculationContainer.style.fontSize][1],
      x: 0,
      y: 0,
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      toJSON: jest.fn(),
    }));
  return container;
}
