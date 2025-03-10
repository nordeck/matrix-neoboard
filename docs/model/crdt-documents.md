# CRDT Document Model

We are using [Yjs][adr004] to establish data structure that help us to collaborate between users.
Collaboration is performed on documents.
The model of these documents is described here.

There are two ways to interact with the document model:

- Yjs documents have special data types like `YMap`, `YArray`, and `YText` that allow to handle collaboration without conflicts.
  Modification operations are always performed with the model that uses these data types.
  Normal data types like `string`, `number`, etc. are still used, but don't provide any conflict handling capabilities.
- While reading, the Yjs documents are converted to plain JSON-like data structures.
  `YMap` is converted to an object, `YArray` to a normal array, and `YText` to a normal string.
  This makes validation and accessing the data in React components much simpler.

## Whiteboard Document

The central collaboration model is a whiteboard.

```
┌────────────┐
│            │
│ Whiteboard │
│            │
└─────┬──────┘
      │
      │ slides[]
      ▼
┌────────────┐
│            │
│   Slide    │          ┌──────────────┐
│            │          │              │
└─────┬──────┘       ┌──┤ ShapeElement │
      │              │  │              │
      │ elements[]   │  └──────────────┘
      ▼              │
┌────────────┐       │  ┌──────────────┐
│            │       │  │              │
│  Element   ├───────┼──┤ ImageElement │
│            │       │  │              │
└────────────┘       │  └──────────────┘
                     │
                     │  ┌──────────────┐
                     │  │              │
                     ├──┤ PathElement  │
                     │  │              │
                     │  └──────────────┘
                     │
                     │  ┌──────────────┐
                     │  │              │
                     └──┤ FrameElement │
                        │              │
                        └──────────────┘
```

### `Whiteboard`

A whiteboard contains a collection of ordered slides.

#### Fields

| Field      | Type                             | Description                      |
| ---------- | -------------------------------- | -------------------------------- |
| `slides`   | `Record<string, Slide>` / `YMap` | A map from slide IDs to slides.  |
| `slideIds` | `string[]` / `YArray<string>`    | The display order of the slides. |

The separation of slides and their order is explained in [ADR004][adr004].

#### Example

```json
{
  "slides": {
    "a": {
      // Slide A
    },
    "b": {
      // Slide B
    },
    "c": {
      // Slide C
    }
  },
  "slideIds": ["c", "a", "b"]
}
```

### `Slide`

A slide contains a collection of ordered elements.

#### Fields

| Field         | Type                                                   | Description                                                                     |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `elements`    | `Record<string, ShapeElement \| PathElement>` / `YMap` | A map from element IDs to elements.                                             |
| `elementIds`  | `string[]` / `YArray<string>`                          | The display order of the elements, from back to front.                          |
| `lock`        | `object \| undefined`                                  | If defined, the slide is locked and all edit operations are disabled in the UI. |
| `lock.userId` | `string`                                               | The user that locked the slide.                                                 |

The separation of elements and their order is explained in [ADR004][adr004].

#### Example

```json
{
  "elements": {
    "a": {
      // Element A
    },
    "b": {
      // Element B
    },
    "c": {
      // Element C
    }
  },
  "elementIds": ["c", "a", "b"]
}
```

### `ShapeElement`

An Element that has a shape attached, that has a text and a fill color.

#### Fields

| Field            | Type                                                                                               | Description                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `type`           | `'shape'`                                                                                          | Identifies the element as a shape.                                         |
| `kind`           | `'rectangle' \| 'circle' \| 'ellipse' \| 'triangle'`                                               | The kind of shape, defining its look.                                      |
| `position`       | `Point`                                                                                            | The position of the shape on the whiteboard canvas.                        |
| `width`          | `number`                                                                                           | Scaling of the shape on the x-axis.                                        |
| `height`         | `number`                                                                                           | Scaling of the shape on the y-axis.                                        |
| `fillColor`      | `string`                                                                                           | The fill color of the shape as [CSS color value][csscolor].                |
| `strokeColor`    | `string \| undefined`                                                                              | The border color of the shape as [CSS color value][csscolor].              |
| `strokeWidth`    | `number \| undefined`                                                                              | The border width of the shape in pixels.                                   |
| `borderRadius`   | `number \| undefined`                                                                              | The border radius of the shape in pixels.                                  |
| `text`           | `YText` / `string`                                                                                 | Text that is displayed in the shape.                                       |
| `textAlignment`  | `'left' \| 'center' \| 'right' \| undefined`                                                       | The alignment of the text in the shape.                                    |
| `textColor`      | `string \| undefined`                                                                              | The text color of the shape as [CSS color value][csscolor].                |
| `textBold`       | `boolean \| undefined`                                                                             | Should the text have a bold formatting?                                    |
| `textItalic`     | `boolean \| undefined`                                                                             | Should the text have an italic formatting?                                 |
| `textSize`       | `number \| undefined`                                                                              | Font size of the text in CSS pixel unit, `undefined` for auto text size.   |
| `textFontFamily` | `'Inter' \| 'Abel' \| 'Actor' \| 'Adamina' \| 'Chewy' \| 'Gwendolyn' \| 'Pirata One' \| undefined` | The font family of the text. Defaults to `"Inter"`.                        |
| `connectedPaths` | `string[] \| undefined`                                                                            | The IDs of connected path elements. Currently only lines can be connected. |

#### Example

```json
{
  "type": "shape",
  "kind": "circle",
  "position": { "x": 50, "y": 100 },
  "width": 100,
  "height": 200,
  "fillColor": "#ff0000",
  "text": "Hello World"
}
```

### `PathElement`

An element that consists of points.

#### Fields

| Field                   | Type                             | Description                                                                                     |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `type`                  | `'path'`                         | Identifies the element as a path.                                                               |
| `kind`                  | `'line' \| 'polyline'`           | The kind of path, either a straight `line` between two points or a `polyline` with many points. |
| `position`              | `Point`                          | The position of the path on the whiteboard canvas.                                              |
| `points`                | `Point[]`                        | The points of the path in relative coordinates to its position.                                 |
| `strokeColor`           | `string`                         | The stroke color of the path as [CSS color value][csscolor].                                    |
| `endMarker`             | `'arrow-head-line' \| undefined` | An optional marker for the end of a path.                                                       |
| `connectedElementStart` | `string \| undefined`            | The ID of connected element on the first point. Currently shapes can be connected.              |
| `connectedElementEnd`   | `string \| undefined`            | The ID of connected element on the last point. Currently shapes can be connected.               |

#### Example

```json
{
  "type": "path",
  "kind": "line",
  "position": { "x": 50, "y": 100 },
  "points": [
    { "x": 0, "y": 0 },
    { "x": 25, "y": 25 }
  ],
  "strokeColor": "#ff0000",
  "endMarker": "arrow-head-line"
}
```

### Connected elements

An ID is generated for each element that is added to the CRDT document. These IDs are used as well to store the
connections between the elements. These IDs are exported into nwb file and are loaded by import to assign
the same IDs in the CRDT document to the connected elements.

A connection happens when a line end is dropped over a shape's connection point.
For example, when a line start handle is dropped over the bottom right connection point of rectangle
the following data is produced:

Rectangle shape element with id: `E8LVfJCoYubKA-x2cuc0n`:

```json
{
  "type": "shape",
  "kind": "rectangle",
  "position": { "x": 100, "y": 100 },
  "fillColor": "#ffffff",
  "height": 200,
  "width": 200,
  "text": "Hello World",
  "connectedPaths": ["jmU4s3M4aysDWiSVKAXI2"]
}
```

Line element element with id: `jmU4s3M4aysDWiSVKAXI2`:

```json
{
  "type": "path",
  "kind": "line",
  "position": { "x": 300, "y": 300 },
  "strokeColor": "#ffffff",
  "points": [
    { "x": 0, "y": 0 },
    { "x": 400, "y": 400 }
  ],
  "connectedElementStart": "E8LVfJCoYubKA-x2cuc0n"
}
```

The application considers connections when operations (moving, resizing, etc) on elements are applied.
For example a line connected to a shape will be automatically resized and stay connected to the same point
of the shape when the shape element is moved or resized. This behaviour is also applied when multiple items
are selected.

### `ImageElement`

An image element

#### Fields

| Field      | Type                                                            | Description                                                                                                                      |
| ---------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | `'image'`                                                       | Identifies the element as an image.                                                                                              |
| `mxc`      | `string`                                                        | [MXC URI](https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris) pointing to the image.                        |
| `fileName` | `string`                                                        | Image file name.                                                                                                                 |
| `mimeType` | `'image/gif' \| 'image/jpeg' \| 'image/png' \| 'image/svg+xml'` | Supported image mime type. (Deprecated. We only have this field for backwards compatibility in the model. It isnt used anymore.) |
| `position` | `Point`                                                         | The position of the image on the whiteboard canvas.                                                                              |
| `width`    | `number`                                                        | Scaling of the image on the x-axis.                                                                                              |
| `height`   | `number`                                                        | Scaling of the image on the y-axis.                                                                                              |

#### Example

```json
{
  "type": "image",
  "mxc": "mxc://example.com/test1234",
  "fileName": "example.jpg",
  "position": { "x": 50, "y": 100 },
  "width": 100,
  "height": 200
}
```

### `FrameElement`

(Only with feature flag `REACT_APP_INFINITE_CANVAS`).

A frame element. Used to group elements and run structured presentations.

#### Fields

| Field      | Type      | Description                                           |
| ---------- | --------- | ----------------------------------------------------- |
| `type`     | `'frame'` | Identifies the element as a frame.                    |
| `position` | `Point`   | The position of the element on the whiteboard canvas. |
| `width`    | `number`  | Scaling of the element on the x-axis.                 |
| `height`   | `number`  | Scaling of the element on the y-axis.                 |

#### Example

```json
{
  "type": "frame",
  "position": { "x": 50, "y": 100 },
  "width": 100,
  "height": 200
}
```

### `Point`

Defines a `x` and `y` position on the whiteboard canvas.

#### Fields

| Field | Type     | Description                                          |
| ----- | -------- | ---------------------------------------------------- |
| `x`   | `number` | The position on the x-axis on the whiteboard canvas. |
| `y`   | `number` | The position on the y-axis on the whiteboard canvas. |

#### Example

```json
{
  "x": 100,
  "y": 50
}
```

[adr004]: ../adrs/adr004-using-yjs-as-a-crdt-implementation.md
[csscolor]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
