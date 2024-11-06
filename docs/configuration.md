# Configuration

Runtime configuration can be performed via environment variables.

- You can configure the environment variables at the container for production
- You can configure an [`.env` file](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) for local development.

## Environment Variables

```sh
# Base URL of the or a homeserver, used to display avatars (required)
REACT_APP_HOME_SERVER_URL=https://matrix-client.matrix.org

# External link to the documentation that will be shown in the help menu if defined.
REACT_APP_HELP_CENTER_URL="https://github.com/nordeck/matrix-neoboard"

# optional - enable connection to React standalone devtools
# Does only work in development mode.
REACT_APP_DEVTOOLS=true

# Indicate if the widget is embedded in standalone mode to hide the about button
REACT_APP_EMBEDDED=false
```

### Customization

More environment variables for UI customization [@matrix-widget-toolkit/mui](https://www.npmjs.com/package/@matrix-widget-toolkit/mui#customization).

## Room power level

User needs to have permissions to send these events to initialize a whiteboard:

- `net.nordeck.whiteboard` state event that creates a new board
- `net.nordeck.whiteboard.sessions` state event that enables real-time collaboration with this user on the board

User will need to wait for the moderator to join and initialize the room and whiteboard if the user doesn't have these permissions.

## Rate limiting settings

For a good NeoBoard experience rate limiting settings need to be tweaked.

NeoBoard sends one snapshot every 5 seconds, if the board changed. One snapshot may consist of multiple chunk events.
If you upload images, there is one media upload per image. Uploads also happen when importing a NeoBoard.

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

Loosening the rate limiting settings also means people are allowed to send more messages to a room or upload more media files within a short time.
