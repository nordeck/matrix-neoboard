# @nordeck/matrix-neoboard-widget

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
