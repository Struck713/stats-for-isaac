# Stats for Isaac

Records detailed stats for every run of The Binding of Isaac and uploads them to a website where
each run gets a shareable page.

- `mod/`: the Isaac mod (Lua). The save format is described in [mod/SCHEMA.md](mod/SCHEMA.md).
- `web/`: the website (Next.js, Drizzle, Postgres).
- `IsaacDocs/`: the modding docs ([wofsauge/IsaacDocs](https://github.com/wofsauge/IsaacDocs)) as a git
  submodule, used for reference and to generate item names. Clone with `--recurse-submodules`, or run
  `git submodule update --init` in an existing clone.

## Installing the mod

1. Copy or link `mod/` into the game's `mods` folder as `statsforisaac`. The game names the
   save-data folder after the installed folder name, so keep that name. For example:
   `mklink /J "<Isaac>\mods\statsforisaac" "<repo>\mod"`
2. Add `--luadebug` to the game's Steam launch options. Uploads need it (for LuaSocket and the
   bundled `lib/ssl.dll`). **This gives every installed mod full file and network access.**
   Without it, the mod still records runs locally.
3. Sign in on the website, make a token on the Account page, and run `sfi token <token>` in the
   debug console. `sfi status` shows whether uploads are working.

Other console commands: `sfi url <url>` (point at a dev server, e.g. `http://localhost:3000`),
`sfi upload` (retry now) and `sfi dump` (current floor summary).

### Native library (`mod/native/`)

The game ships LuaSocket but not TLS. `mod/lib/ssl.dll` is LuaSec with OpenSSL linked in
statically, built 32-bit against the game's `Lua5.3.3r.dll`. It's committed, so nobody has to build
it. To rebuild it (VS 2022 with C++, CMake and git are required):

```powershell
mod\native\build.ps1
mod\native\test-http.ps1 -GameDir "<Isaac install folder>"   # HTTPS smoke test through the game's Lua
```

## Running the website

```sh
cd web
npm install
cp .env.example .env.local   # optional in dev
npm run dev                  # http://localhost:3000
```

With no `DATABASE_URL`, dev uses PGlite, an embedded Postgres stored in `web/.data/`. Migrations
are applied automatically on first use. Set `DATABASE_URL` to use a real Postgres in production.
Steam sign-in works on localhost. Set `STEAM_API_KEY` to get names and avatars.

To try uploads without Steam, stop the dev server, run `npm run dev:seed` (it prints a token),
start the server again, then:

```sh
curl -X POST localhost:3000/api/runs -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" --data-binary @fixtures/sample-upload.json
```

Other scripts: `npm test`, `npm run typecheck`, `npm run lint`, `npm run db:generate` (after
changing `src/db/schema.ts`), `npm run gen:names` (regenerate item names from IsaacDocs).
