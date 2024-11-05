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

import { useEffect, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';
import { ObservableBehaviorSubject } from './types';

/**
 * Use the latest distinct (strict equal) value of a BehaviorSubject.
 *
 * @param subject - BehaviorSubject to observe
 * @return The latest value of the BehaviorSubject
 */
export function useDistinctObserveBehaviorSubject<T>(
  subject: ObservableBehaviorSubject<T>,
): T {
  const [value, setValue] = useState(subject.getValue());

  useEffect(() => {
    const subscription = subject
      .pipe(distinctUntilChanged())
      .subscribe(setValue);

    return () => subscription.unsubscribe();
  }, [subject]);

  return value;
}
