# Auth Flow: GitHub / opengithub

Screenshots:

- `ralph/screenshots/inspect/auth-login.jpg`
- `ralph/screenshots/inspect/auth-signup.jpg`
- `ralph/screenshots/inspect/auth-password-reset.jpg`

## Target GitHub Auth Pages

### `/login`

Observed fields and actions:

- Header: "Sign in to GitHub".
- Username/email input: `name="login"`, `id="login_field"`, `autocomplete="username"`, required.
- Password input: `name="password"`, `id="password"`, `autocomplete="current-password"`, required.
- Submit: "Sign in".
- Secondary links/actions: "Forgot password?", "Create an account", "Sign in with a passkey".
- Hidden webauthn/passkey support inputs.

### `/signup`

Observed fields and actions:

- Header: "Sign up for GitHub".
- Social auth buttons: "Continue with Google", "Continue with Apple".
- Email input: `name="user[email]"`, required.
- Password input: `name="user[password]"`, required. Helper text says password should be at least 15 characters OR at least 8 characters including a number and lowercase letter.
- Username input: `name="user[login]"`, required. Helper text says username may contain alphanumeric characters or single hyphens and cannot begin or end with a hyphen.
- Email preferences section.
- Account verification through Octocaptcha.
- Submit is gated until validation/captcha passes.

### `/password_reset`

Observed fields and actions:

- Header: "Reset your password".
- Description: enter the verified email address and a reset link will be sent.
- Email input: `name="email"`, `id="email_field"`, placeholder "Enter your email address".
- Captcha is required.
- Submit: "Send password reset email".

## opengithub Auth Scope

`ralph-config.json` overrides the full GitHub target auth surface:

- Implement Better Auth with Google OAuth only.
- Do not implement GitHub OAuth.
- Do not implement Apple OAuth, passkeys, password login, signup passwords, password reset, or captcha unless the stack config changes.
- Rust Axum API must verify Better Auth session cookies or bearer tokens before returning protected repository/org/user data.

## opengithub Auth Flow

1. Unauthenticated users can view public marketing, public repository pages, public profiles, and public search results.
2. Protected actions redirect to `/login?next=<return-url>`.
3. `/login` shows the GitHub-style compact auth card with Octocat mark, product name, a single "Continue with Google" button, and terms/privacy links.
4. Better Auth completes Google OAuth and returns to the original `next` URL or `/dashboard`.
5. First login creates `users` and `accounts` records and seeds default notification/profile preferences.
6. `/logout` ends the Better Auth session and redirects to `/`.
7. Rust API rejects unauthenticated protected requests with HTTP 401 and JSON error envelope.

