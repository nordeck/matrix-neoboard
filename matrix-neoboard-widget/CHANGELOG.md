# @nordeck/matrix-neoboard-widget

## 2.3.0

### Minor Changes

- 8cf2bf0: Pan the infinite canvas using the right or middle button when the mouse is over the element
- 9d8cb41: Use delayed events to terminate Matrix RTC session

### Patch Changes

- 2151634: Update Matrix Widget Toolkit to support Matrix Room Version 12
- f8bb468: Use `React.memo` for `ElementBar` to have smoother moving and resizing of multiple elements
- a2294ae: Update jsdom package to remove form-data and mitigate CVE-2025-7783
- Updated dependencies [2151634]
- Updated dependencies [8cf2bf0]
- Updated dependencies [2a07714]
- Updated dependencies [9d8cb41]
- Updated dependencies [f8bb468]
- Updated dependencies [a2294ae]
- Updated dependencies [bcd11c4]
  - @nordeck/matrix-neoboard-react-sdk@1.3.0

## 2.2.1

### Patch Changes

- ae223c4: Bump vite from 5.4.14 to 5.4.19
- Updated dependencies [ae223c4]
  - @nordeck/matrix-neoboard-react-sdk@1.2.1

## 2.2.0

### Minor Changes

- 0a9bc50: Add sticky notes feature with toolbar button, default styling, and resize behavior
- d050272: There is now an infinite canvas mode exist which can be enabled with the `REACT_APP_INFINITE_CANVAS` environment variable.
- 7964ca0: There is now a the new frame tool, that places frames on the canvas (only with feature flag `REACT_APP_INFINITE_CANVAS`)
- 5aa6fad: Adds baseline MatrixRTC implementation as an alternative to peer-to-peer WebRTC
- 9a833f2: add wss to CSP to enable matrixRTC
- f62be01: Add PDF to uploadable file types
- 0a5b1f3: Connect a line/arrow to a shape while creating

### Patch Changes

- f88782b: Fix the canvas being unable to display visible area when infinite canvas mode is activated
- 8ca852a: Fit scale to fix not expected transition on zoom out
- 41b337f: Update matrix-widget-toolkit group: @matrix-widget-toolkit/api to 4.2.0, @matrix-widget-toolkit/mui to 2.1.3, i18next to 25.2.1, react-i18next to 15.5.2, @mui/lab to 6.0.1-beta.35
- 76c2700: Fix duplicate elements shortcut to keep the connections
- 241f6dc: Improve drag and drop, copy and paste behaviours to add elements to the mouse cursor position
- 57e222d: Keep the elements connections during copy and paste, duplicate operations
- 17be86c: Update the help center button icon to look less like an error
- 3e0cbf7: Fix regressions in fitting a widget into a frame and a canvas moving off-screen
- 176b3da: Fix selected connected line direction change when moved and snap to grid is enabled
- 42e391b: Improve the behavior of connecting a line to a shape
- a213b9a: Fix sync between cursor position and dragged elements
- 1aac286: Improve performance when the element is moved or resized
- 87cd696: Fix uploaded image size and pass pdf image size explicitly
- Updated dependencies [2d739e4]
- Updated dependencies [f88782b]
- Updated dependencies [a523436]
- Updated dependencies [b9bb163]
- Updated dependencies [b863b53]
- Updated dependencies [8ca852a]
- Updated dependencies [b826259]
- Updated dependencies [41b337f]
- Updated dependencies [b76e3a6]
- Updated dependencies [76c2700]
- Updated dependencies [0a9bc50]
- Updated dependencies [18e2f1f]
- Updated dependencies [f24412d]
- Updated dependencies [d050272]
- Updated dependencies [241f6dc]
- Updated dependencies [7964ca0]
- Updated dependencies [5aa6fad]
- Updated dependencies [1d08584]
- Updated dependencies [aca78bb]
- Updated dependencies [0591f4f]
- Updated dependencies [c8348bd]
- Updated dependencies [be8c7d0]
- Updated dependencies [57e222d]
- Updated dependencies [17be86c]
- Updated dependencies [5b24e27]
- Updated dependencies [3e0cbf7]
- Updated dependencies [4e9146e]
- Updated dependencies [d9a5026]
- Updated dependencies [176b3da]
- Updated dependencies [42e391b]
- Updated dependencies [b384065]
- Updated dependencies [a213b9a]
- Updated dependencies [1aac286]
- Updated dependencies [fd1538e]
- Updated dependencies [87cd696]
- Updated dependencies [5dc812a]
- Updated dependencies [f62be01]
- Updated dependencies [3d7c3bf]
- Updated dependencies [0a5b1f3]
- Updated dependencies [54f0787]
- Updated dependencies [205cf88]
  - @nordeck/matrix-neoboard-react-sdk@1.2.0

## 2.1.0

### Minor Changes

- a9e09e2: Add placeholder for PDF export when image is not available
- eb347cf: Show information dialog when snapshot loading fails
- 535f498: Users can now select from six new shape fonts (Abel, Actor, Adamina, Chewy, Gwendolyn and Pirata One), in addition to the default "Inter" one.
- 44de4fb: Connect shapes with lines / arrows. Move and resize connected elements.
- 59be7de: Images can now be added by pasting them from the clipboard

### Patch Changes

- ce6d2a7: Implement relative padding for shapes with width/height below 40px and ensure text elements remain visible on small sizes.
- 6b4db98: Images no longer disappear when presentation mode is activated. This often happened with Chromium-based browsers, but sometimes also with others.
- d068928: Adds SBOM report to widget, build and release assets
- 33a2830: Fix line resize to disconnect from the connected shape when connect to another shape.
- 2c29529: On PDF export texts do no longer overflow shapes. Lines, that would be cut off are not printed at all.
- b82d827: Pins cross-spawn and nanoid packages to latest verisons to fix CVE-2024-21538 and CVE-2024-55565
- b7c6995: Enhance the interactivity of arrows and lines by increasing the clickable area around them
- a2043c9: Minor and patch dependencies updated. Widget Server updated to latest 1.1.1"
- cd8480b: Shapes now have a minimum size enforced when creating or loading
- Updated dependencies [a9e09e2]
- Updated dependencies [ce6d2a7]
- Updated dependencies [6590bb1]
- Updated dependencies [6b4db98]
- Updated dependencies [eb347cf]
- Updated dependencies [f7b18f2]
- Updated dependencies [33a2830]
- Updated dependencies [2c29529]
- Updated dependencies [535f498]
- Updated dependencies [d9092fc]
- Updated dependencies [b82d827]
- Updated dependencies [44de4fb]
- Updated dependencies [b7c6995]
- Updated dependencies [e1004fe]
- Updated dependencies [a2043c9]
- Updated dependencies [59be7de]
- Updated dependencies [fb092da]
- Updated dependencies [cd8480b]
  - @nordeck/matrix-neoboard-react-sdk@1.1.0

## 2.0.0

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
- 95dc0a4: Adds PDF import as images in slides
- 5535a20: Hide about menu item if the widget is embedded
- 58b4768: New widget-server base image that supports IPv4-only deployments
- 60c3602: The grid size changed from 40 to 20 px
- 14f9a15: NeoBoard now monitors the browser's online state and displays a notification if offline

### Patch Changes

- cff43fe: Improve german language
- 6e6fbe7: NeoBoard now more reliably uses the TURN server provided by the Matrix server configuration.
- 0456eed: Bump matrix-widget-toolkit/mui to 2.1.0
- b62299c: An error was fixed, that caused arrow heads sometimes not appear on the first slide
- 79ea35f: Add Border to the color picker icon
- a4e9a8b: Change rounded corner rectangle element position in the toolbar.
- Updated dependencies [cff43fe]
- Updated dependencies [c068495]
- Updated dependencies [6e6fbe7]
- Updated dependencies [0456eed]
- Updated dependencies [b62299c]
- Updated dependencies [db08392]
- Updated dependencies [4153d8d]
- Updated dependencies [fd631c6]
- Updated dependencies [9eed0b8]
- Updated dependencies [d1aa5b7]
- Updated dependencies [95dc0a4]
- Updated dependencies [35d0fee]
- Updated dependencies [a4e9a8b]
- Updated dependencies [60c3602]
- Updated dependencies [14f9a15]
  - @nordeck/matrix-neoboard-react-sdk@1.0.0

## 1.20.0

### Minor Changes

- 592713a: Deactivate grid in presentation mode

### Patch Changes

- 0e7c62d: Fix toolbar horizontal centering in Safari
- Updated dependencies [22e1adf]
- Updated dependencies [0e7c62d]
  - @nordeck/matrix-neoboard-react-sdk@0.2.2

## 1.19.1

### Patch Changes

- Updated dependencies [b9b69f4]
- Updated dependencies [36ca78d]
  - @nordeck/matrix-neoboard-react-sdk@0.2.1

## 1.19.0

### Minor Changes

- 1abafd9: Images can now be uploaded by dragging them to the board
- 1cf17a2: Text bold/italic style can now be toggled with CTRL/META + b / CTRL/META + i
- e249c05: Slides can be added at a specific position the a new slide context menu item „Insert slide“
- d0f1463: Slides can now be navigated by arrow keys and space in presentaton mode
- f73eff7: Shapes can now be placed with a click
- bf8f313: New rounded rectangle tool

### Patch Changes

- d0535be: Use the Widget API for image downloads when available
- a4905fa: Text no longer gets duplicated when pasting from the clipboard
- 0b630c5: Guided tour does no longer skip step 2
- da7fae3: Texts are now unselected, if unselecting an element
- Updated dependencies [1abafd9]
- Updated dependencies [1cf17a2]
- Updated dependencies [97fc138]
- Updated dependencies [d0535be]
- Updated dependencies [e249c05]
- Updated dependencies [d0f1463]
- Updated dependencies [d25d9a0]
- Updated dependencies [a4905fa]
- Updated dependencies [f73eff7]
- Updated dependencies [f86a6d4]
- Updated dependencies [bf8f313]
- Updated dependencies [0b630c5]
- Updated dependencies [d1f60e7]
- Updated dependencies [a1099f4]
- Updated dependencies [da7fae3]
- Updated dependencies [e784141]
  - @nordeck/matrix-neoboard-react-sdk@0.2.0

## 1.18.1

### Patch Changes

- cc4f174: Bump to React 18.x, Redux 5.x, React Redux 9.x and Redux Toolkit 2.x
- Updated dependencies [cc4f174]
  - @nordeck/matrix-neoboard-react-sdk@0.1.1

## 1.18.0

### Minor Changes

- 37d77c0, e0f36b7: Board import and export with uploaded images

### Patch Changes

- 6e7d9a2: Element context menus now open on first right click
- 97cd416: Use `@nordeck/matrix-neoboard-react-sdk` package
- 37d77c0, 5e58068, 818b295, 6e7d9a2, 97cd416: Updated dependencies
- 7c19c50: Updated dependencies
  - @nordeck/matrix-neoboard-react-sdk@0.1.0

## 1.17.0

### Minor Changes

- 4667a5a: Release multiselect feature
- 72bd0e6: Support bold and italic text formatting
- 0977ec5: Change color of text fields
- 8663080: Change color of texts
- a6779a5: Images can now be resized

### Patch Changes

- a67b6ee: Bugfix for grid can not be visible during presentation
- 3fa82a7: Placeholder appears if file is not available
- b8df79e: Bugfix for - toolbar text alignment is incorrect when shape is too close to right canvas border
- 3632c66: Don't show color picker for elements without color properties (ie, images)
- b94c10b: Fix TextElement size calculation in triangle shapes

## 1.16.1

### Patch Changes

- 837c54d: Fix text alignment not applied if the option is already active

## 1.16.0

### Minor Changes

- 3cfaf24: Multiple selected elements can now be moved around by dragging anywhere inside the selection
- ea52fc6: Support multiselect resizing

### Patch Changes

- 86254d9: Improve performance of multiple selection actions in slides with hundreds of elements

## 1.15.0

### Minor Changes

- efb4758: Upload images

## 1.14.0

### Minor Changes

- e7b3f97: Support resizing of lines
- 05b5c18: Wait for the moderator to join if the user does not have enough permissions to create a whiteboard.
- 54f5566: Text alignments now work for multiple selected elements

### Patch Changes

- ec3e8ea: Successive deletion of slides no longer causes the remote board to crash
- cb6b2fa: Fix whiteboard initialization when whiteboards loading is slower.

## 1.13.0

### Minor Changes

- 7cc4224: Connection to React devtools can now be enabled with the REACT_APP_DEVTOOLS environment variable
- 883821a: Polylines can now be resized
- def8374: Copy, cut and paste multiple selected elements.
- b591353: Elements can now be selected by dragging the mouse
- 55c3b1d: Change the color of multiple selected elements.
- a6d11fb: Add a full screen mode toggle button
- 20e50fd: A new "arrow" tool is available

## 1.12.0

### Minor Changes

- b77aa50: Bring multiple elements to front/back.
- 9047615: It is now possible to delete multiple selected elements at once

## 1.11.0

### Minor Changes

- 6f381e7: The import dialog now mentions that an import can be undone

## 1.10.0

### Minor Changes

- 4cd20a3: Support text alignment in shapes

## 1.9.0

### Minor Changes

- 323e80d: Add action to duplicate multiple elements.

## 1.8.0

### Minor Changes

- bd3067b: Outline active elements

## 1.7.0

### Minor Changes

- 4e0d53c: Move multiple elements.

## 1.6.1

### Patch Changes

- 5fd564c: Revert matrix-widget-toolkit group update to fix widget display issue.

## 1.6.0

### Minor Changes

- a5adc10: Add action to duplicate a slide.

## 1.5.0

### Minor Changes

- 3dbf21a: Select multiple elements

## 1.4.0

### Minor Changes

- adc86b3: Allow admin and moderator to end a presentation mode

## 1.3.0

### Minor Changes

- 7eddb61: Show collaborators avatars in presentation mode

## 1.2.0

### Minor Changes

- 8d3c643: Allows collaborators cursors to be shown in presentation mode if slide editing is enabled

## 1.1.0

### Minor Changes

- 57b6c77: Only admin and moderator can import a new whiteboard

## 1.0.0

### Major Changes

- 0115b33: First stable release

## 0.4.0

### Minor Changes

- 807a72c: Add an “about” dialog that shows version information.
- 965251f: Add buttons to navigate to the next or previous slide in a presentation.
- 00a59e8: Add a PDF export.
- a195baa: Support editing in presentation mode.
- 2b248b0: Sign the release containers with cosign.

## 0.3.0

### Minor Changes

- 3389d46: Add a presentation mode to present slides to remote users.
- 3389d46: Use NeoBoard as the product name.
- 3389d46: Display just the active users in the collaboration bar.

### Patch Changes

- 17274e6: Recalculate the text size after all fonts are loaded.

## 0.2.0

### Minor Changes

- 41292da: Reworked architecture of the whiteboard widget.
  We have introduced a new storage format and support real-time collaboration via WebRTC.
  You can find more details in the [related ADR](https://github.com/nordeck/matrix-whiteboard/blob/main/docs/adrs/adr002-multi-layer-communication-and-storage-architecture.md).

  **Breaking Change:**
  The event format was changed.
  This change is not backwards compatible and starting the updated widget in a room will replace any existing whiteboard and delete all prior slides.

### Patch Changes

- 92c78cd: Include `LICENSE` file in container output and define concluded licenses in case of dual licenses.
- 496fef4: Include `arm64` and `s390x` builds.
- 804822b: Include a `licenses.json` in the container image, which includes a list of all dependencies and their licenses.
