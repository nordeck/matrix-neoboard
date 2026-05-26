# ADR001: Use event relations for the whiteboard elements

Status: superseded

> **Note**
> Due to limitations of this design, the data model was completely replaced in [ADR002][adr002].

<!-- These documents have names that are short noun phrases. For example, "ADR001: Deployment on Ruby on Rails 3.0.10" or "ADR009: LDAP for Multitenant Integration" -->

## Context

<!--
This section describes the forces at play, including technological, political, social, and project local. These forces are probably in tension, and should be called out as such. The language in this section is value-neutral. It is simply describing facts. -->

The whiteboard widget with the collaboration features needs a reliable data source to show a consistent image to every participant.
There are limitations on the data quality that the Widget API provides.
It is based on the client's (ex: Element) local timeline, which provides all available state events (ex: slides), but might only provide a limited window of room events (ex: elements) of the complete room timeline.
This leads to the situation where the widget can't be sure whether all elements available on the homeserver are also available via the Widget API.
[“Event Relationships”][msc2674-relationships] and [“Serverside aggregations of message relationships”][msc2675-relation-server-aggregation] are features of the Client-Server API which allow us to relate events to each other and retrieve a collection of related events from the server.
[MSC3869][msc3869-widget-api-relations] brings this feature to the Widget API and enables us to provide a reliable and deterministic way to load elements in the widget.

We want to be able to use `readEventRelations` of [MSC3869][msc3869-widget-api-relations] instead of `receiveRoomEvents` to read the elements.
We will need to change some event structures, but we don't expect backwards compatibility since the widget is in a prototype state.
We only focus on minimal changes and accept that the resulting data model is not yet optimal and that the data fetching is potentially slow.

## Decision

<!-- This section describes our response to these forces. It is stated in full sentences, with active voice. "We will ..." -->

1. We will emit a new `net.nordeck.whiteboard.slide` event for every slide in a whiteboard:

   ```yaml
   # the type of event
   type: 'net.nordeck.whiteboard.slide'

   # the room of the event
   room_id: '!my-room:…'

   # the user that created the whiteboard.
   sender: '@user-id'

   # the time of the event creation. we don't use it for anything yet.
   origin_server_ts: 0

   # the id of this event. it will be the target for all event relations.
   event_id: '<slide-event-id>'

   # empty content. can be extended in the future.
   content: {}
   #…
   ```

2. We will store the reference to the slide event(s) in the whiteboard:

   ```diff
     type: 'net.nordeck.whiteboard'
     state_key: '<unique-whiteboard-id>'
     room_id: '!my-room:…'
     content:
       controllingWidget: '<widget-id>'
       slides:
         - slideId: '<slide-id>'
           canCollaborate: '<true|false>'
   +       # the event_id of the slide event
   +       slideEventId: '<slide-event-id>'
       activeSlide: '<slide-id>'
     event_id: '$…'
   #…
   ```

3. We will change the element events to relate to the slide event:

   ```diff
     type: 'net.nordeck.whiteboard.element'
     room_id: '!my-room:…'
     sender: '@user-id'
     origin_server_ts: 0
     content:
       whiteboardId: '<whiteboard-id>'
       slideId: '<slide-id>'
       localId: '<event-id>'
   +   # m.relates_to by MSC2674
   +   m.relates_to:
   +     # m.reference by MSC3267
   +     rel_type: 'm.reference'
   +
   +     # the id of the slide event
   +     event_id: '<slide-event-id>'
       #…
     event_id: '<element-event-id>'
     #…
   ```

4. We will use the `m.reference` relation for edits and relate them to the slide event:

   > The `m.replace` annotation is of limited use here because it is intended
   > that only the original author or an event should be able to edit/replace
   > an event. While the Client-Server API doesn't enforce this rule, the
   > `matrix-react-sdk`'s function that is used by `readEventRelations`
   > enforces the rule. So we would not be able to read the latest edits of
   > other users.

   ```diff
     type: 'net.nordeck.whiteboard.element'
     room_id: '!my-room:…'
     sender: '@user-id'
     origin_server_ts: 0
     content:
       'm.new_content':
         whiteboardId: '<whiteboard-id>'
         slideId: '<slide-id>'
         localId: '<event-id>'
         #…
       m.relates_to:
   -     rel_type: 'm.replace'
   +     rel_type: 'm.reference'

         # the id of the slide event
         event_id: '<slide-event-id>'
       #…
     event_id: '<updated-element-event-id>'
     #…
   ```

5. We will change the element delete events to relate to the slide event:

   ```diff
     type: 'net.nordeck.whiteboard.element.delete'
     room_id: '!my-room:…'
     sender: '@user-id'
     origin_server_ts: 0
     content:
       localId: '<event-id>'
   +   # m.relates_to by MSC2674
   +   m.relates_to:
   +     # m.reference by MSC3267
   +     rel_type: 'm.reference'
   +
   +     # the id of the element event
   +     event_id: '<slide-event-id>'
       #…
     event_id: '$event-id'
     #…
   ```

Resulting data model:

```
                                        ┌──────────────────────────────┐
                                        │                              │
                                   ┌───►│             ...              │
                                   │    │                              │
                                   │    └──────────────────────────────┘
                                   │
                                   │    ┌──────────────────────────────┐
                                   │    │                              │
                                   ├───►│ net.nordeck.whiteboard.slide │
                                   │    │                              │
┌──────────────────────────────┐   │    └──────────────────────────────┘
│                              │   │
│    net.nordeck.whiteboard    ├───┤    ┌──────────────────────────────┐
│ (state_key: <whiteboard-id>) │   │    │                              │
│                              │   └───►│ net.nordeck.whiteboard.slide │
└──────────────────────────────┘        │                              │
                                        └──────────────────────────────┘
                                             ▲     ▲              ▲
                                             │     │              │
                   m.relates_to: m.reference │     │              │ m.relates_to: m.reference
                                             │     │              │
                ┌────────────────────────────┴───┐ │          ┌───┴───────────────────────────────────┐
                │                                │ │          │                                       │
                │ net.nordeck.whiteboard.element │ │          │ net.nordeck.whiteboard.element.delete │
                │                                │ │          │                                       │
                └────────────────────────────────┘ │          └───────────────────────────────────────┘
                                             ▲     │
                                             │     │
                                   (localId) │     │ m.relates_to: m.reference
                                             │     │
┌────────────────────────────────┐           │     │
│                                │           │     │
│ net.nordeck.whiteboard.element ├───────────┤     │
│        (m.new_content)         │           │     │
│                                ├───────────┼─────┤
└────────────────────────────────┘           │     │
                                             │     │
┌────────────────────────────────┐           │     │
│                                │           │     │
│ net.nordeck.whiteboard.element ├───────────┘     │
│        (m.new_content)         │                 │
│                                ├─────────────────┘
└────────────────────────────────┘
```

## Consequences

<!-- This section describes the resulting context, after applying the decision. All consequences should be listed here, not just the "positive" ones. A particular decision may have positive, negative, and neutral consequences, but all of them affect the team and project in the future. -->

After applying the changes to the events, we need to change how we read the events:

1. Read the whiteboard and extract the `slideEventId` for every slide.
2. For each `slideEventId`, fetch all events that have a `m.reference` relation to the `slideEventId`.

> We don't filter which events we want to receive because the filtering of events
> by type would only work on the server for unencrypted events since all events
> would be of type `m.room.encrypted`. By fetching `net.nordeck.whiteboard.element`
> and `net.nordeck.whiteboard.element.delete` in one call, we save an additional
> HTTP request and potentially duplicated decryption effort on the client to
> filter the events.

### Drawbacks

**Errors on missing events:**
When the slide event could not be loaded, the respective slide should be disabled and display an error.
These errors can happen when:

1. The history visibility of the whiteboard is configured so that users can't see events before they joined.
2. The client can't decrypt some events of a slide.

In the future, we could implement a repair feature where a moderator could rewrite all events of a slide to the room.
This could resolve **1.** and potentially also **2.** if the keys are missing due to not receiving old keys in the room invitation.
This could also solved by a redesigned event-format.

### Resulting Data Model

The proposed design will result in the following data model:

> # Data Format
>
> The “whiteboard widget” is a collaborative whiteboard widget for the Element messenger.
> Technically, it supports the following core features:
>
> 1. Multiple Whiteboards per room (based on the widget registration for now)
> 2. Multiple slides per whiteboard
> 3. Multiple elements per whiteboard
> 4. Elements can be edited and deleted
>
> Additionally, the following features are available:
>
> 1. Normal users can be forced to follow the slide of the moderator.
> 2. Collaboration by normal users can be disabled for each slide.
>
> The whiteboard uses the Matrix Widget API to store the data in a Matrix room.
>
> ## User Roles / User Permissions
>
> **Normal Users:**
> Users that can only view a single slide of the whiteboard by default.
> If enabled, users are able to manipulate the selected slide.
> If enabled, users are able to move between slides.
>
> **Moderator:**
> A user that prepares the contents of a slide and moves the user over the contents.
> A moderator can enable users to be able to manipulate the selected slide.
> A moderator can force users to follow them.
>
> ## Room Messages
>
> The whiteboard state is stored using the following events in a Matrix room:
>
> ```
>         ┌───────────────────────────┐
>         │                           │
>         │ im.vector.modular.widgets │
>         │ (state_key: <widget-id>)  │
>         │                           │
>         └───────────────────────────┘
>                      ▲
>                      │
>                      │ (controlling_widget)
>                      │
>        ┌─────────────┴───────────────┐
>        │                             │
>        │  net.nordeck.whiteboard     │
>        │ (state_key: <whiteboard-id>)│
>        │                             │
>        └─────────────────────────────┘
>                      ▲
>                      │
>                      │ (whiteboardId, slideId)
>                      │
>       ┌──────────────┴─────────────────┐
>       │                                │
>       │ net.nordeck.whiteboard.element │
>       │    (content.localId: <id>)     │
>       │                                │
>       └────────────────────────────────┘
>            ▲    ▲
>            │    │
> (local_id) │    │ m.relates_to: m.replace
>            │    │
>            │    │            ┌────────────────────────────────┐
>            │    │            │                                │
>            │    ├────────────┤ net.nordeck.whiteboard.element │
>            │    │            │        (m.new_content)         │
>            │    │            │                                │
>            │    │            └────────────────────────────────┘
>            │    │
>            │    │            ┌────────────────────────────────┐
>            │    │            │                                │
>            │    └────────────┤ net.nordeck.whiteboard.element │
>            │                 │        (m.new_content)         │
>            │                 │                                │
>            │                 └────────────────────────────────┘
>            │
>       ┌────┴──────────────────────────────────┐
>       │                                       │
>       │ net.nordeck.whiteboard.element.delete │
>       │        (content.localId: <id>)        │
>       │                                       │
>       └───────────────────────────────────────┘
> ```
>
> ### `net.nordeck.whiteboard` (State Event)
>
> Holds the state of a single whiteboard.
> Each whiteboard consists of multiple slides.
> Each whiteboard can only be controlled from a single widget installation.
>
> #### Content
>
> | Field                     | Type      | Description                                               |
> | ------------------------- | --------- | --------------------------------------------------------- |
> | `controllingWidget`       | `string`  | The ID of the widget that controls this whiteboard.       |
> | `slides[]`                | —         | An array of slides in this whiteboard.                    |
> | `slides[].slideId`        | `string`  | The ID of the slide.                                      |
> | `slides[].canCollaborate` | `boolean` | If `true`, the slide is read only for normal users.       |
> | `activeSlide`             | `string`  | The ID of the active slide. Moves all users to the slide. |
> | `pinnedSlide` (optional)  | `string?` | (unclear)                                                 |
>
> #### Example
>
> ```json
> {
>   "type": "net.nordeck.whiteboard",
>   "sender": "@user-id",
>   "state_key": "<whiteboard-id>",
>   "content": {
>     "controllingWidget": "!PDjBWGtWXKXyFutGgS%3Alocalhost_%40user%3Alocalhost_1665134486418",
>     "slides": [
>       {
>         "slideId": "RjS_rNKuF73ytY7Uiswfr",
>         "canCollaborate": true
>       }
>     ],
>     "activeSlide": "RjS_rNKuF73ytY7Uiswfr"
>   },
>   "event_id": "$event-id",
>   "room_id": "!room-id",
>   "origin_server_ts": 1665134498391
> }
> ```
>
> ### `net.nordeck.whiteboard.element` (Room Event)
>
> A single element on a whiteboard slide.
>
> #### Content
>
> > \* Floats can't be stored in Matrix so the values are stored as `string` instead.
> > See also [Signing JSON][matrix-spec-sign-json].
>
> | Field          | Type       | Description                                                    |
> | -------------- | ---------- | -------------------------------------------------------------- |
> | `whiteboardId` | `string`   | The ID of the whiteboard                                       |
> | `slideId`      | `string`   | The ID of the slide.                                           |
> | `localId`      | `string`   | The ID of this element.                                        |
> | `type`         | `string`   | The type of element (see below).                               |
> | `x`            | `string`\* | The `x` position in the slide.                                 |
> | `y`            | `string`\* | The `y` position in the slide.                                 |
> | `scale`        | `string`\* | (unused)                                                       |
> | `rotate`       | `string`\* | (unused)                                                       |
> | `translate.x`  | `string`\* | (unused)                                                       |
> | `translate.y`  | `string`\* | (unused)                                                       |
> | `strokeColor`  | `string`   | The color of the stroke as [CSS color value][css-color-value]. |
> | `strokeWidth`  | `number`   | The width of the stroke in pixels.                             |
> | `order`        | `string`\* | The order in relation to other elements.                       |
>
> ##### Shape
>
> Additional properties when `type` is one of `circle`, `ellipse`, `rectangle`, `triangle`, `block-arrow`.
>
> | Field       | Type       | Description                                           |
> | ----------- | ---------- | ----------------------------------------------------- |
> | `width`     | `string`\* | The width in pixels.                                  |
> | `height`    | `string`\* | The height in pixels.                                 |
> | `fillColor` | `string`   | The fill color as [CSS color value][css-color-value]. |
> | `text`      | `string`   | The text displayed in the shape.                      |
>
> ##### Points
>
> Additional properties when `type` is one of `line`, `polyline`.
>
> | Field        | Type       | Description                          |
> | ------------ | ---------- | ------------------------------------ |
> | `points[]`   | —          | An array of points that form a line. |
> | `points[].x` | `string`\* | The `x` position in the slide.       |
> | `points[].y` | `string`\* | The `y` position in the slide.       |
>
> #### Editing
>
> Existing elements are updated by means of [message editing][msc2676-message-editing].
> A new event is created that relates to the old event with a `m.replace` relationship and a replacement content in the `m.new_content` property.
>
> #### Example
>
> Shape Event:
>
> ```json
> {
>   "type": "net.nordeck.whiteboard.element",
>   "sender": "@user-id",
>   "content": {
>     "whiteboardId": "<whiteboard-id>",
>     "slideId": "RjS_rNKuF73ytY7Uiswfr",
>     "localId": "ifddVRnPKj8RFMiQUu2Ii",
>     "type": "rectangle",
>     "x": "680",
>     "y": "200",
>     "scale": "1",
>     "rotate": "0",
>     "translate": {
>       "x": "0",
>       "y": "0"
>     },
>     "strokeColor": "#000000",
>     "strokeWidth": 2,
>     "order": "1665134528491",
>
>     "height": "320",
>     "width": "440",
>     "fillColor": "#FFFFFF",
>     "text": ""
>   },
>   "event_id": "$element-event-id",
>   "room_id": "!room-id",
>   "origin_server_ts": 1665134529645
> }
> ```
>
> Points Element:
>
> ```json
> {
>   "type": "net.nordeck.whiteboard.element",
>   "sender": "@user-id",
>   "content": {
>     "whiteboardId": "<whiteboard-id>",
>     "slideId": "RjS_rNKuF73ytY7Uiswfr",
>     "localId": "2TVsNeJs9hEMYCupgKqVY",
>     "type": "line",
>     "x": "200",
>     "y": "80",
>     "scale": "1",
>     "rotate": "0",
>     "translate": {
>       "x": "0",
>       "y": "0"
>     },
>     "strokeColor": "#4a90e2ff",
>     "strokeWidth": 10,
>     "order": "1665403201815",
>
>     "points": [
>       {
>         "x": "0",
>         "y": "160"
>       },
>       {
>         "x": "360",
>         "y": "0"
>       }
>     ]
>   },
>   "event_id": "$element-event-id",
>   "room_id": "!room-id",
>   "origin_server_ts": 1665403202891
> }
> ```
>
> Updated Shape Event
>
> ```json
> {
>   "type": "net.nordeck.whiteboard.element",
>   "sender": "@user-id",
>   "content": {
>     "m.new_content": {
>       "whiteboardId": "<whiteboard-id>",
>       "slideId": "RjS_rNKuF73ytY7Uiswfr",
>       "localId": "ifddVRnPKj8RFMiQUu2Ii",
>       "type": "rectangle"
>       // ... other content
>     },
>     "m.relates_to": {
>       "rel_type": "m.replace",
>       "event_id": "$element-event-id"
>     }
>   },
>   "event_id": "$updated-element-event-id",
>   "room_id": "!room-id",
>   "origin_server_ts": 1665134529645
> }
> ```
>
> ### `net.nordeck.whiteboard.element.delete` (Room Event)
>
> A deletion marker of an element on a whiteboard slide.
>
> #### Content
>
> | Field     | Type     | Description             |
> | --------- | -------- | ----------------------- |
> | `localId` | `string` | The ID of this element. |
>
> #### Example
>
> ```json
> {
>   "type": "net.nordeck.whiteboard.element.delete",
>   "sender": "@user-id",
>   "content": {
>     "localId": "ifddVRnPKj8RFMiQUu2Ii"
>   },
>   "event_id": "$delete-event-id",
>   "room_id": "!room-id",
>   "origin_server_ts": 1665134574381
> }
> ```

<!-- This template is taken from a blog post by Michael Nygard http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[msc2674-relationships]: https://github.com/matrix-org/matrix-spec-proposals/pull/2674
[msc2675-relation-server-aggregation]: https://github.com/matrix-org/matrix-spec-proposals/pull/2675
[msc3869-widget-api-relations]: https://github.com/matrix-org/matrix-spec-proposals/pull/3869
[css-color-value]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
[matrix-spec-sign-json]: https://matrix.org/docs/spec/appendices#signing-json
[msc2676-message-editing]: https://github.com/matrix-org/matrix-spec-proposals/blob/main/proposals/2676-message-editing.md
[adr002]: ./adr002-multi-layer-communication-and-storage-architecture.md
