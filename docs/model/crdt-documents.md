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
      │
      │ slides[]
      │
      ▼
┌────────────┐
│            │
│ Slide      │
│            │
└─────┬──────┘
      │
      │                   ┌──────────────┐
      │ elements[]        │              │
      │             ┌─────┤ ShapeElement │
      ▼             │     │              │
┌────────────┐      │     └──────────────┘
│            ├──────┘
│ Element    │
│            ├──────┐
└────────────┘      │     ┌──────────────┐
                    │     │              │
                    └─────┤ PathElement  │
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

| Field       | Type                                                 | Description                                                 |
| ----------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `type`      | `'shape'`                                            | Identifies the element as a shape.                          |
| `kind`      | `'rectangle' \| 'circle' \| 'ellipse' \| 'triangle'` | The kind of shape, defining its look.                       |
| `position`  | `Point`                                              | The position of the shape on the whiteboard canvas.         |
| `width`     | `number`                                             | Scaling of the shape on the x-axis.                         |
| `height`    | `number`                                             | Scaling of the shape on the y-axis.                         |
| `fillColor` | `string`                                             | The fill color of the shape as [CSS color value][csscolor]. |
| `text`      | `YText` / `string`                                   | Text that is displayed in the shape.                        |

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

An Element that has a path with a stroke color.

#### Fields

| Field         | Type                   | Description                                                                                     |
| ------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `type`        | `'path'`               | Identifies the element as a path.                                                               |
| `kind`        | `'line' \| 'polyline'` | The kind of path, either a straight `line` between two points or a `polyline` with many points. |
| `position`    | `Point`                | The position of the path on the whiteboard canvas.                                              |
| `points`      | `Point[]`              | The points of the path in relative coordinates to its position.                                 |
| `strokeColor` | `string`               | The stroke color of the path as [CSS color value][csscolor].                                    |

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
  "strokeColor": "#ff0000"
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
