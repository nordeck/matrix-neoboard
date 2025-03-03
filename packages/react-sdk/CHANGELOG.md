# @nordeck/matrix-neoboard-react-sdk

## 1.1.0

### Minor Changes

- a9e09e2: Add placeholder for PDF export when image is not available
- eb347cf: Show information dialog when snapshot loading fails
- 535f498: Users can now select from six new shape fonts (Abel, Actor, Adamina, Chewy, Gwendolyn and Pirata One), in addition to the default "Inter" one.
- 44de4fb: Connect shapes with lines / arrows. Move and resize connected elements.
- 59be7de: Images can now be added by pasting them from the clipboard

### Patch Changes

- ce6d2a7: Implement relative padding for shapes with width/height below 40px and ensure text elements remain visible on small sizes.
- 6590bb1: Pasting text creates a rectangle with a transparent instead of a white background
- 6b4db98: Images no longer disappear when presentation mode is activated. This often happened with Chromium-based browsers, but sometimes also with others.
- f7b18f2: Duplicate shape or selection with hotkey (CTRL+D / CMD+D)
- 33a2830: Fix line resize to disconnect from the connected shape when connect to another shape.
- 2c29529: On PDF export texts do no longer overflow shapes. Lines, that would be cut off are not printed at all.
- d9092fc: If selecting a tool, the current elements become unselected, so that they do not disturb creation of new elements
- b82d827: Pins cross-spawn and nanoid packages to latest verisons to fix CVE-2024-21538 and CVE-2024-55565
- b7c6995: Enhance the interactivity of arrows and lines by increasing the clickable area around them
- e1004fe: Only show text tools when applicable
- a2043c9: Minor and patch dependencies updated. Widget Server updated to latest 1.1.1"
- fb092da: Show cursors of collaborators by default
- cd8480b: Shapes now have a minimum size enforced when creating or loading

## 1.0.0

### Major Changes

- d1aa5b7: Migrate neoboard to vitejs + vitest

  We replaced react-scripts with vitejs and jest with vitest. This change should not affect the functionality of the widget,
  but it allows us to update dependencies and modernize the build process. It also improves the ability to react to security issues in the future.

  However there are changes to the tooling. This will only affect you if you are building the widget yourself and do not use the provided build script.
  This means that you will need to update your build script to use vitejs instead of react-scripts. Additionally, if you had custom changes to the configurations you will have to update them to the vitejs equivalent.

  Finally, the package is now an ECMAScript module (ESM). This means that you might have to update your imports if you consumed the package directly.

### Minor Changes

- c068495: The font size can now be set absolutely. Automatic font sizes are still available.
- 4153d8d: Enhanced the Developer Tools by moving them into a more user-friendly and accessible dialog, improving usability.
- fd631c6: Transparent is now the last colour in the picker, so that the order of colours is the same for shapes and other elements.
- 9eed0b8: New API functions: WhiteboardManager.clear, WhiteboardInstance.persist and WhiteboardInstance.destroy
- 95dc0a4: Adds PDF import as images in slides
- 35d0fee: Ensure that we calculate the mime types ourself due to browsers only checking the file ending and the data on import being untrsuted user input.

  This allows that SVGs are properly working inside of pdf exports and images handling is more stable.

- 60c3602: The grid size changed from 40 to 20 px
- 14f9a15: NeoBoard now monitors the browser's online state and displays a notification if offline

### Patch Changes

- cff43fe: Improve german language
- 6e6fbe7: NeoBoard now more reliably uses the TURN server provided by the Matrix server configuration.
- 0456eed: Bump matrix-widget-toolkit/mui to 2.1.0
- b62299c: An error was fixed, that caused arrow heads sometimes not appear on the first slide
- db08392: A snapshot is sent when a new document is created
- a4e9a8b: Change rounded corner rectangle element position in the toolbar.

## 0.2.2

### Patch Changes

- 22e1adf: Adjust visible bottom toolbars when board width is constrained
- 0e7c62d: Fix toolbar horizontal centering in Safari

## 0.2.1

### Patch Changes

- b9b69f4: Update redux
- 36ca78d: Fix i18n usage

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
