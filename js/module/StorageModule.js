'use strict'

import React from 'react';
import {
  AsyncStorage,
} from 'react-native';

var USER_DATA_STORAGE_KEY = '@TH_CFD:userData';
var ME_DATA_STORAGE_KEY = '@TH_CFD:meData';
var OWN_STOCKS_DATA_STORAGE_KEY = '@TH_CFD:ownStocksData';
var SEARCH_HISTORY_KEY = '@TH_CFD:searchHistory';
var BANNER_STORAGE_KEY = '@TH_CFD:bannerData';
var GUIDE_STORAGE_KEY = '@TH_CFD:guideData';
var TUTORIAL_KEY = '@TH_CFD:tutorialData';
var LAST_SUPER_PRIORITY_HINT_DATE = '@TH_CFD:lastSuperPriorityDateData'
var ACCOUNT_STATE = '@TH_CFD:accountState'
var CFD_SERVER_TYPE = '@TH_CFD:CFDServerType'
var OPEN_ACCOUNT_DATA = '@TH_CFD:openAccountDataStep<step>'

export async function loadUserData() {
	try {
		var value = await AsyncStorage.getItem(USER_DATA_STORAGE_KEY);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setUserData(selectedValue) {
	try {
		await AsyncStorage.setItem(USER_DATA_STORAGE_KEY, selectedValue);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function removeUserData() {
	try {
		await AsyncStorage.removeItem(USER_DATA_STORAGE_KEY);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setAccountState(accountState) {
	try {
		await AsyncStorage.setItem(ACCOUNT_STATE, JSON.stringify(accountState));
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadAccountState() {
	try {
		var value = await AsyncStorage.getItem(ACCOUNT_STATE);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadMeData() {
	try {
		var value = await AsyncStorage.getItem(ME_DATA_STORAGE_KEY);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setMeData(selectedValue) {
	try {
		await AsyncStorage.setItem(ME_DATA_STORAGE_KEY, selectedValue);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function removeMeData() {
	try {
		await AsyncStorage.removeItem(ME_DATA_STORAGE_KEY);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadOwnStocksData() {
	try {
		var value = await AsyncStorage.getItem(OWN_STOCKS_DATA_STORAGE_KEY);
		console.log('load stocks:'+value)
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setOwnStocksData(selectedValue) {
	try {
		await AsyncStorage.setItem(OWN_STOCKS_DATA_STORAGE_KEY, selectedValue);
		console.log('save stocks:'+selectedValue)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function removeOwnStocksData() {
	try {
		await AsyncStorage.removeItem(OWN_STOCKS_DATA_STORAGE_KEY);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadSearchHistory() {
	try {
		var value = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
		console.log('search history:'+value)
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setSearchHistory(history) {
	try {
		await AsyncStorage.setItem(SEARCH_HISTORY_KEY, history);
		console.log('save search history:'+history)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function removeSearchHistory() {
	try {
		await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setBanners(banners) {
	try {
		await AsyncStorage.setItem(BANNER_STORAGE_KEY, banners)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadBanners() {
	try {
		var value = await AsyncStorage.getItem(BANNER_STORAGE_KEY);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setGuide(guideData) {
	try {
		await AsyncStorage.setItem(GUIDE_STORAGE_KEY, guideData)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadGuide() {
	try {
		var value = await AsyncStorage.getItem(GUIDE_STORAGE_KEY);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setTutorial(tutorialData) {
	try {
		await AsyncStorage.setItem(TUTORIAL_KEY, tutorialData)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadTutorial() {
	// the value is a dictionary, like:
	// {trade: true, openclose: false}
	try {
		var value = await AsyncStorage.getItem(TUTORIAL_KEY);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setLastSuperPriorityHintData(data){
  try {
		await AsyncStorage.setItem(LAST_SUPER_PRIORITY_HINT_DATE, data)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadLastSuperPriorityHintData(){
  try {
		var value = await AsyncStorage.getItem(LAST_SUPER_PRIORITY_HINT_DATE);
		return value;
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function setCFDServerType(data){
  try {
		await AsyncStorage.setItem(CFD_SERVER_TYPE, data)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadCFDServerType(){
  try {
    var value = await AsyncStorage.getItem(CFD_SERVER_TYPE);
    return value;
  } catch (error) {
    console.log('AsyncStorage error: ' + error.message);
  }
}

export async function setOpenAccountData(step, data){
  try {
    var key = OPEN_ACCOUNT_DATA.replace("<step>", step);
  	await AsyncStorage.setItem(key, data)
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}

export async function loadOpenAccountData(step){
  try {
    var key = OPEN_ACCOUNT_DATA.replace("<step>", step);
    var value = await AsyncStorage.getItem(key);
    return value;
  } catch (error) {
    console.log('AsyncStorage error: ' + error.message);
  }
}

export async function removeOpenAccountData(step) {
	try {
    var key = OPEN_ACCOUNT_DATA.replace("<step>", step);
		await AsyncStorage.removeItem(key);
	} catch (error) {
		console.log('AsyncStorage error: ' + error.message);
	}
}
