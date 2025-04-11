# Model

The business data model of the whiteboard consists of the following entities:

- A **room**: Contains whiteboards and widgets.
- A **widget**: Displays a single whiteboard at a time, but users can switch between which whiteboard is displayed.
- A **whiteboard**: A collection of slides that belong to each other.
- A **slide**: A canvas that the user draws multiple elements on.
- An **element**: A shape that has properties like position, color, … that is placed on a slide.

```
┌────────────────────┐
│                    │
│  Room              ├────────────┐
│                    │   1:n      │
└───┬────────────────┘            │
    │                             │
    │ 1:n                         │
    ▼                             ▼
┌────────────────────┐        ┌─────────────────────┐
│                    │        │                     │
│  Widget            ├───────►│  Whiteboard         │
│                    │ n:0..1 │                     │
└────────────────────┘        └───┬─────────────────┘
                                  │
                                  │  1:n
                                  ▼
                              ┌─────────────────────┐
                              │                     │
                              │  Slide              │
                              │                     │
                              └───┬─────────────────┘
                                  │
                                  │  1:n
                                  ▼
                              ┌─────────────────────┐
                              │                     │
                              │  Element            │
                              │                     │
                              └─────────────────────┘
```

Due to the architecture of the whiteboard, we have different communication and storage protocols.
Each of these protocols uses its own set of models:

- [CRDT Documents](./crdt-documents.md)
- [Matrix Events](./matrix-events.md)
- [Matrix Events when using MatrixRTC](./matrix-rtc-events.md)
- [Real-Time WebRTC Messages](./webrtc-messages.md)
- [Export Data Format](./export-format.md)
