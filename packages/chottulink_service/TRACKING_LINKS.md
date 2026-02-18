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

- **iOS**: Use a ChottuLink short URL in Safari (or Notes); install the app if needed; open the link → app should open and PostHog should receive `first_open_attribution` with UTM.
- **Android**: Same with a ChottuLink short URL in Chrome.
- In PostHog, filter by event `first_open_attribution` or by user properties `utm_source`, `utm_medium`, `utm_campaign`.
