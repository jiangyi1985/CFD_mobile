'use strict';

import {
	Platform,
	StatusBar,
	Dimensions,
	PixelRatio,
} from 'react-native';

var {EventCenter, EventConst} = require('./EventCenter')
export let TAB_BAR_HEIGHT = 50
export let STATUS_BAR_ACTUAL_HEIGHT = Platform.Version >= 21 ? StatusBar.currentHeight : 0 //Toolbar is translucent on Android devices above sdk 21.
export let NAVBAR_HEIGHT = Platform.OS === 'android' ? 48: 64
export let HEADER_HEIGHT = Platform.OS === 'android' ? NAVBAR_HEIGHT + STATUS_BAR_ACTUAL_HEIGHT : NAVBAR_HEIGHT
export let SCROLL_TAB_HEIGHT = Platform.OS === 'android' ? 32 : 48	//TODO: A calculated value, may be wrong on some devices...
export let ANDROID_LIST_VIEW_HEIGHT_MAGIC_NUMBER = Platform.OS === 'android' ? StatusBar.currentHeight : 0
export let LIST_HEADER_BAR_HEIGHT = Platform.OS === 'android' ? 31 : 26.5

export var USD_CURRENCY = 'USD'
export let CURRENCY_CODE_LIST = {"CAD":"加元", "CHF":"瑞士法郎", "EUR":"欧元", "GBP":"英镑", "HKD":"港元", "JPY":"日元", "SEK":"瑞典克朗", "USD":"美元"}

export let MAX_NICKNAME_LENGTH = 8;
export let LIST_ITEM_LEFT_MARGIN = 15;

var VISIBLE_HEIGHT = Dimensions.get('window').height;
var VISIBLE_WIDTH = Dimensions.get('window').width;
export function setVisibleHeight(value){
	// var pS = PixelRatio.getPixelSizeForLayoutSize(value);
	// console.log("PixelRatio.get() " + PixelRatio.get());
	// console.log("getPixelSizeForLayoutSize " + pS + ", height " + value)
	var height = parseInt(value);
	if(VISIBLE_HEIGHT != height){
		console.log("setVisibleHeight " + height)
		VISIBLE_HEIGHT = parseInt(height);
		EventCenter.emitLayoutSizeChangedEvent()
	}
}

export function getVisibleHeight(){
	return VISIBLE_HEIGHT;
}


export function setVisibleAreaSize(value){
	console.log("setVisibleAreaSize " + JSON.stringify(value));
	var changed = false;
	if(VISIBLE_HEIGHT != value.height){
		VISIBLE_HEIGHT = parseInt(value.height);
		changed = true;
	}
	if(VISIBLE_WIDTH != value.width){
		VISIBLE_WIDTH = parseInt(value.width)
		changed = true;
	}

	if(changed){
		EventCenter.emitLayoutSizeChangedEvent();
	}
}

export function setVisibleWidth(value){
	// var pS = PixelRatio.getPixelSizeForLayoutSize(value);
	// console.log("PixelRatio.get() " + PixelRatio.get());
	// console.log("getPixelSizeForLayoutSize " + pS + ", height " + value)
	var width = parseInt(value);
	if(VISIBLE_WIDTH != width){
		console.log("setVisibleWidth " + width)
		VISIBLE_WIDTH = parseInt(width);
		EventCenter.emitLayoutSizeChangedEvent()
	}
}

export function getVisibleWidth(){
	return VISIBLE_WIDTH;
}
