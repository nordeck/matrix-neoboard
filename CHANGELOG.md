# @nordeck/matrix-neoboard-widget

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
