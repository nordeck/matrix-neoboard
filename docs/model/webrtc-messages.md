# WebRTC Message Model

This document describes to messages exchanged during real-time communication via WebRTC.
The message are exchanged as JSON via a data channel.
As one WebRTC connection is established per whiteboard, all messages are in the context of the current whiteboard.

## `net.nordeck.whiteboard.document_update` - CRDT Document Updates

This message is used to transmit delta updates to the CRDT documents to other peers.

### Content

| Field        | Type     | Description                                                                                    |
| ------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `documentId` | `string` | The id of the CRDT document this delta update belongs to.                                      |
| `data`       | `string` | A base64 encoded string of the binary representation of the delta update to the CRDT document. |

### Example

```json
{
  "type": "net.nordeck.whiteboard.document_update",
  "content": {
    "documentId": "<document-id>",
    "data": "<base64 encoded delta update>"
  }
}
```

## `net.nordeck.whiteboard.cursor_update` - User Cursor Updates

This message is used to transmit the current cursor position of a user to other peers.

### Content

| Field        | Type     | Description                                            |
| ------------ | -------- | ------------------------------------------------------ |
| `slideId`    | `string` | The id of the slide that the cursor is active on.      |
| `position`   | ––       | The position of the cursor on the slide.               |
| `position.x` | ––       | The position of the cursor on the slide on the x-axis. |
| `position.y` | ––       | The position of the cursor on the slide on the y-axis. |

### Example

```json
{
  "type": "net.nordeck.whiteboard.cursor_update",
  "content": {
    "slideId": "<slide-id>",
    "position": { "x": 100, "y": 200 }
  }
}
```

## `net.nordeck.whiteboard.focus_on` - Focus On

This message is used to focus every peers view onto a slide.

### Content

| Field     | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `slideId` | `string` | The id of the slide to focus. |

### Example

```json
{
  "type": "net.nordeck.whiteboard.focus_on",
  "content": {
    "slideId": "<slide-id>"
  }
}
```

## `net.nordeck.whiteboard.present_slide` - Present Slide

This message is used to notify the peers that a slide if currently presented.

### Content

| Field          | Type                  | Description                           |
| -------------- | --------------------- | ------------------------------------- |
| `view`         | `object \| undefined` | If defined, the sender is presenting. |
| `view.slideId` | `string`              | The id of the presented slide.        |

### Example

```json
{
  "type": "net.nordeck.whiteboard.present_slide",
  "content": {
    "view": {
      "slideId": "<slide-id>"
    }
  }
}
```
