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

import {ActionButton} from '@react-spectrum/button';
import {AriaButtonProps} from '@react-types/button';
import ChevronDownSmall from '@spectrum-icons/ui/ChevronDownSmall';
import ChevronUpSmall from '@spectrum-icons/ui/ChevronUpSmall';
import {classNames} from '@react-spectrum/utils';
import {PressResponder, useHover} from '@react-aria/interactions';
import React from 'react';
import stepperStyle from '@adobe/spectrum-css-temp/components/stepper/vars.css';

interface StepButtonProps extends AriaButtonProps {
  isQuiet: boolean,
  direction: 'up' | 'down'
}

function StepButton({isQuiet, direction, ...props}: StepButtonProps) {
  let {hoverProps, isHovered} = useHover({});
  return (
    <PressResponder {...hoverProps}>
      <ActionButton
        UNSAFE_className={
          classNames(
            stepperStyle,
            'spectrum-ActionButton',
            {
              'spectrum-Stepper-stepUp': direction === 'up',
              'spectrum-Stepper-stepDown': direction === 'down',
              'is-hovered': isHovered
            }
          )
        }
        {...props}
        isQuiet={isQuiet}>
        {direction === 'up' && <ChevronUpSmall UNSAFE_className={classNames(stepperStyle, 'spectrum-Stepper-stepUpIcon')} />}
        {direction === 'down' && <ChevronDownSmall UNSAFE_className={classNames(stepperStyle, 'spectrum-Stepper-stepDownIcon')} />}
      </ActionButton>
    </PressResponder>
  );
}

/**
 * Buttons for NumberField.
 */
let _StepButton = StepButton;
export {_StepButton as StepButton};
