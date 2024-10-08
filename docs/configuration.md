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

# Indicate if the widget is embedded in standalone mode
REACT_APP_EMBEDDED=false
```

## Room power level

User needs to have permissions to send these events to initialize a whiteboard:

- `net.nordeck.whiteboard` state event that creates a new board
- `net.nordeck.whiteboard.sessions` state event that enables real-time collaboration with this user on the board

User will need to wait for the moderator to join and initialize the room and whiteboard if the user doesn't have these permissions.

### Customization

More environment variables for UI customization [@matrix-widget-toolkit/mui](https://www.npmjs.com/package/@matrix-widget-toolkit/mui#customization).
