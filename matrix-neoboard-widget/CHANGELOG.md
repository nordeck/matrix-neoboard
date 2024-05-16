# @nordeck/matrix-neoboard-widget

## 1.18.0

### Minor Changes

- 37d77c0: Board import with uploaded images
- e0f36b7: Export board with uploaded images

### Patch Changes

- 6e7d9a2: Element context menus now open on first right click
- 97cd416: Use `@nordeck/matrix-neoboard-react-sdk` package
- Updated dependencies [37d77c0]
- Updated dependencies [5e58068]
- Updated dependencies [818b295]
- Updated dependencies [6e7d9a2]
- Updated dependencies [97cd416]
- Updated dependencies [7c19c50]
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
