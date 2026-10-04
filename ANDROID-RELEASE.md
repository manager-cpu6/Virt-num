# Numelixa Android APK release

## App identity
- Display name: Numelixa
- Android application ID: `com.numelixa.app`
- Website loaded inside the app: `https://numelixa.com`
- The app is a Capacitor Android WebView shell, so existing website/backend features remain server-powered and do not need a second implementation.

## Test APK
Every push to `main` runs **Numelixa Android APK** in GitHub Actions. Open the repository's **Actions** tab, select the newest workflow run, and download the `Numelixa-Android-test` artifact. This is a debug-signed installable test build, not the production release.

## One-time production signing setup
Create and safely back up a release keystore. Do not send its password or file to anyone.

On a computer with Java installed (or Termux with OpenJDK), run:
```bash
keytool -genkeypair -v -keystore numelixa-release.jks -alias numelixa -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 numelixa-release.jks > numelixa-release.base64
```
Keep both files and passwords in a secure backup. **Never lose the keystore**: Android updates must use the same signing key.

In GitHub, open **Settings → Secrets and variables → Actions → New repository secret** and add:
- `ANDROID_KEYSTORE_BASE64`: the entire one-line contents of `numelixa-release.base64`
- `ANDROID_KEY_ALIAS`: `numelixa` (or the alias you chose)
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password
- `ANDROID_KEY_PASSWORD`: the key password

Delete the temporary base64 file after securely saving the keystore and secrets.

## Publish a production APK
After the signing secrets are configured, create and push a version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions builds a signed APK and publishes it as `Numelixa.apk` on the GitHub Release. The website's `/download` page links to the latest release asset. For each update, use a new tag (for example `v1.0.1`, then `v1.1.0`); the workflow increments Android's versionCode from the GitHub Actions run number.

## Website link
The home page and navigation include **📱 Download Android App**. The download page is `https://numelixa.com/download`. The APK button points to the latest GitHub Release asset and will work after the first signed release has been published.
