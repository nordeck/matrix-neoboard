# Configuration

Runtime configuration can be performed via environment variables.

- You can configure the environment variables at the container for production
- You can configure an [`.env` file](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) for local development.

## Environment Variables

```sh
# Base URL of the or a homeserver, used to display avatars
REACT_APP_HOME_SERVER_URL=https://matrix-client.matrix.org

# optional: External link to the documentation that will be shown in the help menu
REACT_APP_HELP_CENTER_URL="https://github.com/nordeck/matrix-neoboard"

# optional: Enable connection to React standalone devtools
# Only works in development builds
REACT_APP_DEVTOOLS=true
```

### Customization

More environment variables exist for UI customization and are inherited from and documented by our framework [@matrix-widget-toolkit/mui](https://www.npmjs.com/package/@matrix-widget-toolkit/mui#customization).

### Experimental Features

We sometimes use feature flags during development of bigger new features when using a long running feature branch would mean too much work spent on rebasing repeatedly.

```sh
# optional: Indicate if the widget is embedded, e.g. in standalone mode, to enable/disable respective features.
REACT_APP_EMBEDDED=false

# optional: Select the Realtime Communication (RTC) implementation (defaults to `webrtc`, otherwise `matrixrtc`)
REACT_APP_RTC=webrtc

# optional: Defines a LiveKit JWT Service URL that is added to the RTC session `foci_preferred` list
REACT_APP_RTC_LIVEKIT_SERVICE_URL=https://lk-jwt.example.org

# optional: Use infinite canvas instead of slides mode (defaults to `false`)
REACT_APP_INFINITE_CANVAS=false
```

## Room power level

User needs to have permissions to send these events to initialize a whiteboard:

- `net.nordeck.whiteboard` state event that creates a new board
- `net.nordeck.whiteboard.sessions` state event that enables real-time collaboration with this user on the board

User will need to wait for the moderator to join and initialize the room and whiteboard if the user doesn't have these permissions.

## Rate limiting settings

For a good NeoBoard experience rate limiting settings need to be tweaked.

NeoBoard sends one snapshot every 5 seconds, if the board changed. One snapshot may consist of multiple chunk events.
If you added images to the board, there is one media upload per image. Uploads also happen when importing a NeoBoard.

Because of that we recommend at least the following settings (using Synapse as an example):

```yml
rc_message:
  per_second: 5
  burst_count: 25
rc_media_create:
  per_second: 20
  burst_count: 100
```

The calculation base for these settings is:

- 1 snapshot with 10 chunks = 11 events in 5 seconds + additional messages sent by the user
- It is possible to import a NeoBoard with 100 images

You can find more information about where to set the rate limiting settings [in the Synapse configuration manual](https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html#ratelimiting).

Loosening the rate limiting settings also means people are allowed to send more messages to a room or upload more media files within a short time outside of NeoBoard, so these settings should be adjusted with care.
