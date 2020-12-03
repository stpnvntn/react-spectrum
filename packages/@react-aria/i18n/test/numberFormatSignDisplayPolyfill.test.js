/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {numberFormatSignDisplayPolyfill} from '../src/utils';

function verify(locale, options, signDisplay, v) {
  let a = new Intl.NumberFormat(locale, options);
  let b = new Intl.NumberFormat(locale, {...options, signDisplay});

  expect(numberFormatSignDisplayPolyfill(a, signDisplay, v)).toBe(b.format(v));
}

let signDisplayValues = ['always', 'auto', 'never', 'exceptZero'];
let localeValues = ['de-DE', 'ar-AE', 'fa', 'he-IL'];
let optionsValues = [{}, {style: 'unit', unit: 'celsius'}, {style: 'currency', currency: 'USD', currencyDisplay: 'name'}];
let numValues = [-123, -1, -0, 0, +0, 1, 123];

describe('numberFormatSignDisplayPolyfill', () => {
  for (let signDisplay of signDisplayValues) {
    for (let locale of localeValues) {
      for (let options of optionsValues) {
        for (let num of numValues) {
          // eslint-disable-next-line no-nested-ternary
          it(`${locale} - ${signDisplay} - ${JSON.stringify(options)} - ${Object.is(num, +0) ? '+0' : Object.is(num, -0) ? '-0' : num}`, () => {
            verify(locale, options, signDisplay, num);
          });
        }
      }
    }
  }
});
