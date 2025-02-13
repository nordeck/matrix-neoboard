# Export / Import Data Format

This document describes the data format of the files that can be exported from and imported into the whiteboard.
The format is JSON-based and contains all slides and elements that are originally stored in the [CRDT Document Model][crdt-documents].
The file won't include ID (slide or element) of the original document.
They will be generated when the slides are added into an existing (or new) document.
The exception is when elements are connected. In this case ids of elements are exported.

## Document

A whiteboard will be exported with the filename extension `.nwb`.
It is a JSON file with the following format:

### Fields

| Field               | Type           | Description                                                                                                                   |
| ------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `version`           | `string`       | The file version (`net.nordeck.whiteboard@v1`).                                                                               |
| `whiteboard`        | `object`       | The whiteboard that is stored in this file.                                                                                   |
| `whiteboard.slides` | `Array<Slide>` | A list of slides in the display order as given by the `slideIds` field in the [`Whiteboard`](./crdt-documents.md#whiteboard). |

Once exported, it can be imported into the same whiteboard at a later point in time or to a new instance of the whiteboard in another matrix room.

### Example

```json
{
  "version": "net.nordeck.whiteboard@v1",
  "whiteboard": {
    "slides": [
      {
        // Slide A
      },
      {
        // Slide B
      },
      {
        // Slide C
      }
    ]
  }
}
```

### `Slide`

A slide contains a collection of ordered elements.

#### Fields

| Field      | Type                                 | Description                                                                                                                                                            |
| ---------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elements` | `Array<ShapeElement \| PathElement>` | A list of elements in the display order of elements, from back to front as given by the `elementIds` field in the [`Slide`](./crdt-documents.md#slide).                |
| `lock`     | `object \| undefined`                | If defined, the slide is locked and all edit operations are disabled in the UI. It doesn't contain details about the lock. These information will be filled on import. |

The `ShapeElement` and `PathElement` formats are used as described in the [CRDT Document Model][crdt-documents].

#### Example

```json
{
  "elements": [
    {
      // Element A
    },
    {
      // Element B
    },
    {
      // Element B
    }
  ],
  "lock": {}
}
```

[crdt-documents]: ./crdt-documents.md
