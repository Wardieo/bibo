# Bibo random video chat

This app now contains the core random matchmaking and LiveKit room flow. It uses exact queue sizes:

- `1` other person -> `2` total participants
- `2` other people -> `3` total participants
- `3` other people -> `4` total participants

## Local setup

1. Create a Supabase project and enable Anonymous Auth for this prototype.
2. Run `supabase/migrations/202609110001_random_matchmaking.sql` in the Supabase SQL editor.
3. Run `supabase/migrations/202609110002_fillable-rooms-chat.sql` after it. This enables rooms to open before full capacity and adds Realtime chat.
4. Run `supabase/migrations/202609110003_reset-stale-session.sql` after it. This releases abandoned browser sessions before a new match.
5. Deploy `supabase/functions/livekit-token` with `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` secrets.
6. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, and `VITE_LIVEKIT_URL`.
7. Run `npm run dev`.

The browser never receives the LiveKit API secret. The database RPC locks one logical queue at a time, checks block relationships, and creates a room atomically.

The current workspace is Vite-based rather than Next.js; the Supabase schema, Edge Function, and browser client boundaries are framework-independent and ready to move into a Next.js app if the scaffold is migrated later.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

# bibo
