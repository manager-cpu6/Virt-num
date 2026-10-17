# Numelixa Firebase Cloud Messaging (FCM) runbook

## Android 13+ notification permission

The Android app must declare `android.permission.POST_NOTIFICATIONS` in the merged Android manifest and request it at runtime on API 33+. The generated `MainActivity` requests permission from the foreground Activity after launch; the WebView permission flow must not race it with a second automatic request.

Expected Android log markers (filter Logcat by `NUMELIXA_PUSH`):
- `FCM_PERMISSION_REQUEST_START`: runtime dialog request issued.
- `FCM_PERMISSION_RESULT=granted` or `denied`: user's decision.
- `FCM_INIT_OK`: Firebase Android project initialized.
- `FCM_TOKEN_RECEIVED`: FCM returned a registration token (the token value is never logged).
- `FCM token registration HTTP 200`: registration API accepted the request.

If the prompt does not appear, inspect the merged manifest and target SDK in the built APK, then reset Android permission state or uninstall/reinstall the app. A user who denied permission previously may not see the dialog again; use Android App info > Notifications or reset the permission state for a clean first-launch test.

## Firebase project alignment

The Android client currently expects:
- Firebase project ID: `numelixa`
- Android package: `com.numelixa.app`
- Firebase project number: `832390289699`
- Android Firebase App ID: `1:832390289699:android:963bd5705215947fb51496`

The CI workflow validates `google-services.json`, the manifest permission, native permission request code, Firebase Messaging dependency, and presence of the native plugin in both debug and release APKs.

## Server credentials

Set the following in Vercel **Production** environment variables, then redeploy:
- `FIREBASE_PROJECT_ID=numelixa`
- `FIREBASE_CLIENT_EMAIL`: the Firebase project's service-account email
- `FIREBASE_PRIVATE_KEY`: the matching private key, with escaped newlines supported
- `MONGODB_URI`: database used for device tokens

Never expose `FIREBASE_PRIVATE_KEY` to browser JavaScript, APK assets, client responses, public logs, or source control. A service-account private key has privileged server access. Keep it in a server-side secret store (such as Vercel environment variables / a dedicated secret manager), restrict who can change it, and rotate it if exposed.

Changing the server service account does not change the Android package or the client `google-services.json`. Changing Android package/project app registration requires updating Firebase's Android app registration and rebuilding the APK.

## End-to-end acceptance test

1. Confirm the Android CI workflow is green and download the artifact from that exact run.
2. On Android 13+, uninstall the prior app or reset its notification permission state; install the artifact and cold-launch it.
3. Confirm the system Allow / Don't allow dialog appears.
4. Choose Allow. Confirm a token is created and `POST /api/notifications/register` returns HTTP 200.
5. Sign in and verify the admin dashboard's registered and linked device counts increase.
6. Use **Test this admin device** and verify the phone shows a native notification.
7. Repeat with app foregrounded, backgrounded, and screen locked. Check notification tap navigation and channel sound/importance.
8. Test Deny and verify the app remains usable, shows a clear path to Android notification settings, and does not falsely claim push is active.
9. Confirm invalid FCM tokens are removed and server logs never contain tokens or private keys.

A green build validates compilation and static checks only. It does not prove delivery to a physical phone; that requires the test above.
