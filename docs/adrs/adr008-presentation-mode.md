# ADR008: Presentation mode

Status: accepted

<!--
These documents have names that are short noun phrases. For example, "ADR001:
Deployment on Ruby on Rails 3.0.10" or "ADR009: LDAP for Multitenant Integration"
-->

## Context

<!--
This section describes the forces at play, including technological, political,
social, and project local. These forces are probably in tension, and should be
called out as such. The language in this section is value-neutral. It is simply
describing facts. -->

The whiteboard widget needs a mode where one user presents the slides of the whiteboard to other viewers.
The presenter sees the original application layout and can freely switch slides and edit them.
The viewers will always see the slide that the presenter is looking at.
The viewers only see a single slide and can neither edit them nor switch to another slide.

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

We will use the real-time communication channel specified in [ADR006][adr006] to distribute the following information:

1. Is a presentation active?
2. Who is presenting?
3. Which slide is viewed by the presenter?

We will distribute the information in a `net.nordeck.whiteboard.present_slide` message.
The session ID of the sender of a message with a defined `content.view` object will be the active presenter.
The data format of the event is described in the [WebRTC message model][webrtc-message-model].

## Consequences

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

Since the whiteboard doesn't provide a permission system yet, every user will be able to start a presentation.
The presentation will only work if the real-time communication channel between the users is established and working.

### Presentation States

The following sequence diagram shows the exchanged messages during a presentation:

```
              ┌───────────┐
              │           │                                         ┌──────────┐
              │ Presenter │                                         │ Viewer 1 │
              │           │                                         └──┬───────┘
              └─────┬─────┘                                            │
                    │                                                  │ ┌──────────┐
  < Start widget >  │                                                  │ │ Viewer 2 │
  <  at slide 1  >  │                                                  │ └──┬───────┘
                    │                                                  │    │
                    │                                                  │    │ ┌──────────┐
Start presentation  │                                                  │    │ │   ...    │
───────────────────►│  content: {"view":{"slideId": "slide-1"}}        │    │ └──┬───────┘
                    ├───────────────────────────────────────────┬───┬─►│    │    │
                    │                                           │   └──┼───►│    │
                    │                                           └──────┼────┼───►│
Switch to slide 4   │                                                  │    │    │
───────────────────►│  content: {"view":{"slideId": "slide-4"}}        │    │    │
                    ├───────────────────────────────────────────┬───┬─►│    │    │
                    │                                           │   └──┼───►│    │
                    │                                           └──────┼────┼───►│
Stop presentation   │                                                  │    │    │
───────────────────►│  content: {}                                     │    │    │
                    ├───────────────────────────────────────────┬───┬─►│    │    │
                    │                                           │   └──┼───►│    │
                    │                                           └──────┼────┼───►│
                    │                                                  │    │    │
                    │                                                  │    │    │
```

Once a presenter starts the presentation, the viewers should not be stuck in the presentation view if the presenter leaves the widget.
The presentation mode at the viewers should be cancelled when the communication channel to the presenter-session is closed.
This can happen either due to connectivity problems or because the presenter closed the widget.

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[adr006]: ./adr006-webrtc-for-real-time-communication.md
[webrtc-message-model]: ../model/webrtc-messages.md
