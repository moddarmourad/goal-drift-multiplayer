# Goal Drift

Goal Drift is a browser-playable car-soccer game with touch controls, an installable mobile web app shell, local garage customization, five selectable stadiums, public matchmaking, and private rooms for up to four players.

## Run locally

Install Node.js 18 or newer, install the project dependencies, then start the server with `npm start`. Open `http://localhost:3000` in a browser. The WebSocket room service is served by the same process at `/multiplayer`.

## Online play

1. Host the game on a public HTTPS-capable Node.js service and set its `PORT` environment variable if required by the host.
2. Select a stadium from Neon City, Sunset Ruins, Glacier Dome, Wildwood Bowl, or Lunar Station. The room host’s selection is shared with everyone in that match.
3. Choose **Quick play · find anyone** to get matched with another player without inviting them.
4. Or select **Create room · up to 4** and share the invite link or six-character code. A room supports you plus up to three friends; the host starts once at least one other player has joined.
5. Two players play 1v1; three or four players use 2v2 teams. Empty seats in a partially-filled private room are filled by bots. Offline play remains available.

The host relays room inputs and game snapshots through the Node.js server. Public matchmaking pairs players who are searching at the same time. A public deployment must support persistent WebSocket connections and HTTPS/WSS. `file://` previews and static-only hosting cannot provide online rooms. Latency and mobile network quality affect online play.

## Deploy the online game with Render

The included `render.yaml` deploys the complete game and its WebSocket server as one Render web service. Publish this project to a Git provider such as GitHub, create a Render Blueprint from that repository, and apply the `goal-drift-multiplayer` service. Render will run `npm ci`, start the app with `npm start`, and check `/health`. Use the HTTPS URL Render assigns to the service for playing and sharing room invites. The Vercel frontend can also use this Render WebSocket backend after redeploying this version of `index.html`.

Keep this service to one instance: room codes and matchmaking queues are held in memory and are not shared across instances. On Render's free plan, the service may spin down after inactivity, so the first connection after a quiet period can take a little longer.

## Mobile

Open the hosted HTTPS URL on a phone. The game has touch steering/actions and safe-area-aware responsive layouts. On supported browsers, use **Add to Home Screen** / **Install app** to launch it in a standalone window. Landscape orientation is recommended.

## PWABuilder / Google Play

The manifest includes the required 192×192 and 512×512 PNG icons, maskable artwork, game categories, language, and display preferences. After deploying, retest the public URL in PWABuilder and package the Android/TWA build. The report's screenshots, app-store/native-app association, and IARC rating prompts are additional setup: add genuine screenshots and only enter a rating/app ID after those have been created or assigned in the store workflow. After signing the Android package, publish the matching SHA-256 certificate fingerprint and application ID in `/.well-known/assetlinks.json` for verified full-screen TWA display.

## Checks

`GET /health` returns a small JSON status response. Rooms have a four-player limit and use short invite codes; share private room codes only with people you intend to invite.
