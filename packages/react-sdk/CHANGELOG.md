# @nordeck/matrix-neoboard-react-sdk

## 0.2.0

### Minor Changes

- 1abafd9: Images can now be uploaded by dragging them to the board
- 1cf17a2: Text bold/italic style can now be toggled with CTRL/META + b / CTRL/META + i
- 97fc138: Image upload is now always available. The "REACT_APP_IMAGES" environment variable has been removed.
- e249c05: Slides can be added at a specific position the a new slide context menu item „Insert slide“
- d0f1463: Slides can now be navigated by arrow keys and space in presentaton mode
- f73eff7: Shapes can now be placed with a click
- bf8f313: New rounded rectangle tool
- e784141: The color palette for shapes has now lighter colors. The selected color between different type of elements, such as texts, shapes or lines, is now remembered.

### Patch Changes

- d0535be: Use the Widget API for image downloads when available
- d25d9a0: Upload image button becomes disabled when the slide is locked
- a4905fa: Text no longer gets duplicated when pasting from the clipboard
- f86a6d4: PDF export now includes images
- 0b630c5: Guided tour does no longer skip step 2
- d1f60e7: change cursor to pointer when aiming at line resize handles
- a1099f4: paint element border/resize handles on top of all elements
- da7fae3: Texts are now unselected, if unselecting an element

## 0.1.1

### Patch Changes

- cc4f174: Bump to React 18.x, Redux 5.x, React Redux 9.x and Redux Toolkit 2.x

## 0.1.0

### Minor Changes

- 37d77c0: Board import with uploaded images
- 818b295: Export store apis
- 97cd416: Initial version
- 7c19c50: Set whiteboard custom height

### Patch Changes

- 5e58068: Adjusts PDF export to be compatible with Vite and worker modules
- 6e7d9a2: Element context menus now open on first right click
