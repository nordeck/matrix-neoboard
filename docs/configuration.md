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

# optional - enables multiselect
REACT_APP_MULTISELECT=false

# optional - enable connection to React standalone devtools
# Does only work in development mode.
REACT_APP_DEVTOOLS=true
```
