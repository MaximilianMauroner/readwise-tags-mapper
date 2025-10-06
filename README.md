# Readwise Tags Mapper

## Development

Install dependencies:

```bash
bun install
```

Start the app in development mode (includes the API proxy and React UI):

```bash
bun dev
```

Run the Bun server in production mode:

```bash
bun start
```

Build static assets to `dist/`:

```bash
bun run build
```

## Configuring the Readwise access token

All communication with the Readwise API now relies on a secure HttpOnly cookie named `readwiseAccessToken`. The React UI exposes a "Readwise access token" panel where you can:

- Paste a token and save it. The server verifies the token against `https://readwise.io/api/v2/auth/` before it is stored.
- Test the entered token (without saving) or the currently stored token. Successful tests return a 204 response from Readwise.
- Clear the stored token.

Because the cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`, the token never touches client-side JavaScript. Modern browsers accept `Secure` cookies on `http://localhost`, but if your browser rejects the cookie you may need to use HTTPS for local development.

### API helpers (optional)

You can also manage the token without the UI using the built-in API routes:

- Save & validate a token:

```bash
curl -i -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"token":"<READWISE_TOKEN>"}'
```

- Test a token (if no body is provided, the stored cookie is used):

```bash
curl -i -X POST http://localhost:3000/api/session/test \
  -H "Content-Type: application/json" \
  -d '{"token":"<READWISE_TOKEN>"}'
```

- Check whether a token is present:

```bash
curl -s http://localhost:3000/api/session | bunx jq
```

- Clear the stored token:

```bash
curl -i -X DELETE http://localhost:3000/api/session
```

These endpoints all respond with 204 on success and an error payload (`{ "error": string }`) otherwise.
