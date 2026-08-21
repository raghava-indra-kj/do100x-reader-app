# Reader

Reader uses Google Identity Services for authentication. It does not use Firebase and it never accepts, stores, or displays a username/password credential.

## Google Sign-In configuration

1. In Google Cloud Console, create an OAuth 2.0 **Web application** client and configure the OAuth consent screen.
2. Add every browser origin that will show Reader under **Authorized JavaScript origins**. For local Vite development this is `http://localhost:5173`; add the deployed HTTPS origin for production.
3. Put the same public client ID in both runtime configuration files:

   - `reader-backend/.env`: `GOOGLE_CLIENT_ID="…apps.googleusercontent.com"`
   - `reader-frontend/public/env.json`: `"googleClientId": "…apps.googleusercontent.com"`

   The client ID is public by design. Do not put a Google client secret in either file; this sign-in flow does not need one. Set `APP_ORIGIN` in the backend `.env` to the Vite/deployed browser origin (comma-separate multiple origins).

4. Apply the intentionally clean schema change:

   ```powershell
   npm run db:reset
   ```

   This drops the legacy username/password data and recreates the database. It is intentional for this project’s small, disposable data set.

## Identity model

`user_account` is application-independent and stores only Google identity/profile data. `reader_profile` stores Reader-only navigation state, including the default home page. Tasks and future applications can reference the account ID while owning their own profile, membership, workspace, and authorization models.

Browser sessions are opaque, hashed server-side tokens stored in HTTP-only, SameSite cookies. The browser does not persist user identity in local storage or send a user-ID header. MCP access uses a separately generated high-entropy token that can be rotated from Settings.
