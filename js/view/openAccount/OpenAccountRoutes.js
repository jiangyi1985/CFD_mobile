'use strict'

import React from 'react';
import {
  AsyncStorage,
  View,
} from 'react-native';

/*
var LogicData = require('../../LogicData')
var StorageModule = require('../../module/StorageModule')
var NetworkModule = require('../../module/NetworkModule')
var WebSocketModule = require('../../module/WebSocketModule')
var TongDaoModule = require('../../module/TongDaoModule')
*/
var TalkingdataModule = require('../../module/TalkingdataModule')
var StorageModule = require('../../module/StorageModule')
var NetConstants = require('../../NetConstants')
var ColorConstants = require('../../ColorConstants')
var NavBar = require('../NavBar')
var MainPage = require('../MainPage')

var OpenAccountInfos = [
	{"title": "开户准备", "page": require('./OAStartPage')},
	{"title": "上传身份证照片(1/4)", "page": require('./OAIdPhotoPage')},
  {"title": "完善个人信息(2/4)", "page": require('./OAPersonalInfoPage')},
  {"title": "完善财务信息(3/4)", "page": require('./OAFinanceInfoPage')},
  {"title": "提交申请(4/4)", "page": require('./OADocumentInfoPage')},
  {"title": "审核状态", "page": require('./OAReviewStatusPage')},
]

var lastStoredData = null;

export function backToPreviousRoute(navigator, data){
  var routes = navigator.getCurrentRoutes();
  var lastRoute = routes[routes.length-1];
  if(lastRoute){
    var currentStep = lastRoute.step;
    storeCurrentInputData(currentStep, data);

    if(currentStep){
      navigator.replace({
        name: MainPage.OPEN_ACCOUNT_ROUTE,
        step: currentStep - 1,
      })
    }else{
      navigator.pop();
    }
  }
}

export function getLatestInputStep(){
  return new Promise(resolve=>{
    loadLastInputData()
    .then(()=>{
      if(lastStoredData == null){
        resolve(0);
      }
      for(var i = 0; i < OpenAccountInfos.length; i++){
        if(!lastStoredData[i]){
          if(i > 0){
            resolve(i-1);
          }else{
            resolve(i);
          }
          return;
        }
      }
    })
  });
}

export function showOARoute(navigator, step){
  var info = OpenAccountInfos[step];
  var Page = info.page;
  var title = info.title;
  var showBackButton = (step !== OpenAccountInfos.length-1);
  var data = lastStoredData ? lastStoredData[step] : null;
  var page;
  return (
    <View style={{flex: 1}}>
      <NavBar title={title}
        titleStyle={{marginLeft:-20, marginRight:-20}}
        showBackButton={showBackButton}
        leftButtonOnClick={()=>backToPreviousRoute(navigator, page.getData())}
        backButtonOnClick={()=>TalkingdataModule.trackEvent(TalkingdataModule.LIVE_OPEN_ACCOUNT_BACK, TalkingdataModule.LABEL_OPEN_ACCOUNT)}
        backgroundColor={ColorConstants.TITLE_DARK_BLUE}
        textOnRight={showBackButton?'取消':''}
        rightTextOnClick={()=>cancelOARoute(navigator)}
        navigator={navigator}/>
      <Page navigator={navigator} ref={(ref) => page = ref} data={data}/>
    </View>
  )
}

export function goToNextRoute(navigator, data){
  var routes = navigator.getCurrentRoutes();
  var lastRoute = routes[routes.length-1];
  if(lastRoute){
    var currentStep = lastRoute.step;

    storeCurrentInputData(currentStep, data);

    var nextStep =  currentStep + 1;

    if(nextStep >= OpenAccountInfos.length){
      clearAllInputData();
      navigator.pop();
    }else{
      console.log("goToNextRoute OPEN_ACCOUNT_ROUTE: " + nextStep);
      navigator.replace({
        name: MainPage.OPEN_ACCOUNT_ROUTE,
        step: nextStep,
      });
    }
  }
}

function loadStoredInputData(data, step, resolve){
  console.log(step + " loadStoredInputData: " + JSON.stringify(data));
  return new Promise((r)=>{
    StorageModule.loadOpenAccountData(step).
    then((value)=>{
      var handler = resolve ? resolve : r;
      console.log(step + " loadOpenAccountData: " + JSON.stringify(value));
      step ++;
      if(value){
        data[step] = JSON.parse(value);
        if(step < OpenAccountInfos.length){
          loadStoredInputData(data, step, handler);
        }else{
          handler(data);
        }
      }else{
        handler(data);
      }
    }, ()=>{
      console.log("error?");
    });
  })

}

function loadLastInputData(){
  //lastStoredData is null, which means it is the first time the app loads the data.
  return new Promise(resolve => {
    if(!lastStoredData){
      loadStoredInputData({}, 0)
      .then((data)=>{
        lastStoredData = data;
        console.log("loadLastInputData: " + JSON.stringify(lastStoredData))
        resolve();
      });
    }else{
      resolve();
    }
  })
}

function clearAllInputData(){
  for(var i = 0; i < OpenAccountInfos.length; i++){
    StorageModule.removeOpenAccountData(step);
  }
}

function storeCurrentInputData(step, data){
  StorageModule.setOpenAccountData(step, JSON.stringify(data));
  if(lastStoredData==null){
    lastStoredData = {};
  }
  lastStoredData[step] = data;
}

function cancelOARoute(navigator){
  navigator.popToTop()
  TalkingdataModule.trackEvent(TalkingdataModule.LIVE_OPEN_ACCOUNT_QUIT, TalkingdataModule.LABEL_OPEN_ACCOUNT)
}
