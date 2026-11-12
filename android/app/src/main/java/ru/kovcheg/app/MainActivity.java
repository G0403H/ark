package ru.kovcheg.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.KeyEvent;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraCharacteristics;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "KovchegApp";
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://" + APP_HOST + "/index.html";
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;

    private WebView webView;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    // Hardware 3x Power button SOS detection
    private BroadcastReceiver powerButtonSosReceiver;
    private final List<Long> screenToggleTimestamps = new ArrayList<>();
    private static final long SOS_WINDOW_MS = 2500;
    private static final int SOS_PRESS_COUNT = 3;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);

        // System bars safe area
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.rootLayout), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return windowInsets;
        });

        // WebView Settings for modern responsive PWA / SPA
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        settings.setUserAgentString(settings.getUserAgentString() + " KovchegMobile/1.0 (Android; Offline)");

        // Client to intercept all local assets and provide offline SPA routing
        webView.setWebViewClient(new WebViewClient() {
            @Nullable
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();

                // Only intercept our app origin
                if (host == null || !host.equalsIgnoreCase(APP_HOST)) {
                    return null;
                }

                String rawPath = uri.getPath();
                if (rawPath == null || rawPath.isEmpty() || rawPath.equals("/")) {
                    rawPath = "/index.html";
                }

                String cleanPath = rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;

                // 1. Direct file match in "www/"
                WebResourceResponse directResp = tryServeAsset("www/" + cleanPath);
                if (directResp != null) {
                    return directResp;
                }

                // 2. Route with .html (e.g. /alarm -> www/alarm.html)
                WebResourceResponse htmlResp = tryServeAsset("www/" + cleanPath + ".html");
                if (htmlResp != null) {
                    return htmlResp;
                }

                // 3. Route with /index.html (e.g. /shelves -> www/shelves/index.html)
                WebResourceResponse dirIndexResp = tryServeAsset("www/" + cleanPath + "/index.html");
                if (dirIndexResp != null) {
                    return dirIndexResp;
                }

                // 4. SPA Fallback: if not an asset request (no file extension), return main index.html
                if (!cleanPath.contains(".")) {
                    WebResourceResponse spaResp = tryServeAsset("www/index.html");
                    if (spaResp != null) {
                        return spaResp;
                    }
                }

                Log.w(TAG, "Resource not found in assets: " + cleanPath);
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (host != null && host.equalsIgnoreCase(APP_HOST)) {
                    return false; // let WebView handle internal links
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "[Console] " + consoleMessage.message() + " (" +
                        consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                            LOCATION_PERMISSION_REQUEST_CODE
                    );
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
        });

        // Register Native Hardware Flashlight/Torch bridge for instant, zero-latency Morse pulses
        webView.addJavascriptInterface(new NativeTorchBridge(), "KovchegNative");

        initHardwareSosReceiver();

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private WebResourceResponse tryServeAsset(String fullAssetPath) {
        try {
            InputStream is = getAssets().open(fullAssetPath);
            String mimeType = getMimeType(fullAssetPath);

            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            headers.put("Cache-Control", "no-cache");

            return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }

    private void initHardwareSosReceiver() {
        powerButtonSosReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_SCREEN_OFF.equals(action) || Intent.ACTION_SCREEN_ON.equals(action)) {
                    long now = System.currentTimeMillis();
                    screenToggleTimestamps.add(now);

                    while (!screenToggleTimestamps.isEmpty() && (now - screenToggleTimestamps.get(0) > SOS_WINDOW_MS)) {
                        screenToggleTimestamps.remove(0);
                    }

                    if (screenToggleTimestamps.size() >= SOS_PRESS_COUNT) {
                        screenToggleTimestamps.clear();
                        triggerHardwareSos();
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        registerReceiver(powerButtonSosReceiver, filter);
    }

    private void triggerHardwareSos() {
        Toast.makeText(this, "🚨 КОВЧЕГ: АКТИВИРОВАН ЭКСТРЕННЫЙ SOS 3x!", Toast.LENGTH_LONG).show();

        // Morse SOS vibration (... --- ...)
        vibrateSosPattern();

        // Dispatch hardware-sos event directly into the WebView
        if (webView != null) {
            long ts = System.currentTimeMillis();
            String js = "window.dispatchEvent(new CustomEvent('kovcheg:hardware-sos', { detail: { timestamp: " + ts + " } }));";
            webView.post(() -> webView.evaluateJavascript(js, null));
        }
    }

    private void vibrateSosPattern() {
        long[] pattern = new long[]{0, 150, 150, 150, 150, 150, 300, 400, 200, 400, 200, 400, 300, 150, 150, 150, 150, 150};
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vibratorManager != null) {
                    Vibrator vibrator = vibratorManager.getDefaultVibrator();
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                }
            } else {
                Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onDestroy() {
        if (powerButtonSosReceiver != null) {
            try {
                unregisterReceiver(powerButtonSosReceiver);
            } catch (Exception ignored) {
            }
            powerButtonSosReceiver = null;
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    /**
     * Native Hardware Flashlight Torch Bridge
     * Gives Web JavaScript instant access to CameraManager.setTorchMode
     * without needing to start a camera preview stream or wait for getUserMedia
     */
    public class NativeTorchBridge {
        @JavascriptInterface
        public boolean setTorch(boolean on) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    CameraManager cameraManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
                    if (cameraManager != null) {
                        for (String id : cameraManager.getCameraIdList()) {
                            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
                            Boolean hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                            Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                            if (hasFlash != null && hasFlash && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                                cameraManager.setTorchMode(id, on);
                                return true;
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Native torch toggle failed: " + e.getMessage());
                }
            }
            return false;
        }

        @JavascriptInterface
        public boolean isTorchAvailable() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    CameraManager cameraManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
                    if (cameraManager != null) {
                        for (String id : cameraManager.getCameraIdList()) {
                            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
                            Boolean hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                            if (hasFlash != null && hasFlash) return true;
                        }
                    }
                } catch (Exception e) {}
            }
            return false;
        }
    }
}
