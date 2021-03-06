package com.tradehero.cfd.RNNativeModules;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.tradehero.cfd.ImagePicker.ImagePickerModule;
import com.tradehero.cfd.views.ReactChartManager;
import com.tradehero.cfd.views.ReactLineChartManager;
import com.tradehero.cfd.views.ReactStockEditFragmentNativeManager;
import com.zyu.ReactWheelCurvedPickerManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * @author <a href="mailto:sam@tradehero.mobi"> Sam Yu </a>
 */
public class RNNativePackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Arrays.asList(new NativeModule[]{
                new NativeSceneModule(reactContext),
                new NativeDataModule(reactContext),
                new RNSendIntentModule(reactContext),
                new ImagePickerModule(reactContext),
        });
    }

    @Override
    public List<Class<? extends JavaScriptModule>> createJSModules() {
        return Collections.emptyList();
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Arrays.<ViewManager>asList(
                new ReactChartManager(),
                new NativeWebViewModule(),
                new ReactStockEditFragmentNativeManager()
        );
    }
}
