# Desktop CORS — why the Worlds page cannot call the dashboard

The Desktop page in `desktop/plugin.js` loads worlds with `fetch('http://127.0.0.1:9119/...')`.
That call runs inside the Desktop renderer. The dashboard process answers it,
then the renderer throws the response away because the two origins do not match.

The dashboard tab does not hit this. It is already on the dashboard origin, so
`SDK.fetchJSON('/api/plugins/...')` is same-origin.

A terminal `curl` to `127.0.0.1:9119` also succeeds. CORS is a browser rule.
curl is not a browser.

## What is failing

`desktop/plugin.js` (`apiList`, `apiView`, `useAsset`):

```js
const DASH = 'http://127.0.0.1:9119'
fetch(`${DASH}/api/plugins/hermes-worlds/worlds`)
```

Hermes Desktop loads its UI with `webSecurity: true`. Packaged builds prefer an
HTTP renderer, and fall back to `file://` when that server is not running
(`apps/desktop/electron/main.ts`, `buildSessionWindowUrl`). A `file://` page
has origin `null`. A custom scheme such as `app://hermes` is a third origin.
Neither is `http://127.0.0.1`.

The dashboard allows only this pattern
(`hermes_cli/web_server.py`):

```python
# CORS: localhost origins only — allow_origins=["*"] on 0.0.0.0 would let any
# website read/modify config and secrets.
allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
```

`Origin: null` and `Origin: app://hermes` do not match. FastAPI then omits
`Access-Control-Allow-Origin`. Chromium reports that as a CORS failure even
when the server returned 200.

`/api/` is also session-token gated. That is a separate 401. Do not treat a
CORS error as a missing token. If DevTools shows status `(failed)` and no
response headers, it is CORS. If status is 401 and the origin was allowed,
it is the token.

## Confirm in DevTools

On the Worlds page, open the renderer console and the failed request.

| Request `Origin` | Meaning |
|---|---|
| `null` | Page is `file://`. Dashboard will not allow it. |
| `app://hermes` (or any non-http scheme) | Same. Not in the regex. |
| `http://127.0.0.1:<port>` or `http://localhost:<port>` | Origin is allowed. If it still says CORS, look for a preflight that asked for `Access-Control-Allow-Private-Network`. If the status is 401, stop looking at CORS and send the dashboard session header the web app uses. |

The page copy that says “the dashboard token-gates /api/” is the 401 case.
It is the wrong explanation when the console says “blocked by CORS policy”.

## Fix

Implement [desktop-file-handoff.md](desktop-file-handoff.md). The notes below
are the investigation; that handoff is what to build.

## Fixes that belong in this plugin

Do not widen the dashboard to `allow_origins=["*"]`. That comment exists
because the dashboard can read config and secrets. Do not allow `Origin: null`
either: any local HTML file would then be a trusted caller.

### 1. Stop calling 9119 from the renderer (preferred)

The world files are already on disk:

```text
$HERMES_HOME/worlds/<id>/world.json
$HERMES_HOME/worlds/<id>/state.json
$HERMES_HOME/worlds/<id>/assets/...
```

Read those from a context that is not the page origin. Desktop plugins may
only import `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime`, so
`node:fs` will not resolve. In `register(ctx)`, log the keys of `ctx` and
`host` once and use a file or gateway helper if one is actually there.
Pixel Worlds never `fetch`es the dashboard; it uses `host` and `ctx.storage`.

If no file helper exists, keep the HTTP call out of `fetch`. A main-process
bridge is not subject to renderer CORS. Do not invent one that is not in the
SDK.

### 2. Only if the renderer origin is already localhost

If DevTools shows `Origin: http://127.0.0.1:<port>`, CORS is already
satisfied and the next failure is the session token. Copy the header the
dashboard bundle sends (`X-Hermes-Session-Token` or `Authorization: Bearer …`
in `web_server.py`, `_has_valid_session_token`). Take that value from an SDK
helper if one exists. Do not read the token file from the plugin.

### 3. Images

`useAsset` uses `fetch`, so it is under the same CORS rule. An `<img src="http://127.0.0.1:9119/...">`
can paint without CORS, and still 401 if the route is token-gated. Prefer
reading asset bytes next to `world.json` and using a `blob:` URL created in
the page. `blob:` is same-origin to the renderer.

## What not to do

- Do not add `Access-Control-Allow-Origin: *` on `plugin_api.py`. The dashboard
  middleware in front of it is the policy that matters, and it is intentional.
- Do not proxy the call through `https://mybot.farm`. The farm catalog plugin
  can `fetch` the public site because that site sends `Access-Control-Allow-Origin: *`.
  Planted worlds are local files, not farm HTTP.
- Do not list `/api/profiles` when the gateway call fails.

## Done when

The Worlds page renders Neon Harbor with the dashboard closed, or with
DevTools showing no request to `127.0.0.1:9119`. Place tabs still do not
write `state.json`.
