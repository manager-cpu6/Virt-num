from pathlib import Path

JAVA_DIR = Path("android/app/src/main/java/com/numelixa/app")
JAVA_DIR.mkdir(parents=True, exist_ok=True)

(JAVA_DIR / "NumelixaUpdateService.java").write_text(r'''package com.numelixa.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.content.pm.ServiceInfo;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NumelixaUpdateService extends Service {
    public static final String ACTION_START = "com.numelixa.app.UPDATE_START";
    private static final String PREFS = "numelixa_update";
    private static final String URL_KEY = "url";
    private static final String FILE_KEY = "file";
    private static final String TOTAL_KEY = "total_bytes";
    private static final String DOWNLOADED_KEY = "downloaded_bytes";
    private static final String STATUS_KEY = "status";
    private static final String ERROR_KEY = "error";
    private static final int NOTIFICATION_ID = 4811;
    private static final String CHANNEL_ID = "numelixa_update";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile boolean running = false;

    public static void start(Context context, String url, String fileName, long expectedBytes) {
        Intent i = new Intent(context, NumelixaUpdateService.class);
        i.setAction(ACTION_START);
        i.putExtra("url", url);
        i.putExtra("fileName", fileName);
        i.putExtra("expectedBytes", expectedBytes);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i);
        else context.startService(i);
    }

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
        promote("Downloading Numelixa update", 0, 0, true);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            String url = intent.getStringExtra("url");
            String fileName = intent.getStringExtra("fileName");
            long expected = intent.getLongExtra("expectedBytes", 0);
            if (url != null && url.startsWith("https://") && fileName != null && !running) {
                getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putString(URL_KEY, url).putString(FILE_KEY, fileName)
                    .putLong(TOTAL_KEY, expected).putString(STATUS_KEY, "downloading")
                    .putString(ERROR_KEY, "").apply();
                startDownload();
            }
        } else if (!running && "downloading".equals(getSharedPreferences(PREFS, MODE_PRIVATE).getString(STATUS_KEY, "idle"))) {
            startDownload();
        }
        return START_STICKY;
    }

    private void startDownload() {
        if (running) return;
        running = true;
        executor.execute(this::download);
    }

    private File updateFile() {
        String name = getSharedPreferences(PREFS, MODE_PRIVATE).getString(FILE_KEY, "Numelixa-update.apk");
        return new File(getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS), name);
    }

    private void download() {
        HttpURLConnection connection = null;
        try {
            final var prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            String url = prefs.getString(URL_KEY, "");
            long expected = prefs.getLong(TOTAL_KEY, 0);
            File file = updateFile();
            file.getParentFile().mkdirs();

            long existing = file.exists() ? file.length() : 0;
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(60000);
            connection.setRequestProperty("User-Agent", "Numelixa-Android/" + BuildConfig.VERSION_NAME);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
            if (existing > 0) connection.setRequestProperty("Range", "bytes=" + existing + "-");
            connection.connect();

            int response = connection.getResponseCode();
            boolean resumed = existing > 0 && response == HttpURLConnection.HTTP_PARTIAL;
            if (existing > 0 && !resumed) {
                file.delete();
                existing = 0;
            }
            if (response < 200 || response >= 300) throw new IOException("HTTP " + response);

            long contentLength = connection.getContentLengthLong();
            long total = resumed && contentLength > 0 ? existing + contentLength :
                         (!resumed && contentLength > 0 ? contentLength : expected);
            if (total <= 0) total = prefs.getLong(TOTAL_KEY, 0);

            prefs.edit().putLong(TOTAL_KEY, total).putLong(DOWNLOADED_KEY, existing)
                .putString(STATUS_KEY, "downloading").putString(ERROR_KEY, "").apply();
            promote("Downloading Numelixa update", existing, total, false);

            try (BufferedInputStream in = new BufferedInputStream(connection.getInputStream());
                 RandomAccessFile out = new RandomAccessFile(file, "rw")) {
                out.seek(existing);
                byte[] buffer = new byte[1024 * 1024];
                int n;
                long lastNotify = 0;
                while ((n = in.read(buffer)) != -1) {
                    out.write(buffer, 0, n);
                    existing += n;
                    long now = System.currentTimeMillis();
                    if (now - lastNotify >= 350) {
                        prefs.edit().putLong(DOWNLOADED_KEY, existing).apply();
                        promote("Downloading Numelixa update", existing, total, false);
                        lastNotify = now;
                    }
                }
            }

            long actual = file.length();
            if (actual > 0) total = actual;
            prefs.edit().putLong(DOWNLOADED_KEY, actual).putLong(TOTAL_KEY, total)
                .putString(STATUS_KEY, "completed").putString(ERROR_KEY, "").apply();
            promote("Numelixa update ready", actual, total, true);
        } catch (Exception e) {
            String message = e.getMessage() == null ? "Download failed" : e.getMessage();
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(STATUS_KEY, "failed").putString(ERROR_KEY, message).apply();
            promote("Numelixa update failed", 0, 0, true);
        } finally {
            if (connection != null) connection.disconnect();
            running = false;
            if ("completed".equals(getSharedPreferences(PREFS, MODE_PRIVATE).getString(STATUS_KEY, ""))) {
                stopForeground(STOP_FOREGROUND_DETACH);
                stopSelf();
            }
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Numelixa updates", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("APK update progress and completion");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void promote(String title, long downloaded, long total, boolean finished) {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 4811, open,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));

        String text;
        if ("completed".equals(getSharedPreferences(PREFS, MODE_PRIVATE).getString(STATUS_KEY, ""))) {
            text = "Update downloaded. Tap to open Numelixa and install it.";
        } else if ("failed".equals(getSharedPreferences(PREFS, MODE_PRIVATE).getString(STATUS_KEY, ""))) {
            text = getSharedPreferences(PREFS, MODE_PRIVATE).getString(ERROR_KEY, "Download failed");
        } else if (total > 0) {
            int percent = (int)Math.min(100, Math.max(0, (downloaded * 100L) / total));
            text = String.format(java.util.Locale.US, "%d%% · %.2f MB / %.2f MB",
                percent, downloaded / 1048576.0, total / 1048576.0);
        } else {
            text = "Preparing secure update download…";
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(pi)
            .setOnlyAlertOnce(true)
            .setOngoing(!finished)
            .setAutoCancel(finished)
            .setPriority(NotificationCompat.PRIORITY_LOW);

        if (!finished && total > 0) {
            int percent = (int)Math.min(100, Math.max(0, (downloaded * 100L) / total));
            builder.setProgress(100, percent, false);
        } else if (!finished) {
            builder.setProgress(0, 0, true);
        }

        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @Override public void onTimeout(int startId, int fgsType) {
        running = false;
        stopSelf();
    }

    @Override public void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
''', encoding="utf-8")

(JAVA_DIR / "NumelixaUpdaterPlugin.java").write_text(r'''package com.numelixa.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NumelixaUpdater")
public class NumelixaUpdaterPlugin extends Plugin {
    private static final String PREFS = "numelixa_update";
    private static final String FILE_NAME = "file";

    private java.io.File file() {
        String saved = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(FILE_NAME, null);
        if (saved != null) return new java.io.File(saved);
        return new java.io.File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Numelixa-update.apk");
    }

    @PluginMethod public void installApk(PluginCall call) {
        String url = call.getString("url");
        String name = call.getString("fileName", "Numelixa-update.apk");
        Long expectedValue = call.getLong("totalBytes");
        long expected = expectedValue == null ? 0 : expectedValue;
        if (url == null || !url.startsWith("https://")) {
            call.reject("Invalid update URL");
            return;
        }
        try {
            NumelixaUpdateService.start(getContext(), url, name, expected);
            JSObject o = new JSObject();
            o.put("started", true);
            call.resolve(o);
        } catch (Exception e) {
            call.reject("Unable to start update service", e);
        }
    }

    @PluginMethod public void getAppVersion(PluginCall call) {
        try {
            android.content.pm.PackageInfo p = getContext().getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            JSObject o = new JSObject();
            o.put("version", p.versionName == null ? "0.0.0" : p.versionName);
            o.put("versionCode", Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode);
            call.resolve(o);
        } catch (Exception e) {
            call.reject("Unable to read app version", e);
        }
    }

    @PluginMethod public void getDownloadProgress(PluginCall call) {
        android.content.SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        java.io.File f = file();
        long downloaded = f.exists() ? f.length() : p.getLong("downloaded_bytes", 0);
        long total = p.getLong("total_bytes", 0);
        String status = p.getString("status", "idle");
        if ("completed".equals(status) && (!f.exists() || downloaded <= 0)) status = "failed";
        double percent = total > 0 ? Math.min(100.0, (downloaded * 100.0) / total) : 0;
        JSObject o = new JSObject();
        o.put("status", status);
        o.put("downloadedBytes", downloaded);
        o.put("totalBytes", total);
        o.put("percent", percent);
        o.put("mbDownloaded", downloaded / 1048576.0);
        o.put("mbTotal", total / 1048576.0);
        String error = p.getString("error", "");
        if (error != null && !error.isEmpty()) o.put("notification", error);
        call.resolve(o);
    }

    @PluginMethod public void openDownloadedApk(PluginCall call) {
        try {
            java.io.File f = file();
            if (!f.exists() || f.length() <= 0) {
                call.reject("Downloaded update file is unavailable");
                return;
            }
            if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(settings);
                call.reject("INSTALL_PERMISSION_REQUIRED");
                return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(),
                getContext().getPackageName() + ".fileprovider", f);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(intent);
            JSObject o = new JSObject();
            o.put("opened", true);
            call.resolve(o);
        } catch (Exception e) {
            call.reject("Unable to open downloaded update", e);
        }
    }
}
''', encoding="utf-8")

(JAVA_DIR / "MainActivity.java").write_text(r'''package com.numelixa.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NumelixaUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
        }
    }
}
''', encoding="utf-8")

manifest = Path("android/app/src/main/AndroidManifest.xml")
s = manifest.read_text(encoding="utf-8")
if "android.permission.REQUEST_INSTALL_PACKAGES" not in s:
    s = s.replace("    <application", '    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />\n\n    <application', 1)
elif "android.permission.FOREGROUND_SERVICE_DATA_SYNC" not in s:
    s = s.replace(
        '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
        '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />',
        1
    )
service = '''\n        <service\n            android:name=".NumelixaUpdateService"\n            android:exported="false"\n            android:foregroundServiceType="dataSync" />'''
if ".NumelixaUpdateService" not in s:
    s = s.replace("</application>", service + "\n    </application>", 1)
manifest.write_text(s, encoding="utf-8")

xml = Path("android/app/src/main/res/xml/numelixa_file_paths.xml")
xml.parent.mkdir(parents=True, exist_ok=True)
xml.write_text('''<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-files-path name="update_files" path="Download/" />
</paths>''', encoding="utf-8")
