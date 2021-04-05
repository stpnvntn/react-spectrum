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

import {focusSafely, getFocusableTreeWalker} from '@react-aria/focus';
import {GridCollection} from '@react-types/grid';
import {gridKeyboardDelegates} from './utils';
import {GridState} from '@react-stately/grid';
import {HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, RefObject} from 'react';
import {isFocusVisible, usePress} from '@react-aria/interactions';
import {mergeProps} from '@react-aria/utils';
import {Node as RSNode} from '@react-types/shared';
import {useLocale} from '@react-aria/i18n';
import {useSelectableItem} from '@react-aria/selection';

interface GridCellProps {
  node: RSNode<unknown>,
  ref: RefObject<HTMLElement>,
  isVirtualized?: boolean,
  isDisabled?: boolean,

  /* when a cell is focused, should the cell or it's first focusable item be focused */
  focusMode?: 'child' | 'cell',
  shouldSelectOnPressUp?: boolean
}

interface GridCellAria {
  gridCellProps: HTMLAttributes<HTMLElement>
}

export function useGridCell<T, C extends GridCollection<T>>(props: GridCellProps, state: GridState<T, C>): GridCellAria {
  let {
    node,
    ref,
    isVirtualized,
    isDisabled,
    focusMode = 'child',
    shouldSelectOnPressUp
  } = props;

  let {direction} = useLocale();
  let keyboardDelegate = gridKeyboardDelegates.get(state);
  let allowsSelection = state.selectionManager.selectionMode !== 'none';

  // Handles focusing the cell. If there is a focusable child,
  // it is focused, otherwise the cell itself is focused.
  let focus = () => {
    let treeWalker = getFocusableTreeWalker(ref.current);
    if (focusMode === 'child') {
      let focusable = state.selectionManager.childFocusStrategy === 'last'
        ? last(treeWalker)
        : treeWalker.firstChild() as HTMLElement;
      if (focusable) {
        focusSafely(focusable);
        return;
      }
    }

    if (!ref.current.contains(document.activeElement)) {
      focusSafely(ref.current);
    }
  };

  let {itemProps} = useSelectableItem({
    selectionManager: state.selectionManager,
    key: node.key,
    ref,
    isVirtualized,
    focus,
    shouldSelectOnPressUp
  });

  // TODO: move into useSelectableItem?
  let {pressProps} = usePress({...itemProps, isDisabled});

  let onKeyDown = (e: ReactKeyboardEvent) => {
    let walker = getFocusableTreeWalker(ref.current);
    walker.currentNode = document.activeElement;

    switch (e.key) {
      case 'ArrowLeft': {
        // Find the next focusable element within the cell.
        let focusable = direction === 'rtl'
          ? walker.nextNode() as HTMLElement
          : walker.previousNode() as HTMLElement;

        // Don't focus the cell itself if focusMode is "child"
        if (focusMode === 'child' && focusable === ref.current) {
          focusable = null;
        }

        if (focusable) {
          e.preventDefault();
          e.stopPropagation();
          focusSafely(focusable);
        } else {
          // If there is no next focusable child, then move to the next cell to the left of this one.
          // This will be handled by useSelectableCollection. However, if there is no cell to the left
          // of this one, only one column, and the grid doesn't focus rows, then the next key will be the
          // same as this one. In that case we need to handle focusing either the cell or the first/last
          // child, depending on the focus mode.
          let prev = keyboardDelegate.getKeyLeftOf(node.key);
          if (prev !== node.key) {
            break;
          }

          e.preventDefault();
          e.stopPropagation();
          if (focusMode === 'cell' && direction === 'rtl') {
            focusSafely(ref.current);
          } else {
            walker.currentNode = ref.current;
            focusable = direction === 'rtl'
              ? walker.firstChild() as HTMLElement
              : last(walker);
            if (focusable) {
              focusSafely(focusable);
            }
          }
        }
        break;
      }
      case 'ArrowRight': {
        let focusable = direction === 'rtl'
          ? walker.previousNode() as HTMLElement
          : walker.nextNode() as HTMLElement;

        if (focusMode === 'child' && focusable === ref.current) {
          focusable = null;
        }

        if (focusable) {
          e.preventDefault();
          e.stopPropagation();
          focusSafely(focusable);
        } else {
          let next = keyboardDelegate.getKeyRightOf(node.key);
          if (next !== node.key) {
            break;
          }

          e.preventDefault();
          e.stopPropagation();
          if (focusMode === 'cell' && direction === 'ltr') {
            focusSafely(ref.current);
          } else {
            walker.currentNode = ref.current;
            focusable = direction === 'rtl'
              ? last(walker)
              : walker.firstChild() as HTMLElement;
            if (focusable) {
              focusSafely(focusable);
            }
          }
        }
        break;
      }
      case 'ArrowUp':
      case 'ArrowDown':
        // Prevent this event from reaching cell children, e.g. menu buttons. We want arrow keys to navigate
        // to the cell above/below instead. We need to re-dispatch the event from a higher parent so it still
        // bubbles and gets handled by useSelectableCollection.
        if (!e.altKey && ref.current.contains(e.target as HTMLElement)) {
          e.stopPropagation();
          e.preventDefault();
          ref.current.parentElement.dispatchEvent(
            new KeyboardEvent(e.nativeEvent.type, e.nativeEvent)
          );
        }
        break;
    }
  };

  // Grid cells can have focusable elements inside them. In this case, focus should
  // be marshalled to that element rather than focusing the cell itself.
  let onFocus = (e) => {
    if (e.target !== ref.current) {
      // useSelectableItem only handles setting the focused key when
      // the focused element is the gridcell itself. We also want to
      // set the focused key when a child element receives focus.
      // If focus is currently visible (e.g. the user is navigating with the keyboard),
      // then skip this. We want to restore focus to the previously focused row/cell
      // in that case since the table should act like a single tab stop.
      if (!isFocusVisible()) {
        state.selectionManager.setFocusedKey(node.key);
      }
      return;
    }

    // If the cell itself is focused, wait a frame so that focus finishes propagatating
    // up to the tree, and move focus to a focusable child if possible.
    requestAnimationFrame(() => {
      if (focusMode === 'child' && document.activeElement === ref.current) {
        focus();
      }
    });
  };

  // TODO: get rid of press/click/drag handlers so that text select can happen
  if (!allowsSelection) {
    pressProps = {
      onKeyDown: pressProps.onKeyDown,
      onKeyUp: pressProps.onKeyUp,
      onFocus: pressProps.onFocus,
      tabIndex: pressProps.tabIndex
    };
  }

  let gridCellProps: HTMLAttributes<HTMLElement> = mergeProps(pressProps, {
    role: 'gridcell',
    onKeyDownCapture: onKeyDown,
    onFocus
  });

  if (isVirtualized) {
    gridCellProps['aria-colindex'] = node.index + 1; // aria-colindex is 1-based
  }

  return {
    gridCellProps
  };
}

function last(walker: TreeWalker) {
  let next: HTMLElement;
  let last: HTMLElement;
  do {
    last = walker.lastChild() as HTMLElement;
    if (last) {
      next = last;
    }
  } while (last);
  return next;
}
