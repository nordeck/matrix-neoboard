# @nordeck/matrix-neoboard-react-sdk

## 1.4.0

### Minor Changes

- 1d385a6: Add attachment / detachment of elements to frames. Implement resizing and moving of frames and how it affects attached / detached elements.
- 27235f4: Improve touchpad and mouse wheel zooming and panning
- f323172: Import slides content into frames in infinite canvas mode

### Patch Changes

- 4aae4ea: Update lodash to resolve CVE: `CVE-2025-13465`
- 7166039: Do not select the element when panning the board with a mouse
- f05e75e: Update i18next-cli to 1.33.5
- 1d385a6: Improve element ID validation to check for disallowed values. Fix the whiteboard import to validate incoming IDs.
- 977af9d: Fix an issue when panning with the pointer moving over a shape
- e3b048c: Prevent the context menu from being shown when user right clicks top-middle part of the element
- a51c1a6: Prevent the context menu from being shown on top of the element menu
- 7d1da8a: Update vite to 7, vitest to 3.2.4
- 4c74efe: Use i18next-cli instead of i18next-parser
- de9dc5c: Fix MatrixRTC connection issue when presentation mode is started

## 1.3.0

### Minor Changes

- 8cf2bf0: Pan the infinite canvas using the right or middle button when the mouse is over the element
- 2a07714: Implement oldest membership selection type for the active focus when using MatrixRTC with a Livekit backend
- 9d8cb41: Use delayed events to terminate Matrix RTC session

### Patch Changes

- 2151634: Update Matrix Widget Toolkit to support Matrix Room Version 12
- f8bb468: Use `React.memo` for `ElementBar` to have smoother moving and resizing of multiple elements
- a2294ae: Update jsdom package to remove form-data and mitigate CVE-2025-7783
- bcd11c4: Fix communication channel to stop visibility handling when it is destroyed

## 1.2.1

### Patch Changes

- ae223c4: Bump vite from 5.4.14 to 5.4.19

## 1.2.0

### Minor Changes

- a523436: Use room id of selected whiteboard event to load document snapshots.
- b863b53: Add start markers to lines and element bar options for changing them
- 0a9bc50: Add sticky notes feature with toolbar button, default styling, and resize behavior
- f24412d: Fix PDF export for older boards where the font of shapes with text wasn't specified
- d050272: There is now an infinite canvas mode exist which can be enabled with the `REACT_APP_INFINITE_CANVAS` environment variable.
- 7964ca0: There is now a the new frame tool, that places frames on the canvas (only with feature flag `REACT_APP_INFINITE_CANVAS`)
- 5aa6fad: Adds baseline MatrixRTC implementation as an alternative to peer-to-peer WebRTC
- c8348bd: Provide option to create whiteboard manager with disabled RTC communication.
- d9a5026: Export SlideSkeleton component.
- fd1538e: Improve zooming and panning with trackpad, mouse and keyboard
- f62be01: Add PDF to uploadable file types
- 3d7c3bf: Fix PDF export, if the new fonts are used. Use the Inter font for all text.
- 0a5b1f3: Connect a line/arrow to a shape while creating
- 54f0787: Discover MatrixRTC foci from /.well-known/matrix/client and sync session state with backend connection status.

### Patch Changes

- 2d739e4: Increase the output scale to 4 on infinite canvas mode to ensure the images have enough quality on the board
- f88782b: Fix the canvas being unable to display visible area when infinite canvas mode is activated
- b9bb163: Adds env variable for setting LiveKit JWT Service URL
- 8ca852a: Fit scale to fix not expected transition on zoom out
- b826259: Disable Zoom Shortcuts when editing text content
- 41b337f: Update matrix-widget-toolkit group: @matrix-widget-toolkit/api to 4.2.0, @matrix-widget-toolkit/mui to 2.1.3, i18next to 25.2.1, react-i18next to 15.5.2, @mui/lab to 6.0.1-beta.35
- b76e3a6: Only init session manager when RTC is enabled
- 76c2700: Fix duplicate elements shortcut to keep the connections
- 18e2f1f: Use rtc channel sessions instead of redux store for Collaborators bar
- 241f6dc: Improve drag and drop, copy and paste behaviours to add elements to the mouse cursor position
- 1d08584: Fix inconsistent color between avatar and realtime collaboration cursor borders
- aca78bb: Hide Slide Overview and Presentation Mode toggles, disable Frames tool
- 0591f4f: Disable slide overview guided tour step in infinite canvas mode
- be8c7d0: Fix scrolling not working when the pointer is over preview
- 57e222d: Keep the elements connections during copy and paste, duplicate operations
- 17be86c: Update the help center button icon to look less like an error
- 5b24e27: Improve PDF import for infinite canvas
- 3e0cbf7: Fix regressions in fitting a widget into a frame and a canvas moving off-screen
- 4e9146e: Close peer backend connection on channel destruction
- 176b3da: Fix selected connected line direction change when moved and snap to grid is enabled
- 42e391b: Improve the behavior of connecting a line to a shape
- b384065: Ensure that pdf imports on infinite canvas mode work.

  We import pdf pages on infinite canvas now in the size of a frame instead.

- a213b9a: Fix sync between cursor position and dragged elements
- 1aac286: Improve performance when the element is moved or resized
- 87cd696: Fix uploaded image size and pass pdf image size explicitly
- 5dc812a: Revert IC default font size back to auto
- 205cf88: Fix cutoff arrow tips

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
