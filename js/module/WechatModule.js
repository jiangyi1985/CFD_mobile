'use strict'

import React from 'react';
import {
	StyleSheet,
	Platform,
	View,
	TextInput,
	Text,
	TouchableHighlight,
	Alert,
	Dimensions,
	Image,
} from 'react-native';
var MainPage = require('../view/MainPage')

var RNWechatAPI = require('./WechatAPI')
var LogicData = require('../LogicData')
var AppState = require('AppState');

var mSuccessCallback = null
var mErrorCallback = null

export function isWechatInstalled() {
	return RNWechatAPI.isWXAppInstalled()
}

export function wechatLogin(successCallback, errorCallback) {
	mSuccessCallback = successCallback
	mErrorCallback = errorCallback

	RNWechatAPI.isWXAppInstalled()
	.then((installed) => {
		if (installed) {
			RNWechatAPI.login()
			.then((response) => {
				wechatLoginCodeHandler(response)
			})
			.catch((e) => {
				console.log('wechat login error catches: ' + e)
				errorCallback(e.message);
			})
			.done();
		}
	})
	.catch((e) => {
		mErrorCallback(e.message);
	})
}

function wechatLoginCodeHandler(response) {
	console.log(response)
	MainPage.showProgress && MainPage.showProgress()

	var url = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + "wxe102be8f66949cd1" +
		"&secret=" + "54d2804023e3e3db6ee956738b41aaf0" +
		"&code=" + response.code + "&grant_type=authorization_code";
	fetch(url, {
		method: 'GET'
	})
	.then((response) => response.json())
	.then((responsejson) => {
		console.log(responsejson)
		LogicData.setWechatAuthData(responsejson)
		wechatGetUserInfo()
	})
	.catch((e) => {
		console.log('fetchTHUrl catches: ' + e)
		mErrorCallback(e.message);
	})
	.done(() => {
		MainPage.hideProgress && MainPage.hideProgress()
	});
}

function wechatGetUserInfo() {
	MainPage.showProgress && MainPage.showProgress()

	var wechatAuthData = LogicData.getWechatAuthData()
	var url = "https://api.weixin.qq.com/sns/userinfo?access_token=" +
		wechatAuthData.access_token + "&openid=" + wechatAuthData.openid;
	fetch(url, {
		method: 'GET'
	})
	.then((response) => response.json())
	.then((responsejson) => {
		console.log(responsejson)
		LogicData.setWechatUserData(responsejson)

		if (mSuccessCallback) {
			mSuccessCallback()

			mSuccessCallback = null
			mErrorCallback = null
		}
	})
	.catch((e) => {
		console.log('fetchTHUrl catches: ' + e)
		mErrorCallback(e.message);
	})
	.done(() => {
		MainPage.hideProgress && MainPage.hideProgress()
	});
}

export const WECHAT_SESSION = 'session'
export const WECHAT_TIMELINE = 'timeline'

//type must be one of {"session", "timeline"}
export function wechatShare(title,
			description,
			webpageUrl,
			imageUrl,
			type,
			successCallback,
			errorCallback) {

	var data = {
		type: 'news',
		title : title,
		description : description,
		webpageUrl : webpageUrl,
		imageUrl: imageUrl,
	}

	RNWechatAPI.isWXAppInstalled()
	.then((installed) => {
		if (installed) {
			if(type == WECHAT_SESSION){
				RNWechatAPI.shareToSession(data)
				.then((response) => {
				})
				.catch((e) => {
					console.log('wechat shareTo error catches: ' + e)
					if(errorCallback){
						errorCallback(e.message);
					}
				})
				.done();

				if(successCallback){
					console.log("successCallback not null")
					functionOnBackFromOtherApp(successCallback)
				}
			}else if(type == WECHAT_TIMELINE){
				RNWechatAPI.shareToTimeline(data)
				.then((response) => {
				})
				.catch((e) => {
					console.log('wechat shareTo error catches: ' + e)
					if(errorCallback){
						errorCallback(e.message);
					}
				})
				.done();

				if(successCallback){
					functionOnBackFromOtherApp(successCallback)
				}
			}
		}
	})
	.catch((e) => {
		if(errorCallback){
			errorCallback(e.message);
		}
	})
}

function functionOnBackFromOtherApp(callback){
	console.log("functionOnBackFromOtherApp")
	var subscription = AppState.addListener(
		'appStateDidChange',
		(stateData) => {
			console.log("appStateDidChange " + stateData.app_state)
			if (stateData.app_state == 'active'){
				subscription.remove()
				callback && callback();
			}
		});
}
