# @macro-meals/chottulink-service

Configurable internal package for **ChottuLink** dynamic links and **UTM attribution** in React Native. Supports install → first open attribution and PostHog capture of `utm_source`, `utm_medium`, `utm_campaign` (and optional `utm_content`, `utm_term`).

## Features

- **Dynamic links** via [react-native-chottulink-sdk](https://www.npmjs.com/package/react-native-chottulink-sdk) (ChottuLink = Firebase Dynamic Links replacement).
- **UTM parameter tracking**: source, medium, campaign (and content, term) passed into the app and sent to PostHog.
- **First-open attribution**: one-time `first_open_attribution` event and `$set_once` user properties so attribution persists through signup/onboarding.
- **Configurable**: API key, optional PostHog callback, storage prefix, debug flag. Reusable across projects.

## Installation (in the app)

1. **Dependency** (already in workspace):
   ```json
   "@macro-meals/chottulink-service": "file:./packages/chottulink_service"
   ```

2. **Env** – set your ChottuLink API key (from [ChottuLink dashboard](https://chottulink.com)):
   ```bash
   CHOTTULINK_API_KEY=your_api_key_here
   ```
   Add to `.env`, `.env.staging`, `.env.production` (and in `react-native-config` / Expo env if used).

3. **App setup** – wrap your tree with the provider **inside** PostHog (so attribution can be sent to PostHog):
   ```tsx
   import { ChottuLinkProvider, buildPostHogAttributionHandler } from '@macro-meals/chottulink-service';
   import { usePosthog } from '@macro-meals/posthog_service/src';

   function ChottuLinkWithPostHog({ children }) {
     const posthog = usePosthog();
     const apiKey = Config.CHOTTULINK_API_KEY ?? '';
     if (!apiKey) return <>{children}</>;
     return (
       <ChottuLinkProvider
         apiKey={apiKey}
         onAttribution={posthog ? buildPostHogAttributionHandler(posthog) : undefined}
         debug={__DEV__}
       >
         {children}
       </ChottuLinkProvider>
     );
   }
   ```
   Place `ChottuLinkWithPostHog` inside `PosthogProvider` so `usePosthog()` is available.

## Usage

### 1. Attribution in PostHog

- **Event**: `first_open_attribution` (sent once per install when a link is resolved, including deferred).
- **User properties (set once)**: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `install_attribution_link`, `install_is_deferred`.
- You can filter or build dashboards in PostHog by `utm_source` (e.g. instagram, tiktok, x) and other UTM fields.

### 2. Getting last attribution (e.g. after signup)

```ts
import { useChottuLink } from '@macro-meals/chottulink-service';

const { getLastAttribution } = useChottuLink();
const attribution = await getLastAttribution();
// Use attribution.utm_source, .utm_medium, .utm_campaign, etc. e.g. set on user profile.
```

### 3. Creating tracking links (marketing)

Create short links with UTM params for campaigns. Use the **ChottuLink dashboard** to create links, or programmatically:

```ts
import { useChottuLink } from '@macro-meals/chottulink-service';

const { createDynamicLink } = useChottuLink();
const { shortURL } = await createDynamicLink({
  destinationURL: 'https://yourapp.com/welcome',
  domain: 'yourdomain.chottu.link',
  utmSource: 'instagram',
  utmMedium: 'social',
  utmCampaign: 'launch',
});
// Use shortURL in bio or ads.
```

## Production-ready tracking links

Create links in the [ChottuLink dashboard](https://chottulink.com) (or via API/SDK above) with:

- **Destination URL**: your app’s universal link / fallback (e.g. `https://macromealsapp.com` or a deep path).
- **UTM parameters**: `utm_source`, `utm_medium`, `utm_campaign` (and optionally `utm_content`, `utm_term`).

**Channel-specific examples** (use one link per channel so PostHog can distinguish):

| Channel   | utm_source  | utm_medium | utm_campaign (example) |
|----------|-------------|------------|-------------------------|
| Instagram| instagram   | social     | bio_link                |
| TikTok   | tiktok      | social     | bio_link                |
| X (Twitter) | x        | social     | bio_link                |

You can use a **single shareable link** for all channels and vary only `utm_source` by creating one link per source (e.g. `?utm_source=instagram` vs `?utm_source=tiktok`), or use ChottuLink’s link builder to add UTM to each link.

**Final deliverable**: one or more production short URLs (e.g. `https://yourdomain.chottu.link/xyz`) to add to social bios and campaigns; installs and first opens will be attributed in PostHog with the chosen UTM values.

## iOS / Android

- **iOS**: Ensure Universal Links are configured (associated domains + `apple-app-site-association`) as per ChottuLink and Apple docs.
- **Android**: Ensure App Links are configured (intent filters + `assetlinks.json`) as per ChottuLink and Google docs.
- The SDK handles deferred deep linking (install → first open) so attribution is preserved across install.

## Package API

- `ChottuLinkProvider` – React provider (init + Linking + native events + optional `onAttribution`).
- `buildPostHogAttributionHandler(posthog)` – returns `(attribution) => void` that tracks `first_open_attribution` and sets UTM once on the user.
- `chottulinkService` – singleton: `init`, `handleLink`, `onDeepLinkResolved`, `getLastAttribution`, `getAppLinkDataFromUrl`, `createDynamicLink`.
- `useChottuLink()` – hook: `getLastAttribution`, `createDynamicLink`, `isInitialized`.
- Types: `UTMAttribution`, `CreateDynamicLinkConfig`, `ChottuLinkConfig`, `ChottuLinkProviderProps`.
