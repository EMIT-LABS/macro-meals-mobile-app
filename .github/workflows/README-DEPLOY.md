# Deploy workflows (Fastlane)

Builds and deployments use **Fastlane** on GitHub Actions (no EAS).

| Flavor     | Env file           | iOS scheme     | Android variant | Deploy target                   |
| ---------- | ------------------ | -------------- | --------------- | ------------------------------- |
| dev        | `.env.development` | macromeals-stg | devDebug        | Local only                      |
| staging    | `.env.staging`     | macromeals-stg | stgRelease      | TestFlight / Firebase App Dist. |
| production | `.env.production`  | macromeals     | prodRelease     | TestFlight / Play Store         |

## Workflows

- **ios-deploy.yml** – Build with Xcode on `macos-latest`, upload to TestFlight via Fastlane.
- **android-deploy.yml** – Build with Gradle on `ubuntu-latest`, then Fastlane: staging → Firebase App Distribution, production → Play Store.
- **branch-flow-check.yml** – Runs on PRs to `main`; fails unless the source branch is `staging` (blocks dev → main).

## GitHub secrets

### iOS (TestFlight)

- **APPLE_TEAM_ID** – Apple Developer team ID (e.g. `B7JY43F6R4`).
- **APPLE_APP_ID** – App Store Connect app ID (numeric, e.g. `6747797496`).

Then **either** App Store Connect API key (recommended for CI). Use **one** of these naming sets in repo secrets:

- **APPSTORE_KEY_ID** – API key ID (or legacy **APP_STORE_CONNECT_API_KEY_ID**).
- **APPSTORE_ISSUER_ID** – Issuer ID (or legacy **APP_STORE_CONNECT_ISSUER_ID**).
- **APPSTORE_PRIVATE_KEY** – Full contents of the `.p8` key file (or legacy **APP_STORE_CONNECT_API_KEY**).

The workflow writes the key to a temp file so multiline `.p8` content is handled correctly.

**Or** app-specific password:

- **FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD** – From Apple ID account.

### Android – Firebase (staging)

- **FIREBASE_ANDROID_APP_ID** – Firebase Android app ID (e.g. `1:123456789:android:abc123`).
- **FIREBASE_SERVICE_ACCOUNT_JSON** – Full JSON of the Firebase service account key (for App Distribution).

### Android – Play Store (production)

- **GOOGLE_PLAY_SERVICE_ACCOUNT_JSON** – Full JSON of the Google Play Console service account key (for `supply`).

## Branches and deployment

| Branch      | Deploy on push                                                                | Use                                                                             |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **dev**     | None                                                                          | Default working branch; push feature branches here and merge to staging via PR. |
| **staging** | iOS + Android **staging** (TestFlight staging app, Firebase App Distribution) | Staging releases; update only by merging from `dev` (or a PR).                  |
| **main**    | iOS + Android **production** (TestFlight prod app, Play Store)                | Production releases; update only by merging from `staging` or `dev` (or a PR).  |

Flow: work on **dev** → open PR **dev → staging** for staging build → open PR **staging → main** (or **dev → main**) for production.

### Enforcing “no direct push” to main and staging (GitHub)

To block direct pushes to `main` and `staging` so all changes go via **dev** and pull requests:

1. In the repo go to **Settings → Code and automation → Branches**.
2. **Add branch protection rule** for **main**:
   - Branch name pattern: `main`
   - Enable **Require a pull request before merging** (require 1 approval if you want).
   - Enable **Do not allow bypassing the above settings** (and add no bypass list, or restrict bypass to admins only if you prefer).
   - Leave **Allow force pushes** and **Allow deletions** disabled.
   - Save.  
     Result: no one can push directly to `main`; updates must come from a PR (e.g. from `staging` or `dev`).
3. **Add branch protection rule** for **staging**:
   - Branch name pattern: `staging`
   - Same as above: require a pull request, no force push, no deletions.  
     Result: no direct push to `staging`; updates only via PR (typically from `dev`).

Optional: under **Rules applied to everyone including administrators**, enable **Do not allow bypassing** so even admins must use PRs. If you allow bypass for admins, they can still push directly in emergencies.

## Triggering

- **Push to `main`** – iOS and Android **production** (TestFlight prod app + Play Store).
- **Push to `staging`** – iOS and Android **staging** (TestFlight staging app + Firebase App Distribution).
- **Push to `dev`** – No deploy (local/feature work only).
- **Manual (workflow_dispatch)** – Run from any branch and choose **staging** or **production** for that run.

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
