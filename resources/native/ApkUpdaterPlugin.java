package com.ibraprogram.fawateh;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** تنزيل تحديث التطبيق وتثبيته من داخل التطبيق */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject r = new JSObject();
        r.put("allowed", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        if (url == null) { call.reject("no url"); return; }
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                Context ctx = getContext();
                File dir = new File(ctx.getCacheDir(), "update");
                dir.mkdirs();
                File f = new File(dir, "update.apk");
                if (f.exists()) f.delete();
                String u = url;
                for (int hop = 0; hop < 6; hop++) {           // تتبع التحويلات (GitHub يحوّل لخادم الملفات)
                    c = (HttpURLConnection) new URL(u).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(30000);
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) { u = c.getHeaderField("Location"); c.disconnect(); continue; }
                    if (code != 200) throw new Exception("HTTP " + code);
                    break;
                }
                long total = c.getContentLengthLong();
                InputStream in = c.getInputStream();
                FileOutputStream out = new FileOutputStream(f);
                byte[] buf = new byte[65536];
                long done = 0; int n; int last = -1;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    done += n;
                    if (total > 0) {
                        int p = (int) (done * 100 / total);
                        if (p != last) { last = p; JSObject ev = new JSObject(); ev.put("percent", p); notifyListeners("progress", ev); }
                    }
                }
                out.close(); in.close();
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", f);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? "error" : e.getMessage());
            } finally {
                if (c != null) c.disconnect();
            }
        }).start();
    }
}
