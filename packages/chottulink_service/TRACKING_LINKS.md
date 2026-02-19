# MacroMeals tracking links (ChottuLink + PostHog)

## Setup

1. Add `CHOTTULINK_API_KEY` to your env (`.env`, `.env.staging`, `.env.production`). Get the key from [ChottuLink](https://chottulink.com).
2. App is already wired: `ChottuLinkProvider` runs inside PostHog and sends `first_open_attribution` + UTM to PostHog on first open (including deferred install).

## PostHog

- **Event**: `first_open_attribution` (once per install when a link is resolved).
- **User properties (set once)**: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `install_attribution_link`, `install_is_deferred`.
- Use these in PostHog to segment by channel (Instagram, TikTok, X, etc.) and to keep attribution through signup/onboarding.

## Final tracking links for marketing

Create links in the ChottuLink dashboard (or via `createDynamicLink` in the app) with UTM parameters. Use **one link per channel** (or one link with different `utm_source` per channel) so PostHog can distinguish traffic.

| Channel    | Suggested `utm_source` | Use case        |
|-----------|------------------------|------------------|
| Instagram | instagram              | Bio link, stories |
| TikTok    | tiktok                 | Bio link, videos  |
| X (Twitter) | x                    | Bio link, posts   |

**Example production links** (replace with your ChottuLink short URLs):

- **Instagram**: `https://YOUR_DOMAIN.chottu.link/ig` (with `utm_source=instagram&utm_medium=social&utm_campaign=bio`)
- **TikTok**: `https://YOUR_DOMAIN.chottu.link/tt` (with `utm_source=tiktok&utm_medium=social&utm_campaign=bio`)
- **X**: `https://YOUR_DOMAIN.chottu.link/x` (with `utm_source=x&utm_medium=social&utm_campaign=bio`)

After creating links in ChottuLink, add them to social bios and campaigns. Install and first open will be attributed in PostHog with the chosen UTM values.

## Testing

### 1. Create a test link

- In the [ChottuLink Dashboard](https://chottulink.com), create a Dynamic Link for your domain `macromealsapp.chottu.link`.
- Set **destination** to your app (or a fallback like `https://macromealsapp.com`).
- Add UTM params for testing, e.g. `utm_source=test&utm_medium=manual&utm_campaign=testing`.
- Copy the short URL (e.g. `https://macromealsapp.chottu.link/abc123`).

### 2. Test on device

- **App already installed**
  - **iOS**: Paste the link in Safari or Notes and tap it. The app should open; PostHog should get `first_open_attribution` (or a link-open event) with UTM.
  - **Android**: Paste the link in Chrome (or send via Slack/email) and tap it. Same as above.
- **Deferred deep link (install from link)**
  - Uninstall the app. Open the ChottuLink URL in the browser → you should go to App Store / Play Store (if configured) or fallback. Install, open the app. On first launch the SDK should resolve the link and send attribution to PostHog with `install_is_deferred: true`.

### 3. Verify in PostHog

- **Events**: Filter by `first_open_attribution`.
- **User properties**: Check `utm_source`, `utm_medium`, `utm_campaign`, `install_attribution_link`, `install_is_deferred`.
- With `debug={__DEV__}` in `ChottuLinkProvider`, check Metro/console logs when opening a link.

### 4. Links from Twitter / Instagram / TikTok

You don’t use “Twitter’s” link directly. You use **your ChottuLink short URLs** everywhere:

- Create one (or more) links in ChottuLink with UTM, e.g. `utm_source=x&utm_medium=social&utm_campaign=post`.
- Put that ChottuLink URL in tweets, Instagram bio, TikTok bio, ads, etc.
- When someone taps it, they hit ChottuLink → your app opens (or store/fallback), and attribution is sent to PostHog with that `utm_source` (e.g. `x`, `instagram`, `tiktok`).

Use **one link per channel** (or one link with different `utm_source` per placement) so PostHog can tell traffic apart.
