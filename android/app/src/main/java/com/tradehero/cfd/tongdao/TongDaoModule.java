package com.tradehero.cfd.tongdao;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.tongdao.sdk.TongDao;

import com.tongdao.sdk.ui.TongDaoUiCore;

import java.util.HashMap;

/**
 * Created by Neko on 16/10/8.
 */

public class TongDaoModule extends ReactContextBaseJavaModule {

    public TongDaoModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "TongDaoAPI";
    }

    @ReactMethod
    public void setUserId(String userId){
        TongDaoUiCore.setUserId(getReactApplicationContext(), userId);
    }

    @ReactMethod
    public void setUserName(String userName){
        TongDaoUiCore.identifyUserName(userName);
    }

    @ReactMethod
    public void setPhoneNumber(String phoneNumber){
        TongDaoUiCore.identifyPhone(phoneNumber);
    }

    @ReactMethod
    public void setAvatarlUrl(String avatarUrl){
        TongDaoUiCore.identifyAvatar(avatarUrl);
    }

    @ReactMethod
    public void trackUserProfile(ReadableMap parameters){
        HashMap map = new HashMap();
        ReadableMapKeySetIterator iterator = parameters.keySetIterator();
        while (iterator.hasNextKey()) {
            String key = iterator.nextKey();
            ReadableType type = parameters.getType(key);
            if (type == ReadableType.String) {
                map.put(key, parameters.getString(key));
            }
            else if (type == ReadableType.Boolean) {
                map.put(key, new Boolean(parameters.getBoolean(key)));
            }
            else if (type == ReadableType.Number) {
                map.put(key, new Double(parameters.getDouble(key)));
            }
        }
        TongDaoUiCore.identify(map);
    }

    @ReactMethod
    public void trackEvent(String eventName, ReadableMap parameters){
        if(parameters == null){
            TongDaoUiCore.identify(eventName, null);
        }else {
            HashMap map = new HashMap();
            ReadableMapKeySetIterator iterator = parameters.keySetIterator();
            while (iterator.hasNextKey()) {
                String key = iterator.nextKey();
                ReadableType type = parameters.getType(key);
                if (type == ReadableType.String) {
                    map.put(key, parameters.getString(key));
                }
                else if (type == ReadableType.Boolean) {
                    map.put(key, new Boolean(parameters.getBoolean(key)));
                }
                else if (type == ReadableType.Number) {
                    map.put(key, new Double(parameters.getDouble(key)));
                }
            }
            TongDaoUiCore.identify(eventName, map);
        }
    }

    @ReactMethod
    public void trackRegistration(){
        TongDaoUiCore.trackRegistration();
    }
}