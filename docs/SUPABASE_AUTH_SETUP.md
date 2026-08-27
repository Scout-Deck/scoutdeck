# Supabase authentication setup

ScoutDeck uses Supabase SSR cookies and confirms email on the server at `/auth/confirm`. Configure these settings in the Supabase dashboard before deploying.

## URL configuration

In **Authentication → URL Configuration**:

- Set **Site URL** to the one canonical production origin, for example `https://app.example.com`.
- Add `http://localhost:3000/**` to **Redirect URLs** for local work.
- Add the production origin as `https://app.example.com/**`.
- If preview deployments use a different host, add the provider's documented preview wildcard only for that domain, for example `https://*-your-team.vercel.app/**`.

Do not put a path after the Site URL. The confirmation template below appends the route itself.

## Confirm signup template

In **Authentication → Email Templates → Confirm signup**, set the confirmation link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

This sends a token hash to the ScoutDeck route, which calls `verifyOtp` and writes SSR-compatible session cookies before redirecting to `/profile`. It works when the email is opened in a different browser or device; it does not rely on a PKCE verifier kept in the signup browser.

Keep Confirm email enabled. If your mail provider rewrites or prefetches links, test a real confirmation email: automated link scanners can consume one-time authentication links. Disable email click tracking for this template when possible.

## Duplicate signups

When Supabase's confirmation setting obscures existing-email responses, the client switches the person to sign-in and explains that the account either exists or is awaiting confirmation. This preserves Supabase's account-enumeration protection while giving an actionable next step.
