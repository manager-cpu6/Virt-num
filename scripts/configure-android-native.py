#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT=Path("android")
APP=ROOT/"app"
JAVA=APP/"src/main/java/com/numelixa/app"
PLUGIN_JAVA=Path("plugins/numelixa-google-sign-in/android/src/main/java/com/numelixa/app")
RES=APP/"src/main/res"
XML=RES/"xml"
JAVA.mkdir(parents=True,exist_ok=True)
XML.mkdir(parents=True,exist_ok=True)

root_gradle=ROOT/"build.gradle"
app_gradle=APP/"build.gradle"

r=root_gradle.read_text()
if "com.google.gms:google-services:4.5.0" not in r:
    marker="dependencies {"
    if marker not in r: raise SystemExit("Android root Gradle dependencies block not found")
    r=r.replace(marker,marker+"\n        classpath 'com.google.gms:google-services:4.5.0'",1)
root_gradle.write_text(r)

a=app_gradle.read_text()
if "com.google.firebase:firebase-bom:34.19.0" not in a:
    marker="dependencies {"
    if marker not in a: raise SystemExit("Android app Gradle dependencies block not found")
    firebase="""dependencies {
    implementation platform('com.google.firebase:firebase-bom:34.19.0')
    implementation 'com.google.firebase:firebase-messaging'
"""
    a=a.replace(marker,firebase,1)
app_gradle.write_text(a)

manifest=APP/"src/main/AndroidManifest.xml"
m=manifest.read_text()
if 'android.permission.POST_NOTIFICATIONS' not in m:
    m=m.replace('<manifest ', '<manifest ',1)
    insert='    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n'
    pos=m.find('<application')
    m=m[:pos]+insert+m[pos:]
provider='''        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="com.numelixa.app.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/numelixa_file_paths" />
        </provider>
'''
if 'com.numelixa.app.fileprovider' not in m:
    pos=m.rfind('</application>')
    m=m[:pos]+provider+m[pos:]


if 'firebase_messaging_auto_init_enabled' not in m:
    meta='''        <meta-data
            android:name="firebase_messaging_auto_init_enabled"
            android:value="true" />
'''
    pos=m.rfind('</application>')
    m=m[:pos]+meta+m[pos:]

# Pin the Android system-tray icon and default channel for FCM notification payloads.
if 'com.google.firebase.messaging.default_notification_icon' not in m:
    meta='''        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_numelixa" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="general" />
'''
    pos=m.rfind('</application>')
    m=m[:pos]+meta+m[pos:]
# Register the secure one-time OAuth return link so Chrome can reopen Numelixa.
if 'android:scheme="com.numelixa.app"' not in m:
    activity_start = m.find('<activity')
    activity_end = m.find('</activity>', activity_start)
    if activity_start < 0 or activity_end < 0:
        raise SystemExit("Android launcher activity not found for Google OAuth deep link")
    deep_link = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.numelixa.app" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>
'''
    m = m[:activity_end] + deep_link + m[activity_end:]

manifest.write_text(m)

(XML/"numelixa_file_paths.xml").write_text('''<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="updates" path="updates/" />
    <external-files-path name="external_updates" path="Download/" />
</paths>
''')

(JAVA/"NumelixaPushTokenPlugin.java").write_text(r'''package com.numelixa.app;

import android.os.Handler;
import android.os.Looper;
import android.Manifest;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "NumelixaPushToken", permissions = {
    @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class NumelixaPushTokenPlugin extends Plugin {
    private static final int MAX_ATTEMPTS = 8;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 33 ||
            getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("status", android.os.Build.VERSION.SDK_INT < 33 ? "not_required" : "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        boolean granted = android.os.Build.VERSION.SDK_INT < 33 ||
            getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == android.content.pm.PackageManager.PERMISSION_GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("status", granted ? "granted" : "denied");
        android.util.Log.i("NUMELIXA_PUSH", "FCM_PERMISSION_RESULT=" + (granted ? "granted" : "denied"));
        call.resolve(result);
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        try {
            FirebaseApp app;
            try {
                app = FirebaseApp.getInstance();
            } catch (IllegalStateException e) {
                app = FirebaseApp.initializeApp(getContext());
            }
            if (app == null) {
                android.util.Log.e("NUMELIXA_PUSH", "FCM_INIT_FAILURE firebaseAppNull=true");
                call.reject("Firebase is not initialized. Check google-services.json.");
                return;
            }
            android.util.Log.i("NUMELIXA_PUSH", "FCM_INIT_OK projectId=" + app.getOptions().getProjectId());

            FirebaseMessaging.getInstance().setAutoInitEnabled(true);
            request(call, 1);
        } catch (Exception e) {
            call.reject("Firebase token initialization failed: " + safe(e));
        }
    }

    private void request(PluginCall call, int attempt) {
        FirebaseMessaging.getInstance().getToken()
            .addOnSuccessListener(token -> {
                String value = token == null ? "" : token.trim();
                if (value.isEmpty()) {
                    retry(call, attempt, "Firebase returned an empty token");
                    return;
                }

                getContext().getSharedPreferences("numelixa_push", 0)
                    .edit()
                    .putString("fcm_token", value)
                    .putString("fcm_token_error", "")
                    .apply();

                // The authenticated WebView registers this token with the user's session cookie.

                JSObject out = new JSObject();
                out.put("token", value);
                out.put("deviceId", installationId());
                out.put("appVersion", appVersion());
                android.util.Log.i("NUMELIXA_PUSH", "FCM_TOKEN_RECEIVED tokenPresent=true tokenLength=" + value.length());
                call.resolve(out);
            })
            .addOnFailureListener(error -> {
                String message = safe(error);
                getContext().getSharedPreferences("numelixa_push", 0)
                    .edit()
                    .putString("fcm_token_error", message)
                    .putLong("fcm_token_error_at", System.currentTimeMillis())
                    .apply();
                retry(call, attempt, message);
            });
    }

    private void retry(PluginCall call, int attempt, String message) {
        if (attempt >= MAX_ATTEMPTS) {
            call.reject(message + " after " + MAX_ATTEMPTS + " attempts");
            return;
        }
        handler.postDelayed(() -> request(call, attempt + 1), 1500L);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent("android.settings.APP_NOTIFICATION_SETTINGS");
            intent.putExtra("android.provider.extra.APP_PACKAGE", getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject out = new JSObject();
            out.put("opened", true);
            call.resolve(out);
        } catch (Exception error) {
            call.reject("Unable to open Android notification settings", error);
        }
    }

    @PluginMethod
    public void recordRegistrationResult(PluginCall call) {
        int status = call.getInt("status", 0);
        String response = call.getString("response", "");
        if (response == null) response = "";
        if (response.length() > 280) response = response.substring(0, 280);
        getContext().getSharedPreferences("numelixa_push", 0)
            .edit()
            .putString("last_registration_status", String.valueOf(status))
            .putString("last_registration_response", response)
            .putLong("last_registration_at", System.currentTimeMillis())
            .apply();
        JSObject result = new JSObject();
        result.put("saved", true);
        call.resolve(result);
    }
    @PluginMethod
    public void getStatus(PluginCall call) {
        android.content.SharedPreferences prefs =
            getContext().getSharedPreferences("numelixa_push", 0);
        JSObject out = new JSObject();
        out.put("tokenPresent", !String.valueOf(
            prefs.getString("fcm_token", "")).trim().isEmpty());
        out.put("tokenLength", String.valueOf(
            prefs.getString("fcm_token", "")).trim().length());
        out.put("tokenError", prefs.getString("fcm_token_error", ""));
        out.put("deviceId", installationId());
        out.put("appVersion", appVersion());
        out.put("permission", permissionStatus());
        out.put("registrationStatus",
            prefs.getString("last_registration_status", ""));
        out.put("registrationResponse",
            prefs.getString("last_registration_response", ""));
        out.put("registrationAt",
            prefs.getLong("last_registration_at", 0L));
        call.resolve(out);
    }

    private String installationId() {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("numelixa_push", 0);
        String id = prefs.getString("installation_id", "");
        if (id == null || id.trim().isEmpty()) {
            id = java.util.UUID.randomUUID().toString();
            prefs.edit().putString("installation_id", id).apply();
        }
        return id;
    }

    private String appVersion() {
        try {
            android.content.pm.PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            return info.versionName == null ? "" : info.versionName;
        } catch (Exception ignored) { return ""; }
    }

    private String permissionStatus() {
        if (android.os.Build.VERSION.SDK_INT < 33) return "not_required";
        return getContext().checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED ? "granted" : "denied";
    }

    private static String safe(Throwable t) {
        if (t == null) return "Unknown Firebase error";
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
    }
}
''')

(JAVA/"NumelixaExternalBrowserPlugin.java").write_text(r'''package com.numelixa.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NumelixaExternalBrowser")
public class NumelixaExternalBrowserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String value = call.getString("url", "");
        Uri uri;
        try { uri = Uri.parse(value); }
        catch (Exception error) { call.reject("Invalid sign-in URL"); return; }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!"https".equalsIgnoreCase(uri.getScheme()) ||
            !("numelixa.com".equals(host) || "www.numelixa.com".equals(host))) {
            call.reject("Only Numelixa secure sign-in can be opened");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No browser is available to open Google sign-in", error);
        }
    }
}
''')
(JAVA/"NumelixaUpdaterPlugin.java").write_text(r'''package com.numelixa.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NumelixaUpdater")
public class NumelixaUpdaterPlugin extends Plugin {
    @com.getcapacitor.PluginMethod
    public void installApk(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "Numelixa-update.apk");
        if (url == null || !url.startsWith("https://")) {
            call.reject("Invalid HTTPS update URL");
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 &&
            !getContext().getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent settings = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(settings);
                JSObject out = new JSObject();
                out.put("started", false);
                out.put("needsInstallPermission", true);
                call.resolve(out);
            } catch (Exception e) {
                call.reject("Android install permission is required", e);
            }
            return;
        }

        try {
            DownloadManager manager =
                (DownloadManager)getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            Uri source = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(source);
            request.setTitle("Numelixa update");
            request.setDescription("Downloading Numelixa " + fileName);
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(false);
            request.setDestinationInExternalFilesDir(
                getContext(), Environment.DIRECTORY_DOWNLOADS, fileName
            );

            long downloadId = manager.enqueue(request);
            android.os.Handler handler =
                new android.os.Handler(android.os.Looper.getMainLooper());

            handler.post(new Runnable() {
                @Override public void run() {
                    android.database.Cursor cursor =
                        manager.query(new DownloadManager.Query().setFilterById(downloadId));
                    if (cursor == null) {
                        call.reject("Update download could not be checked");
                        return;
                    }
                    try {
                        if (!cursor.moveToFirst()) {
                            call.reject("Update download disappeared");
                            return;
                        }
                        int status = cursor.getInt(
                            cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)
                        );
                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                            Uri uri = manager.getUriForDownloadedFile(downloadId);
                            if (uri == null) {
                                call.reject("Downloaded APK is unavailable");
                                return;
                            }
                            Intent install = new Intent(Intent.ACTION_VIEW);
                            install.setDataAndType(
                                uri, "application/vnd.android.package-archive"
                            );
                            install.addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK |
                                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                                Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            );
                            getActivity().startActivity(install);
                            JSObject out = new JSObject();
                            out.put("started", true);
                            call.resolve(out);
                        } else if (status == DownloadManager.STATUS_FAILED) {
                            int reason = cursor.getInt(
                                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)
                            );
                            call.reject("Update download failed (" + reason + ")");
                        } else {
                            handler.postDelayed(this, 700L);
                        }
                    } finally {
                        cursor.close();
                    }
                }
            });
        } catch (Exception e) {
            call.reject("Unable to start update download: " + safe(e), e);
        }
    }

    private static String safe(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
}
''')



(JAVA/"MainActivity.java").write_text(r'''package com.numelixa.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.PluginMethodHandle;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i("NumelixaGoogleSignIn", "NUMELIXA_PLUGIN_REGISTER_START");
        registerPlugin(NumelixaUpdaterPlugin.class);
        registerPlugin(NumelixaPushTokenPlugin.class);
        registerPlugin(NumelixaExternalBrowserPlugin.class);
        super.onCreate(savedInstanceState);

        // Inspect the live Capacitor Bridge after BridgeActivity has created it.
        try {
            PluginHandle handle = getBridge() == null ? null : getBridge().getPlugin("NumelixaGoogleSignIn");
            boolean signInFound = false;
            if (handle != null) {
                for (PluginMethodHandle method : handle.getMethods()) {
                    if ("signIn".equals(method.getName())) {
                        signInFound = true;
                        break;
                    }
                }
            }
            Log.i("NumelixaGoogleSignIn", "NUMELIXA_PLUGIN_REGISTERED");
            Log.i("NumelixaGoogleSignIn", "NUMELIXA_PLUGIN_FOUND=" + (handle != null));
            Log.i("NumelixaGoogleSignIn", "NUMELIXA_PLUGIN_METHOD_SIGNIN=" + signInFound);
        } catch (Exception diagnosticError) {
            Log.e("NumelixaGoogleSignIn", "NUMELIXA_PLUGIN_RUNTIME_DIAGNOSTIC_FAILED", diagnosticError);
        }

        createNotificationChannel();
        requestNotificationPermissionOnFirstLaunch();
        try {
            FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        } catch (Exception ignored) {}

    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    private void requestNotificationPermissionOnFirstLaunch() {
        if (Build.VERSION.SDK_INT < 33) {
            Log.i("NUMELIXA_PUSH", "FCM_PERMISSION_NOT_REQUIRED sdk=" + Build.VERSION.SDK_INT);
            return;
        }
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            Log.i("NUMELIXA_PUSH", "FCM_PERMISSION_ALREADY_GRANTED");
            return;
        }
        // Request from the foreground Activity itself. This does not depend on
        // WebView JavaScript, dynamic Capacitor imports, Firebase token startup,
        // or network access, so Android 13+ reliably displays Allow/Don't allow.
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (isFinishing() || isDestroyed()) return;
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.i("NUMELIXA_PUSH", "FCM_PERMISSION_REQUEST_START");
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    4301
                );
            }
        }, 1200L);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 4301) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Log.i("NUMELIXA_PUSH", "FCM_PERMISSION_RESULT=" + (granted ? "granted" : "denied"));
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        createChannel(manager, "general", "General", "General Numelixa updates", NotificationManager.IMPORTANCE_DEFAULT);
        createChannel(manager, "security", "Security", "Account security and login alerts", NotificationManager.IMPORTANCE_HIGH);
        createChannel(manager, "verification", "Verification", "SMS verification and order codes", NotificationManager.IMPORTANCE_HIGH);
        createChannel(manager, "admin", "Admin updates", "Important Numelixa announcements", NotificationManager.IMPORTANCE_HIGH);
    }

    private void createChannel(NotificationManager manager, String id, String name, String description, int importance) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(description);
        channel.enableVibration(true);
        channel.setShowBadge(true);
        channel.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
            new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build());
        manager.createNotificationChannel(channel);
    }
}
''')

# Verify the official local Capacitor plugin package was discovered by `npx cap sync android`.
google_plugin_source = PLUGIN_JAVA / "NumelixaGoogleSignInPlugin.java"
main_activity_source = JAVA / "MainActivity.java"
plugin_gradle = Path("plugins/numelixa-google-sign-in/android/build.gradle")
plugin_manifest = Path("plugins/numelixa-google-sign-in/android/src/main/AndroidManifest.xml")
if not google_plugin_source.exists():
    raise SystemExit("Local Google Sign-In plugin source is missing")
plugin_text = google_plugin_source.read_text()
activity_text = main_activity_source.read_text()
if '@CapacitorPlugin(name = "NumelixaGoogleSignIn")' not in plugin_text:
    raise SystemExit("Native Google Sign-In plugin annotation/name mismatch")
if "registerPlugin(NumelixaGoogleSignInPlugin.class);" in activity_text:
    raise SystemExit("Google Sign-In must not be manually registered in MainActivity")
if not plugin_gradle.exists() or "androidx.credentials:credentials:" not in plugin_gradle.read_text():
    raise SystemExit("Credential Manager dependencies missing from local plugin module")
if not plugin_manifest.exists():
    raise SystemExit("Local plugin AndroidManifest.xml is missing")
plugin_registry = APP / "src/main/assets/capacitor.plugins.json"
if not plugin_registry.exists():
    raise SystemExit("Capacitor CLI did not generate capacitor.plugins.json")
registry = json.loads(plugin_registry.read_text())
class_path = "com.numelixa.app.NumelixaGoogleSignInPlugin"
if not isinstance(registry, list) or not any(item.get("classpath") == class_path for item in registry):
    raise SystemExit("Capacitor CLI did not discover the local Google Sign-In plugin package")
print("Capacitor CLI discovered local plugin:", class_path)
print("Numelixa native Android configuration applied.")
