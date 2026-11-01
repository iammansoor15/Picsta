# Environment configuration

The app and backend read their public origin from environment variables. To use
the Winter deployment, put this in each project's `.env`:

```env
BASE_URL=https://winter.codebinary.in
```

For a fresh checkout, copy `.env.example` to `.env`. Actual `.env` files and
variants are ignored by Git. Each project has its own environment file.

## Mobile app

`react-native-dotenv` injects `BASE_URL` when Babel builds the app.
`src/config/AppConfig.js` supplies that URL to the API services, template
requests, server setup, and JavaScript deep links. Android obtains its link host
and scheme through the same loader and passes them to the manifest.

Set a valid HTTP(S) origin with no API path, credentials, query, or fragment.
Trailing slashes are removed. Missing or invalid values stop the build. Endpoint
paths such as `/api/auth` remain in code.

For local development, set `BASE_URL` to the backend address reachable from the
device. Server discovery no longer probes hardcoded IPs or localhost addresses.
The existing ServerConfig UI can still set an explicit session override.

Shell/CI `BASE_URL` values take priority over files. The loader supports the
package's mode files (`.env.development`, `.env.production`, `.env.local`) and
`ENVFILE` for selecting another base env file. Use the same env selection for
Metro and the native build. Android reads development settings for debug builds
and production settings for release builds.

After changing env values, stop Metro and restart it with:

```sh
npm start -- --reset-cache
```

Rebuild and distribute the app. Installed builds retain their bundled URL.

```sh
npm run verify:config
npm run test:config
```

These checks print the configured endpoints and verify that changes to env
files affect both Babel output and the Android configuration loader.

## Backend and web pages

Set `BASE_URL` in the deployed backend's environment or `.env`, preserving its
existing credentials and other settings, then restart the Node process.
`SERVER_URL` is supported as a legacy env alias when `BASE_URL` is absent.

The deletion form and admin pages obtain their API origin from
`/public-config.js`. It defaults to the server's `BASE_URL` and disables browser
caching. `PUBLIC_API_BASE_URL` is an optional env override for a separate API
origin. Include the web origin in `CORS_ORIGIN` when using a restricted list.

DNS, Nginx, and the HTTPS certificate must serve the selected hostname. Proxy the
full request path to the existing Node port. The deletion page remains:

```text
https://winter.codebinary.in/winter/account-delete-request
```

Changing code or env files locally does not update the deployed server or the
store's data deletion URL. Update those deployment settings when releasing.
