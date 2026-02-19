# Environment Setup Guide

This guide explains how to set up different environments (development, staging, production) for the Macro Meals app with different icons and API endpoints.

## Overview

The app supports three environments:
- **Development**: For local development and testing
- **Staging**: For pre-production testing
- **Production**: For live app store releases

## Environment-Specific Icons

### Setting Up Icons

1. **Create your icon files** in the `assets/` directory:
   - `assets/icon.png` - Production icon (main app icon)
   - `assets/icon-staging.png` - Staging icon (with staging indicator)
   - `assets/icon-dev.png` - Development icon (with dev indicator)

2. **Icon specifications**:
   - Size: 1024x1024 pixels (PNG format)
   - For staging/dev icons, consider adding a small badge or different color scheme
   - Keep the same overall design for brand consistency

### Icon Design Suggestions

- **Production**: Clean, professional icon
- **Staging**: Add a small "S" or "STAGING" badge in corner
- **Development**: Add a small "DEV" badge or use different color scheme

## Environment Configuration

### API Endpoints

Each environment uses different API endpoints:

- **Development**: `https://api-dev.macromealsapp.com/api/v1`
- **Staging**: `https://api-staging.macromealsapp.com/api/v1`
- **Production**: `https://api.macromealsapp.com/api/v1`

### Environment Variables

The app automatically detects the environment and loads the appropriate configuration:

- `ENVIRONMENT`: Current environment name
- `API_BASE_URL`: Environment-specific API endpoint
- `APP_NAME`: Environment-specific app name
- `DEBUG_MODE`: Debug logging enabled/disabled
- `API_PASSWORD_BASE_URL`: (Optional) Alternate base URL used only for `/auth/reset-password` and `/auth/change-password`. When set (e.g. `https://api-dev.macromealsapp.com/api/v2`), those two endpoints use this URL instead of `API_BASE_URL` so you can point password flows at a different API version without changing the rest of the app.

## Building for Different Environments

### Using the Build Script

```bash
# Development build
./scripts/build.sh development

# Staging build
./scripts/build.sh staging

# Production build
./scripts/build.sh production

# Build for specific platform
./scripts/build.sh staging ios
./scripts/build.sh production android
```

### Using EAS CLI Directly

```bash
# Development
eas build --profile development --platform ios
eas build --profile development --platform android

# Staging
eas build --profile staging --platform ios
eas build --profile staging --platform android

# Production
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Deployment Process

### Development
- Use for daily development and testing
- Connects to development API
- Debug logging enabled
- Install on development devices

### Staging
- Use for pre-production testing
- Connects to staging API
- Limited debug logging
- Distribute to testers via internal distribution
- Can be installed alongside production app

### Production
- Use for app store releases
- Connects to production API
- No debug logging
- Submit to app stores

## File Structure

```
├── assets/
│   ├── icon.png              # Production icon
│   ├── icon-staging.png      # Staging icon
│   └── icon-dev.png          # Development icon
├── scripts/
│   ├── build.sh              # Build script
│   └── copy-icons.js         # Icon copy script
├── src/
│   └── config/
│       └── environment.ts    # Environment configuration
├── .env.development          # Development environment variables
├── .env.staging             # Staging environment variables
├── .env.production          # Production environment variables
├── app.json                 # App configuration
└── eas.json                 # EAS build configuration
```

## Troubleshooting

### Icon Not Found
If you see "Icon not found" errors:
1. Ensure all icon files exist in the `assets/` directory
2. Check file names match exactly: `icon.png`, `icon-staging.png`, `icon-dev.png`
3. Verify file permissions

### Wrong Environment Detected
If the app connects to the wrong API:
1. Check the `ENV` environment variable in your build
2. Verify the environment configuration in `src/config/environment.ts`
3. Ensure you're using the correct build profile

### Build Failures
If builds fail:
1. Check that all required files exist
2. Verify EAS configuration in `eas.json`
3. Ensure you have proper EAS access and credentials

## Best Practices

1. **Always test staging builds** before production
2. **Use different Firebase projects** for each environment
3. **Keep environment variables secure** and never commit sensitive data
4. **Document any environment-specific features** or configurations
5. **Test icon changes** on both iOS and Android before deploying

## Support

For issues with environment setup:
1. Check the troubleshooting section above
2. Review the build logs for specific error messages
3. Verify all configuration files are properly set up 