# Deploy workflows (Fastlane)

Builds and deployments use **Fastlane** on GitHub Actions (no EAS).

| Flavor     | Env file           | iOS scheme      | Android variant   | Deploy target                    |
|-----------|--------------------|-----------------|-------------------|-----------------------------------|
| dev       | `.env.development` | macromeals-stg  | devDebug          | Local only                        |
| staging   | `.env.staging`     | macromeals-stg  | stgRelease        | TestFlight / Firebase App Dist.   |
| production| `.env.production` | macromeals      | prodRelease       | TestFlight / Play Store           |

## Workflows

- **ios-deploy.yml** – Build with Xcode on `macos-latest`, upload to TestFlight via Fastlane.
- **android-deploy.yml** – Build with Gradle on `ubuntu-latest`, then Fastlane: staging → Firebase App Distribution, production → Play Store.

## GitHub secrets

### iOS (TestFlight)

- **APPLE_TEAM_ID** – Apple Developer team ID (e.g. `B7JY43F6R4`).
- **APPLE_APP_ID** – App Store Connect app ID (numeric, e.g. `6747797496`).

Then **either** App Store Connect API key (recommended for CI):

- **APP_STORE_CONNECT_API_KEY_ID** – API key ID.
- **APP_STORE_CONNECT_ISSUER_ID** – Issuer ID.
- **APP_STORE_CONNECT_API_KEY** – Full contents of the `.p8` key file.

**Or** app-specific password:

- **FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD** – From Apple ID account.

### Android – Firebase (staging)

- **FIREBASE_ANDROID_APP_ID** – Firebase Android app ID (e.g. `1:123456789:android:abc123`).
- **FIREBASE_SERVICE_ACCOUNT_JSON** – Full JSON of the Firebase service account key (for App Distribution).

### Android – Play Store (production)

- **GOOGLE_PLAY_SERVICE_ACCOUNT_JSON** – Full JSON of the Google Play Console service account key (for `supply`).

## Triggering

- **Push to `main`** – iOS and Android **production** (TestFlight + Play Store).
- **Manual (workflow_dispatch)** – Choose **staging** or **production** for that run.

## Fastlane layout

- **Gemfile** (repo root) – Fastlane + CocoaPods for iOS.
- **ios/fastlane/Fastfile** – Lanes `staging`, `production` (build_app + upload_to_testflight).
- **ios/fastlane/Appfile** – App identifier, Apple ID, team ID (override via env in CI).
- **android/Gemfile** – Fastlane + firebase_app_distribution plugin.
- **android/fastlane/Fastfile** – Lanes `staging` (assembleStgRelease + Firebase), `production` (bundleProdRelease + supply).

## Signing (iOS)

CI uses **automatic** signing in the Fastfile. Ensure the runner (or your Apple account) has:

- A distribution certificate and provisioning profile for the app, **or**
- [fastlane match](https://docs.fastlane.tools/actions/match/) set up and invoked from the Fastfile.

If you use Match, add a `match` lane and call it before `build_app` in the staging/production lanes.

## Local Fastlane

```bash
# iOS (from repo root)
cd ios && bundle exec fastlane ios staging   # or production

# Android (from repo root)
cd android && bundle exec fastlane android staging   # or production
```

Install gems first: from repo root `bundle install`, and from `android/` run `bundle install` for the Android Gemfile.
