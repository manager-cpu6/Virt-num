#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path("android")
APP=ROOT/"app"
JAVA=APP/"src/main/java/com/numelixa/app"
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
if "com.google.gms.google-services" not in a:
    a=a.rstrip()+"\n\napply plugin: 'com.google.gms.google-services'\n"
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

service_decl='''        <service
            android:name=".NumelixaFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="numelixa" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@android:drawable/ic_dialog_info" />
'''
if 'NumelixaFirebaseMessagingService' not in m:
    pos=m.rfind('</application>')
    m=m[:pos]+service_decl+m[pos:]

if 'firebase_messaging_auto_init_enabled' not in m:
    meta='''        <meta-data
            android:name="firebase_messaging_auto_init_enabled"
            android:value="true" />
'''
    pos=m.rfind('</application>')
    m=m[:pos]+meta+m[pos:]
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
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "NumelixaPushToken")
public class NumelixaPushTokenPlugin extends Plugin {
    private static final int MAX_ATTEMPTS = 8;
    private final Handler handler = new Handler(Looper.getMainLooper());

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
                call.reject("Firebase is not initialized. Check google-services.json.");
                return;
            }
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

                // Register the token directly from the native layer as a
                // fallback. This deliberately works before login too, so the
                // server can count the device as registered even if the
                // WebView/session is still booting. The JS layer will later
                // claim/link the same token to the signed-in user.
                registerTokenWithServer(value);

                JSObject out = new JSObject();
                out.put("token", value);
                call.resolve(out);
            })
            .addOnFailureListener(error -> retry(call, attempt, safe(error)));
    }

    private void registerTokenWithServer(String token) {
        new Thread(() -> {
            java.net.HttpURLConnection connection = null;
            try {
                java.net.URL url = new java.net.URL(
                    "https://numelixa.com/api/notifications/register"
                );
                connection = (java.net.HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "application/json");

                org.json.JSONObject body = new org.json.JSONObject();
                body.put("token", token);
                body.put("platform", "android");
                byte[] payload = body.toString().getBytes(
                    java.nio.charset.StandardCharsets.UTF_8
                );

                try (java.io.OutputStream out = connection.getOutputStream()) {
                    out.write(payload);
                }

                int status = connection.getResponseCode();
                android.util.Log.d(
                    "NUMELIXA_PUSH",
                    "Native token registration HTTP " + status
                );
            } catch (Exception error) {
                android.util.Log.e(
                    "NUMELIXA_PUSH",
                    "Native token registration failed: " + safe(error)
                );
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "numelixa-fcm-register").start();
    }

    private void retry(PluginCall call, int attempt, String message) {
        if (attempt >= MAX_ATTEMPTS) {
            call.reject(message + " after " + MAX_ATTEMPTS + " attempts");
            return;
        }
        handler.postDelayed(() -> request(call, attempt + 1), 1500L);
    }

    private static String safe(Throwable t) {
        if (t == null) return "Unknown Firebase error";
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
    }
}
''')

(JAVA/"NumelixaFirebaseMessagingService.java").write_text(r'''package com.numelixa.app;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.text.TextUtils;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class NumelixaFirebaseMessagingService extends FirebaseMessagingService {
 public static final String CHANNEL_ID="numelixa";
 @Override public void onNewToken(String token){
  super.onNewToken(token);
  if(token!=null&&!token.trim().isEmpty())
   getSharedPreferences("numelixa_push",MODE_PRIVATE).edit().putString("fcm_token",token.trim()).apply();
 }
 @Override public void onMessageReceived(RemoteMessage message){
  super.onMessageReceived(message); ensureChannel();
  String title=message.getNotification()!=null?message.getNotification().getTitle():null;
  String body=message.getNotification()!=null?message.getNotification().getBody():null;
  if(TextUtils.isEmpty(title))title=message.getData().get("title");
  if(TextUtils.isEmpty(body))body=message.getData().get("body");
  if(TextUtils.isEmpty(title))title="Numelixa";
  if(TextUtils.isEmpty(body))body="You have a new Numelixa notification.";
  Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
  if(launch==null)return;
  launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  for(java.util.Map.Entry<String,String> e:message.getData().entrySet())launch.putExtra(e.getKey(),e.getValue());
  int flags=PendingIntent.FLAG_UPDATE_CURRENT;
  if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.M)flags|=PendingIntent.FLAG_IMMUTABLE;
  PendingIntent pending=PendingIntent.getActivity(this,1001,launch,flags);
  android.app.Notification.Builder b=Build.VERSION.SDK_INT>=Build.VERSION_CODES.O
   ?new android.app.Notification.Builder(this,CHANNEL_ID):new android.app.Notification.Builder(this);
  b.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body)
   .setStyle(new android.app.Notification.BigTextStyle().bigText(body)).setAutoCancel(true)
   .setContentIntent(pending).setPriority(android.app.Notification.PRIORITY_HIGH)
   .setCategory(android.app.Notification.CATEGORY_MESSAGE).setDefaults(android.app.Notification.DEFAULT_ALL);
  NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
  if(manager!=null)manager.notify((int)(System.currentTimeMillis()&0x7fffffff),b.build());
 }
 private void ensureChannel(){
  if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O){
   NotificationManager m=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
   if(m!=null){
    NotificationChannel c=new NotificationChannel(CHANNEL_ID,"Numelixa",NotificationManager.IMPORTANCE_HIGH);
    c.setDescription("SMS codes, purchases, wallet activity and important alerts");
    c.enableVibration(true); c.setShowBadge(true); m.createNotificationChannel(c);
   }
  }
 }
}
''')

(JAVA/"NumelixaUpdaterPlugin.java").write_text(r'''package com.numelixa.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
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

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 4107;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NumelixaUpdaterPlugin.class);
        registerPlugin(NumelixaPushTokenPlugin.class);
        super.onCreate(savedInstanceState);

        createNotificationChannel();
        try {
            FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        } catch (Exception ignored) {}

        // Android 13+ requires an explicit runtime POST_NOTIFICATIONS request.
        // This native request is the first-line startup path; the web layer
        // has a Capacitor fallback button if the user previously denied it.
        new Handler(Looper.getMainLooper()).postDelayed(
            this::requestNotificationPermissionIfNeeded,
            900L
        );
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                NOTIFICATION_PERMISSION_REQUEST
            );
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "numelixa",
                "Numelixa",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(
                "SMS codes, purchases, wallet activity and important Numelixa alerts"
            );
            channel.enableVibration(true);
            channel.setShowBadge(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
''')

print("Numelixa native Android configuration applied.")
