package com.tradehero.cfd;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.media.AudioManager;
import android.media.SoundPool;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.support.v4.app.ActivityCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.widget.EditText;
import android.widget.TextView;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;
import com.igexin.sdk.PushManager;
import com.meiqia.core.callback.OnInitCallback;
import com.meiqia.meiqiasdk.util.MQConfig;
import com.tencent.bugly.crashreport.CrashReport;
import com.tendcloud.appcpa.TalkingDataAppCpa;
import com.tradehero.cfd.RNNativeModules.NativeActions;
import com.tradehero.cfd.RNNativeModules.NativeDataModule;
import com.tradehero.cfd.talkingdata.TalkingDataModule;
import com.tradehero.cfd.views.chartDrawer.base.ChartDrawerConstants;

import java.util.HashMap;

import butterknife.Bind;
import butterknife.ButterKnife;
//import com.tongdao.sdk.ui.TongDaoUiCore;
//import com.tradehero.cfd.tongdao.TongDaoModule;

import static android.content.pm.PackageManager.GET_META_DATA;

import android.content.Intent; // <--- import
import android.content.res.Configuration; // <--- import

import org.json.JSONObject;

/**
 * @author <a href="mailto:sam@tradehero.mobi"> Sam Yu </a>
 */
//BUGBUG: how to use the 0.33 way ReactActivity with a splash screen?
public class MainActivity extends AppCompatActivity implements DefaultHardwareBackBtnHandler {

    @Bind(R.id.react_root_view)
    ReactRootView reactRootView;

    @Bind(R.id.tvVersion)
    TextView tvVersion;


    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    /*@Override
    protected String getMainComponentName() {
        return "TH_CFD";
    }*/

    private ReactInstanceManager mReactInstanceManager;
    private boolean mDoRefresh = false;
    public static String mClientIDTeTui = null;
    final static String TAG = "MainActivity";

    private static final int REQUEST_PERMISSION = 0;
    public static MainActivity mInstance;
    public static float SCREEN_W;
    public static float SCREEN_H;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        mInstance = this;
        SharedPreferences preferences = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());

        preferences.edit().putString("debug_http_host", "192.168.20.147:8081").apply();

        super.onCreate(null);

        CrashReport.initCrashReport(getApplicationContext());
        TalkingDataModule.register(getApplicationContext(), null, null, true);
        TalkingDataAppCpa.init(this.getApplicationContext(), "f6b640d35afe4672b55a2666bdaa811f", null);

        initMeiQia();
        //initTongDao();
        initGeTui();
        initSound();

        mReactInstanceManager = ((MainApplication)getApplication()).getReactNativeHost().getReactInstanceManager();
        setContentView(R.layout.react_activity_container);
        ButterKnife.bind(this);

        reactRootView.startReactApplication(mReactInstanceManager, "TH_CFD", null);

        // Fix the UI issue caused by the hidden navigation bar on some devices
        // by passing the React view height to RN every time the view size is changed.
        reactRootView.addOnLayoutChangeListener(new View.OnLayoutChangeListener() {
            @Override
            public void onLayoutChange(View v, int left, int top, int right, int bottom, int oldLeft, int oldTop, int oldRight, int oldBottom) {
                Integer height = bottom - top;
                Integer width = right - left;
                Integer oldHeight = oldBottom - oldTop;
                Integer oldWidth = oldRight - oldLeft;

                if(oldHeight == height && oldWidth == width){
                    //Size not changed. Do nothing.
                    return;
                }

                JSONObject jsonObject = new JSONObject();


                Log.i(TAG, "onLayoutChange top " + top + ", bottom " + bottom + ", oldTop " + oldTop + ", oldBottom " + oldBottom );
                Log.i(TAG, "onLayoutChange right " + right + ", left " + left + ", oldRight " + oldRight + ", oldLeft " + oldLeft );
                Resources resources = MainActivity.this.getResources();
                DisplayMetrics metrics = resources.getDisplayMetrics();
                Integer heightDp = (int)(height / ((float)metrics.densityDpi / DisplayMetrics.DENSITY_DEFAULT));
                Integer widthDp = (int)(width / ((float)metrics.densityDpi / DisplayMetrics.DENSITY_DEFAULT));
                try {
                    jsonObject.put("height", heightDp);
                    jsonObject.put("width", widthDp);
                    ReactContext context = mReactInstanceManager.getCurrentReactContext();
                    if (context != null) {
                        NativeDataModule.passDataToRN(mReactInstanceManager.getCurrentReactContext(), NativeActions.ACTION_SNK, ChartDrawerConstants.snk);
                        NativeDataModule.passDataToRN(mReactInstanceManager.getCurrentReactContext(),
                                NativeActions.ACTION_GET_ANDROID_VISIBLE_SIZE, jsonObject.toString());
                    }
                }catch (Exception e){
                    Log.e("onLayoutSizeChanged", e.getMessage(), e);
                }
            }
        });

        try {
            String pkName = this.getPackageName();
            String versionName = this.getPackageManager().getPackageInfo(
                    pkName, 0).versionName;
            tvVersion.setText("V" + versionName + " 版本");
        } catch (Exception e) {
        }

        getScreenWH();
    }

    String pushData = null;

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        if(intent != null ) {
            if (intent.getExtras() != null) {
                String data = intent.getExtras().getString(GeTuiBroadcastReceiver.KEY_PUSH_DATA);
                if (data != null) {
                    sendPushDetailMessageWhenAvailable(data);
                }
            }
            handlePossilbeDeepLink(intent);
        }
    }

    private void handlePossilbeDeepLink(Intent intent){
        Uri uri = intent.getData();
        if(uri!=null && uri.getScheme().equalsIgnoreCase("cfd")) {
            String url = uri.toString();
            NativeDataModule.passDataToRN(mReactInstanceManager.getCurrentReactContext(), NativeActions.ACTION_OPEN_URL, url);
        }
    }

    private void sendPushDetailMessageWhenAvailable(String data) {
        if (mReactInstanceManager.getLifecycleState() != LifecycleState.RESUMED) {
            Log.i(TAG, "send data to RN. RN is paused so let's wait.");
            //RN instance is paused or not started.
            //So store the data for now and wait until onResume, otherwise the RN instance is still paused.
            pushData = data;
        } else {
            Log.i(TAG, "send data to RN immediately.");
            showPushDetail(data);
        }
    }

    private void showPushDetail(final String pushJsonString) {
        try {
            ReactContext context = mReactInstanceManager.getCurrentReactContext();
            if (context != null) {
                NativeDataModule.passDataToRN(context, NativeActions.ACTION_SHOW_DETAIL, pushJsonString);
            }
        } catch (Exception e) {
            Log.e(TAG, "passDataToRN : error", e);
        }
    }

    public void setGetuiClientID(String clientID){
        mClientIDTeTui = clientID;
        initDeviceToken();
    }

    @Override
    public void finish() {
        super.finish();
        RNManager.destroyInstance();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(null);
        ButterKnife.unbind(this);
    }

    @Override
    protected void onPause() {
        super.onPause();
        //TongDaoUiCore.onSessionEnd(this);
        if (mReactInstanceManager != null) {
            mReactInstanceManager.onHostPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        //TongDaoUiCore.onSessionStart(this);
        //TongDaoUiCore.displayInAppMessage(this);
        if (mReactInstanceManager != null) {
            mReactInstanceManager.onHostResume(this, this);

            if (pushData != null) {
                showPushDetail(pushData);
                pushData = null;
            }
        }
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (mReactInstanceManager != null &&
                mReactInstanceManager.getDevSupportManager().getDevSupportEnabled()) {
            if (keyCode == KeyEvent.KEYCODE_MENU) {
                mReactInstanceManager.showDevOptionsDialog();
                return true;
            }
            if (keyCode == KeyEvent.KEYCODE_R && !(getCurrentFocus() instanceof EditText)) {
                // Enable double-tap-R-to-reload
                if (mDoRefresh) {
                    mReactInstanceManager.getDevSupportManager().handleReloadJS();
                    mDoRefresh = false;
                } else {
                    mDoRefresh = true;
                    new Handler().postDelayed(
                            new Runnable() {
                                @Override
                                public void run() {
                                    mDoRefresh = false;
                                }
                            },
                            200);
                }
            }
        }
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (mReactInstanceManager != null) {
            mReactInstanceManager.onBackPressed();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void invokeDefaultOnBackPressed() {
        super.onBackPressed();
    }

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        mReactInstanceManager.onActivityResult(this, requestCode, resultCode, data);
    }

    public void initMeiQia() {
        MQConfig.init(this, "2a59beff6f1875815ea399fdad79a46e", new OnInitCallback() {
            @Override
            public void onSuccess(String clientId) {
//                Toast.makeText(MainActivity.this, "init success", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onFailure(int code, String message) {
//                Toast.makeText(MainActivity.this, "int failure", Toast.LENGTH_SHORT).show();
            }
        });

        MQConfig.isShowClientAvatar = true;

    }

    public void initDeviceToken() {
        try {
//                    String ANDOIRD_ID = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
//                    Log.d("CFD LOG","Android ID : "+ ANDOIRD_ID);
//                    ReactContext context = mReactInstanceManager.getCurrentReactContext();
//                    Log.d("","initDeviceToken : " + ANDOIRD_ID);

            ReactContext context = mReactInstanceManager.getCurrentReactContext();
            if(context != null) {
                if (mClientIDTeTui != null) {
                    NativeDataModule.passDataToRN(context, NativeActions.ACTION_DEVICE_TOKEN, mClientIDTeTui);
                    Log.i("GeTui", "NativeDataModule deviceToken : " + mClientIDTeTui);
                } else {
                    Log.i("GeTui", "We didn't get mClientIDTeTui, wait for device token...");
                }
            }else{
                Log.i("GeTui", "React Native environment isn't ready...");
            }

        } catch (Exception e) {
            Log.e("", "initDeviceToken : error", e);
        }
    }

    public void initGeTui() {
        // SDK初始化，第三方程序启动时，都要进行SDK初始化工作
        Log.i("GetuiSdk", "initializing sdk...");
        PackageManager pkgManager = getPackageManager();
        // 读写 sd card 权限非常重要, android6.0默认禁止的, 建议初始化之前就弹窗让用户赋予该权限
        boolean sdCardWritePermission =
                pkgManager.checkPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE, getPackageName()) == PackageManager.PERMISSION_GRANTED;


        // read phone state用于获取 imei 设备信息
        boolean phoneSatePermission =
                pkgManager.checkPermission(android.Manifest.permission.READ_PHONE_STATE, getPackageName()) == PackageManager.PERMISSION_GRANTED;

        if (Build.VERSION.SDK_INT >= 23 && !sdCardWritePermission || !phoneSatePermission) {
            requestPermission();
        } else {
            // SDK初始化，第三方程序启动时，都要进行SDK初始化工作
            PushManager.getInstance().initialize(this.getApplicationContext());
        }

        String clientID = PushManager.getInstance().getClientid(this);
        Log.i("GeTui", "try devicetoken" + clientID);
        if(clientID!=null) {
            mClientIDTeTui = clientID;
            Log.i("GeTui", "initGeTui devicetoken " + mClientIDTeTui);
        }
    }

    public void initTongDao(){
         String appKey = null;
        try {
            ApplicationInfo applicationInfo = getPackageManager().getApplicationInfo(getPackageName(), GET_META_DATA);
            if(applicationInfo != null && applicationInfo.metaData != null) {
                appKey = applicationInfo.metaData.getString("TONGDAO_APP_KEY");
                if(appKey != null) {
                    appKey = appKey.trim();
                }
            }
        } catch (Exception err) {
            Log.e("Initialize TongDao|", err.toString());
        }

        //TongDaoUiCore.init(this, appKey);
    }

    private void requestPermission() {
        ActivityCompat.requestPermissions(this, new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE, android.Manifest.permission.READ_PHONE_STATE},
                REQUEST_PERMISSION);

    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQUEST_PERMISSION) {
            if ((grantResults.length == 2 && grantResults[0] == PackageManager.PERMISSION_GRANTED && grantResults[1] == PackageManager.PERMISSION_GRANTED)) {
                PushManager.getInstance().initialize(this.getApplicationContext());
            } else {
                Log.e("GetuiSdkDemo",
                        "we highly recommend that you need to grant the special permissions before initializing the SDK, otherwise some "
                                + "functions will not work");
                PushManager.getInstance().initialize(this.getApplicationContext());
            }
        } else {
            onRequestPermissionsResult(requestCode, permissions, grantResults);
        }
    }

    //播放声音index
    public void playSound(int index) {
        try {
            int loop = 1;
            AudioManager am = (AudioManager) this
                    .getSystemService(mInstance.AUDIO_SERVICE);
            float audioMaxVolumn = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            float volumnCurrent = am.getStreamVolume(AudioManager.STREAM_MUSIC);
            float volumnRatio = volumnCurrent / audioMaxVolumn;

            sp.play(spMap.get(index), volumnRatio, volumnRatio, 1, loop, 1f);
        } catch (Exception e) {
            Log.e("", "play sound error " + e.toString());
        }

    }


    SoundPool sp;
    HashMap<Integer, Integer> spMap;

    public void initSound() {
        sp = new SoundPool(1, AudioManager.STREAM_MUSIC, 0);
        spMap = new HashMap<Integer, Integer>();
        spMap.put(0, sp.load(this, R.raw.coin, 1));
//        spMap.put(2, sp.load(this, R.raw.hit, 1));

    }

    public void passIsProductServerToRN() {
        ReactContext context = mReactInstanceManager.getCurrentReactContext();
        if (context != null) {
            Boolean isProductEnvironment = BuildConfig.IS_PRODUCT_ENVIRONMENT;
            NativeDataModule.passDataToRN(context, NativeActions.ACTION_SET_IS_PRODUCT_SERVER, isProductEnvironment.toString());
        }
    }

    public void passChartClickedToRN() {
        ReactContext context = mReactInstanceManager.getCurrentReactContext();
        if (context != null) {
            NativeDataModule.passDataToRN(context, NativeActions.ACTION_CHART_CLICKED, "");
        }
    }


    public void getScreenWH() {

        DisplayMetrics dm = new DisplayMetrics();
        getWindowManager().getDefaultDisplay().getMetrics(dm);
        SCREEN_W = dm.widthPixels/dm.density;
        SCREEN_H = dm.heightPixels/dm.density;

        Log.d("MainActivity", "SrceenW:" + SCREEN_W + " ScreenH:" + SCREEN_H);

    }

//    public void setStatusBarColor(final int color){
//        final int version = Build.VERSION.SDK_INT;
//        if (version >= 21) {
//            this.runOnUiThread(new Runnable() {
//                @Override
//                public void run() {
//                    Window window = MainActivity.this.getWindow();
//                    window.setStatusBarColor(color);
//                }
//            });
//        }
//    }

    public void getVersionCode() {
        try {
            String pkName = MainActivity.mInstance.getPackageName();
            Integer versionCode = MainActivity.mInstance.getPackageManager().getPackageInfo(
                    pkName, 0).versionCode;
            NativeDataModule.passDataToRN(mReactInstanceManager.getCurrentReactContext(), NativeActions.ACTION_VERSION_CODE, versionCode.toString());
        }catch (Exception e){

        }
    }

    public void sendDeviceTokenToRN(){
        initDeviceToken();

        if(getIntent() != null){
            if (getIntent().getExtras() != null) {
                final String data = getIntent().getExtras().getString(GeTuiBroadcastReceiver.KEY_PUSH_DATA);
                if (data != null) {
                    sendPushDetailMessageWhenAvailable(data);
                }
            }
            handlePossilbeDeepLink(getIntent());
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        this.sendBroadcast(intent);
    }

    public static boolean isLandscape() {
        Configuration mConfiguration = mInstance.getResources().getConfiguration(); //获取设置的配置信息
        int ori = mConfiguration.orientation ; //获取屏幕方向
        if(ori == mConfiguration.ORIENTATION_LANDSCAPE){
            return true;
        }else if(ori == mConfiguration.ORIENTATION_PORTRAIT){
            return false;
        }
        return false;
    }

    public static float getCurrentScreenWidth(){
        if(isLandscape())return SCREEN_H;
        else return SCREEN_W;
    }
}
