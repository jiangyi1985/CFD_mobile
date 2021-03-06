'use strict';

var LineChart = require('./component/lineChart/LineChart');
import React from 'react';
import createReactClass from 'create-react-class';
import {
	StyleSheet,
	View,
	Text,
	ListView,
	TouchableHighlight,
	TouchableOpacity,
	Dimensions,
	Platform,
	Image,
	Alert,
	Switch,
	Slider,
	TextInput,
	ScrollView,
	ActivityIndicatorIOS,
	LayoutAnimation,
} from 'react-native';

var ActivityIndicator = require('ActivityIndicator');
var LogicData = require('../LogicData')
var MainPage = require('./MainPage')
var NetConstants = require('../NetConstants')
var NetworkModule = require('../module/NetworkModule')
var WebSocketModule = require('../module/WebSocketModule')
var TalkingdataModule = require('../module/TalkingdataModule')

//var TongDaoModule = require('../module/TongDaoModule')
var ColorConstants = require('../ColorConstants')
var UIConstants = require('../UIConstants');
var StockTransactionInfoModal = require('./StockTransactionInfoModal')
var TimerMixin = require('react-timer-mixin');
var StorageModule = require('../module/StorageModule');
var NetworkErrorIndicator = require('./NetworkErrorIndicator');
var CacheModule = require('../module/CacheModule');
var AppStateModule = require('../module/AppStateModule');
var {EventCenter, EventConst} = require('../EventCenter');
var LS = require('../LS')
var {height, width} = Dimensions.get('window');
var tabData = [
			{"type":NetConstants.PARAMETER_CHARTTYPE_TODAY, "name":'分时'},
			// {"type":NetConstants.PARAMETER_CHARTTYPE_TEN_MINUTE, "name":'10分钟'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_TWO_HOUR, "name":'2小时'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_WEEK, "name":'5日'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_DAY, "name":'日K'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_5_MINUTE, "name":'5分钟'},]
var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => {
		if(r1.security && r2.security){
			if(r1.security.last !== r2.security.last || r1.security.bid !== r2.security.bid || r1.security.ask !== r2.security.ask){
				return true;
			}
		}
		return r1.id !== r2.id || r1.profitPercentage!==r2.profitPercentage || r1.hasSelected!==r2.hasSelected
	}});

var DEFAULT_EXTENDED_HEIGHT = 222;

var extendHeight = DEFAULT_EXTENDED_HEIGHT
var rowHeight = 0
var stockNameFontSize = Math.round(17*width/375.0)

var DEFAULT_PERCENT = -1
var stopProfitPercent = DEFAULT_PERCENT
var stopLossPercent = MAX_LOSS_PERCENT
var stopProfitUpdated = false
var stopLossUpdated = false
var MAX_LOSS_PERCENT = -90
var isWaiting = false

var networkConnectionChangedSubscription = null;
var accountLogoutEventSubscription = null;
var accountStateChangedSubscription = null;
var layoutSizeChangedSubscription = null

var _currentRowData = null;
var viewStyle = Platform.OS === 'android' ?
			{	width: width,
				height: height
				- UIConstants.HEADER_HEIGHT
				- UIConstants.SCROLL_TAB_HEIGHT
				- UIConstants.TAB_BAR_HEIGHT,
			}:
			{width: width, flex: 1}

var StockOpenPositionPage = createReactClass({
    displayName: 'StockOpenPositionPage',
    dataToStore: [],
    mixins: [TimerMixin],

    getInitialState: function() {
		return {
			stockInfo: ds.cloneWithRows([]),
			stockInfoRowData: [],
			selectedRow: -1,
			selectedSubItem: 0,
			stockDetailInfo: [],
			showExchangeDoubleCheck: false,
			chartType: NetConstants.PARAMETER_CHARTTYPE_TODAY,
			stopProfitSwitchIsOn: false,
			stopLossSwitchIsOn: false,
			profitLossUpdated: false,
			profitLossConfirmed: false,
			isClear:false,
			contentLoaded: false,
			isRefreshing: false,
			dataStatus:0,//0正常 1等待刷新 2加载中
			height: UIConstants.getVisibleHeight(),
			totalCount:0,
			isFocused: false,
		};
	},

    componentDidMount: function() {
		this.loadOpenPositionInfo();

		networkConnectionChangedSubscription = EventCenter.getEventEmitter().addListener(EventConst.NETWORK_CONNECTION_CHANGED, () => {
			this.onConnectionStateChanged();
		});

		accountStateChangedSubscription = EventCenter.getEventEmitter().addListener(EventConst.ACCOUNT_STATE_CHANGE, () => {
			this.clearViews();
		});

		accountLogoutEventSubscription = EventCenter.getEventEmitter().addListener(EventConst.ACCOUNT_LOGOUT, () => {
			this.clearViews();
		});

		layoutSizeChangedSubscription = EventCenter.getEventEmitter().addListener(EventConst.LAYOUT_SIZE_CHANGED, () => {
			this.onLayoutSizeChanged();
		});

		AppStateModule.registerTurnToActiveListener(this.refreshData);
	},

    //Only Android has the layout size changed issue because the navigation bar can be hidden.
    onLayoutSizeChanged: function(){
		if(Platform.OS === "android" && this.isCurrentPage()){
			console.log("onLayoutSizeChanged StockOpenPositionPage");
			this.setState({
				height: UIConstants.getVisibleHeight(),
			})
		}
	},

    isCurrentPage: function(){
		if(LogicData.getTabIndex() == MainPage.STOCK_EXCHANGE_TAB_INDEX){
			var currentPageTag = LogicData.getCurrentPageTag();
			if(currentPageTag == 0){
				var routes = this.props.navigator.getCurrentRoutes();
				if(routes && routes[routes.length-1] && routes[routes.length-1].name == MainPage.STOCK_EXCHANGE_ROUTE){
					return true;
				}
			}
		}
		return false;
	},

    onConnectionStateChanged: function(){
		if(WebSocketModule.isConnected()){
			this.refreshData();
		}
	},

    refreshData: function(){
		if(this.isCurrentPage()){
			//Refresh current page data.
			var userData = LogicData.getUserData();
			var notLogin = Object.keys(userData).length === 0;
			if(!notLogin){
				this.loadOpenPositionInfo();
			}
		}
	},

    componentWillUnmount: function(){
		networkConnectionChangedSubscription && networkConnectionChangedSubscription.remove();
		accountStateChangedSubscription && accountStateChangedSubscription.remove();
		accountLogoutEventSubscription && accountLogoutEventSubscription.remove();
		layoutSizeChangedSubscription && layoutSizeChangedSubscription.remove();
		AppStateModule.unregisterTurnToActiveListener(this.refreshData);
	},

    onEndReached: function() {

	},

    tabPressed: function() {

		this.setState({
			selectedRow: -1,
			selectedSubItem: 0,
			stopProfitSwitchIsOn: false,
			stopLossSwitchIsOn: false,
			profitLossUpdated: false,
			profitLossConfirmed: false,
		});
		this.onLayoutSizeChanged()
		this.loadOpenPositionInfo()
	},

    clearViews:function(){
		extendHeight = DEFAULT_EXTENDED_HEIGHT;

		this.setState({
			isClear:true,

			stockInfo: ds.cloneWithRows([]),
			stockInfoRowData: [],
			selectedRow: -1,
			selectedSubItem: 0,
			stockDetailInfo: [],
			showExchangeDoubleCheck: false,
			chartType: NetConstants.PARAMETER_CHARTTYPE_TODAY,
			stopProfitSwitchIsOn: false,
			stopLossSwitchIsOn: false,
			profitLossUpdated: false,
			profitLossConfirmed: false,
			contentLoaded: false,
			isRefreshing: false,
		})
	},

    getDataUrl: function(){
		var url = NetConstants.CFD_API.GET_OPEN_POSITION_API
		if(LogicData.getAccountState()){
			url = NetConstants.CFD_API.GET_OPEN_POSITION_LIVE_API
			console.log('live', url );
		}
		return url;
	},

    refreshFooterBar(responseJson){
		var totalCount = 0;
		for (var i = 0; i < responseJson.length; i++) {
			var rowData = responseJson[i];
			var profitPercentage = 0
			var profitAmount = rowData.upl
			if (rowData.settlePrice !== 0) {
				profitPercentage = (this.getLastPrice(rowData) - rowData.settlePrice) / rowData.settlePrice * rowData.leverage
				profitPercentage *= (rowData.isLong ? 1 : -1)
				profitAmount = profitPercentage * rowData.invest

				//Only use the fxdata for non-usd
				if (rowData.security.ccy != UIConstants.USD_CURRENCY) {
					if (rowData.fxData && rowData.fxData.ask) {
						profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxData)
					}	else if(rowData.fxOutright && rowData.fxOutright.ask){
						profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxOutright)
					} else {
						profitAmount = rowData.upl
					}
				}
			}
			totalCount += profitAmount;

		};

		this.setState({
			totalCount:totalCount
		})
	},

    loadOpenPositionInfo: function() {
		if(!this.state.contentLoaded){
			this.setState({
				isRefreshing: true,
			})
		}
		var userData = LogicData.getUserData();
		var url = this.getDataUrl();
		NetworkModule.fetchTHUrl(
			url,
			{
				method: 'GET',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
					'Accept-Language': LogicData.getLanguageEn() == '1'?'en':'cn',
				}, 
				cache: 'offline',
				//timeout: 1000,
			},
			(responseJson, isCache) => {
				var newState = {
					contentLoaded: true,
					isRefreshing: false,
					isClear:false,
				}

				var interestedStockIds = []
				for (var i = 0; i < responseJson.length; i++) {
					var currencySymbol = responseJson[i].security.ccy
					if (currencySymbol != UIConstants.USD_CURRENCY) {
						// Find the ccy/USD fx data first.
						var fxData = LogicData.getFxDataBySymbol(currencySymbol + UIConstants.USD_CURRENCY)
						if (!fxData) {
							fxData = LogicData.getFxDataBySymbol(UIConstants.USD_CURRENCY + currencySymbol)
						}
						if (fxData) {
							var fxId = fxData.id
							responseJson[i].fxData = fxData
							interestedStockIds.push(fxId)
						}
					}
				}

				//Fix the issue that the listview content may not be shown when the data
				//is refreshed too quickily by set a very short timeout.
				var timeout = isCache ? 0 : 10;

				setTimeout(()=>{
					if (this.state.selectedRow >= responseJson.length) {
						newState.stockInfoRowData = responseJson;
						newState.stockInfo = this.state.stockInfo.cloneWithRows(responseJson)
						newState.selectedRow = -1
						newState.selectedSubItem = 0
					}
					else {
						newState.stockInfoRowData = responseJson;
						newState.stockInfo = this.state.stockInfo.cloneWithRows(responseJson)
					}

					this.setState(newState)
				}, timeout);

				for (var i = 0; i < responseJson.length; i++) {

					var stockId = responseJson[i].security.id
					if (interestedStockIds.indexOf(stockId) < 0) {
						interestedStockIds.push(stockId)
					}
				};

				this.refreshFooterBar(responseJson)

				WebSocketModule.registerInterestedStocks(interestedStockIds.join(','))
				WebSocketModule.registerCallbacks(
					(realtimeStockInfo) => {
						this.handleStockInfo(realtimeStockInfo)
					},
					(alertInfo) => {
						this.loadOpenPositionInfo()
					}
				)
			},
			(result) => {
				if(!result.loadedOfflineCache){
					this.setState({
						contentLoaded: false,
						isRefreshing: false,
					})
				}
				// Alert.alert('', errorMessage);
				if(NetConstants.AUTH_ERROR === result.errorMessage){
					if(LogicData.getTabIndex() == MainPage.STOCK_EXCHANGE_TAB_INDEX){

						var length = this.props.navigator.state.routeStack.length;
						console.log("---> " +this.props.navigator.state.routeStack[length-1].name );
						if(this.props.navigator.state.routeStack[length-1].name !== 'webviewpage'){
							//防止多次进入 登录 页面
							// this.gotoAccountStateExce();
              LogicData.setActualLogin(false)
						}
					}
				}else{
					//Alert.alert('', result.errorMessage);
				}
			}
		)
	},

    // gotoAccountStateExce:function(){
    // 	var userData = LogicData.getUserData()
    // 	var userId = userData.userId
    // 	if (userId == undefined) {
    // 		userId = 0
    // 	}
    // 	console.log("gotoAccountStateExce userId = " + userId);
    // 	this.props.navigator.push({
    // 		name:MainPage.NAVIGATOR_WEBVIEW_ROUTE,
    // 		title:'实盘交易',
    //     onNavigationStateChange: this.onWebViewNavigationStateChange,
    // 		url:'https://tradehub.net/demo/auth?response_type=token&client_id=62d275a211&redirect_uri=https://api.typhoontechnology.hk/api/demo/oauth&state='+userId
    // 		// url:'https://www.tradehub.net/live/yuefei-beta/login.html',
    // 		// url:'http://www.baidu.com',
    // 	});
    // },

    loadStockDetailInfo: function(chartType,stockCode) {
		var isLive = LogicData.getAccountState()
		var url = "";

		if(NetConstants.isCandleChart(chartType)){
			url = isLive ? NetConstants.CFD_API.GET_STOCK_PRICE_KLINE_LIVE_API : NetConstants.CFD_API.GET_STOCK_PRICE_KLINE_API
		}
		else {
		 	url = isLive ? NetConstants.CFD_API.GET_STOCK_PRICE_TODAY_LIVE_API : NetConstants.CFD_API.GET_STOCK_PRICE_TODAY_API
		}
		url = url.replace(/<stockCode>/, stockCode)
		url = url.replace(/<chartType>/, chartType)

		this.setState({
			dataStatus : 2
		})
		NetworkModule.fetchTHUrl(
			url,
			{
				method: 'GET',
			},
			(responseJson) => {
				var tempStockInfo = this.state.stockDetailInfo
				tempStockInfo.priceData = responseJson
				this.setState({
					stockDetailInfo: tempStockInfo,
					dataStatus :0,
				})
			},
			(result) => {
				// Alert.alert('', result.errorMessage);
				this.setState({
					dataStatus :1,
				})
			}
		)
	},

    handleStockInfo: function(realtimeStockInfo) {
		var hasUpdate = false
		// var hasUpdateDetail = false
		var sdi = this.state.stockDetailInfo
		for (var i = 0; i < this.state.stockInfoRowData.length; i++) {
			for (var j = 0; j < realtimeStockInfo.length; j++) {
				if (this.state.stockInfoRowData[i].security.id == realtimeStockInfo[j].id &&
							this.state.stockInfoRowData[i].security.last !== realtimeStockInfo[j].last) {

					this.state.stockInfoRowData[i].security.ask = realtimeStockInfo[j].ask
					this.state.stockInfoRowData[i].security.bid = realtimeStockInfo[j].bid
					this.state.stockInfoRowData[i].security.last = (realtimeStockInfo[j].ask + realtimeStockInfo[j].bid) / 2;
					hasUpdate = true;

					if(this.stopProfitLossRowId == this.state.stockInfoRowData[i].id){
						this.updateStopProfitLossMinMaxValue(this.state.stockInfoRowData[i])
					}
				}
				if (this.state.stockInfoRowData[i].fxData) {
					var fxData = this.state.stockInfoRowData[i].fxData
					if (fxData.id == realtimeStockInfo[j].id &&
								fxData.last !== realtimeStockInfo[j].last) {
						fxData.last = realtimeStockInfo[j].last
						fxData.ask = realtimeStockInfo[j].ask// * 1.005	//Server has already calculated with 0.005, no need to calculate it again!
						fxData.bid = realtimeStockInfo[j].bid// * 0.995
						hasUpdate = true;
					}
				}
				// if (this.state.chartType === NetConstants.PARAMETER_CHARTTYPE_TEN_MINUTE
				// 		&& this.state.stockDetailInfo != undefined
				// 		&& this.state.stockDetailInfo.priceData != undefined
				// 		&& this.state.stockDetailInfo.id == realtimeStockInfo[j].id
				// 		&& !hasUpdateDetail
				// 		) {
				// 	var price = realtimeStockInfo[j].last
				// 	sdi.priceData.push({"p":price,"time":realtimeStockInfo[j].time})
				// 	hasUpdateDetail = true
				// }
			};
		};

		if(this.dataToStore){
			var needToUpdateCache = false;
			for (var i = 0; i < this.dataToStore.length; i++) {
				for (var j = 0; j < realtimeStockInfo.length; j++) {
					if (this.dataToStore[i].security.id == realtimeStockInfo[j].id &&
								this.dataToStore[i].security.last !== realtimeStockInfo[j].last) {

						this.dataToStore[i].security.ask = realtimeStockInfo[j].ask
						this.dataToStore[i].security.bid = realtimeStockInfo[j].bid
						this.dataToStore[i].security.last = (realtimeStockInfo[j].ask + realtimeStockInfo[j].bid) / 2;
						needToUpdateCache = true;
					}
				}
			}
			if(needToUpdateCache){
				var url = this.getDataUrl();
				var data = JSON.stringify(this.dataToStore);
				console.log("store cache open position: " + data)
				CacheModule.storeCacheForUrl(url, data, true);
			}
		}

		if (hasUpdate) {
			this.setState({
				stockInfo: ds.cloneWithRows(this.state.stockInfoRowData)
			},this.refreshFooterBar(this.state.stockInfoRowData))
		}




		// if (hasUpdateDetail) {
		// 	this.setState({stockDetailInfo: sdi})
		// }
	},

    doScrollAnimation: function() {
		if (Platform.OS === 'ios') {
			var newExtendHeight = this.currentExtendHeight(this.state.selectedSubItem)
			if (newExtendHeight < extendHeight) {
				newExtendHeight = extendHeight
			}
			var rowID = this.state.selectedRow
			var maxY = (height-114-UIConstants.LIST_HEADER_BAR_HEIGHT)*20/21 - newExtendHeight
			var currentY = rowHeight*(parseInt(rowID)+1)
			if (currentY > maxY) {
				this.refs['listview'].scrollTo({x:0, y:Math.floor(currentY-maxY), animated:true})
			}

			//Disable the spring animation on Android for now since the RN 3.3 list view has a bug.
			if(Platform.OS === 'ios'){
				//Do not set delete animation, or the some row will be removed if clicked quickly.
				var animation = {
					duration: 700,
					create: {
						type: 'linear',
						property: 'opacity',
					},
					update: {
						type: 'spring',
						springDamping: 0.4,
						property: 'scaleXY',
					},
				}
				LayoutAnimation.configureNext(animation);//LayoutAnimation.Presets.spring);
				//LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
			}
			extendHeight = newExtendHeight
		}
	},

    stockPressed: function(rowData, sectionID, rowID, highlightRow) {
		if (rowHeight === 0) {	// to get the row height, should have better method.
			rowHeight = this.refs['listview'].getMetrics().contentLength/this.state.stockInfoRowData.length
		}

		this.setState({
			showExchangeDoubleCheck: false,
		})
		var newData = []
		$.extend(true, newData, this.state.stockInfoRowData)	// deep copy

		extendHeight = DEFAULT_EXTENDED_HEIGHT
		if (this.state.selectedRow == rowID) {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			newData[rowID].hasSelected = false
			this.setState({
				stockInfo: this.state.stockInfo.cloneWithRows(newData),
				selectedRow: -1,
				selectedSubItem: 0,
				stockInfoRowData: newData,
			})
			if (Platform.OS === 'android') {
				var currentY = rowHeight*(parseInt(rowID))
				this.setTimeout(
					() => {
						if (currentY > 300 && currentY + 3 * rowHeight > this.refs['listview'].getMetrics().contentLength) {
							this.refs['listview'].scrollTo({x:0, y:Math.floor(currentY), animated:true})
						}
					 },
					500
				);
			}
		} else {
			isWaiting = false
			if (this.state.selectedRow >=0) {
				newData[this.state.selectedRow].hasSelected = false
			}
			newData[rowID].hasSelected = true

			var stopProfit = rowData.takePx !== undefined
			// var stopLoss = rowData.stopPx !== undefined
			var stopLoss = this.priceToPercentWithRow(rowData.stopPx, rowData, 2) >= MAX_LOSS_PERCENT

			stopProfitPercent = DEFAULT_PERCENT
			stopLossPercent = MAX_LOSS_PERCENT
			stopProfitUpdated = false
			stopLossUpdated = false

			this.setState({
				stockInfo: this.state.stockInfo.cloneWithRows(newData),
				selectedRow: rowID,
				selectedSubItem: 0,
				stockInfoRowData: newData,
				stopProfitSwitchIsOn: stopProfit,
				stopLossSwitchIsOn: stopLoss,
				profitLossUpdated: false,
				profitLossConfirmed: false,
			}, ()=>{
				this.doScrollAnimation();
			});
		}
	},

    subItemPress: function(item, rowData) {
		var detalY = 0

		var state = {
			selectedSubItem: this.state.selectedSubItem === item ? 0 : item,
			stockInfo: ds.cloneWithRows(this.state.stockInfoRowData)
		};

		if (item === 1) {
			var stockid = rowData.security.id
			state.chartType = this.state.chartType;
			state.stockDetailInfo = rowData.security;
		}
		this.setState(state, ()=>{
			if(item){
				this.loadStockDetailInfo(this.state.chartType,stockid)
			}
			this.doScrollAnimation()
		});
	},

    okPress: function(rowData) {
		if (!rowData.security.isOpen)
			return

		if (this.state.showExchangeDoubleCheck === false) {
			this.setState({
				showExchangeDoubleCheck: true,
			}, ()=>{
				this.doScrollAnimation()
			});
			return
		}

		if (isWaiting) {
			return
		}
		isWaiting = true

		var userData = LogicData.getUserData()
		var url = LogicData.getAccountState() ? NetConstants.CFD_API.POST_DELETE_POSITION_LIVE_API : NetConstants.CFD_API.POST_DELETE_POSITION_API;
		NetworkModule.fetchTHUrl(
			url,
			{
				method: 'POST',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
					'Content-Type': 'application/json; charset=utf-8',
				},
				body: JSON.stringify({
					posId: rowData.id,
					securityId: rowData.security.id,
					isPosLong: rowData.isLong,
					posQty: rowData.quantity,
				}),
				showLoading: true,
			},
			(responseJson) => {
				var soldStockData = null
				for (var i = 0; i < this.state.stockInfoRowData.length; i++) {
					if (this.state.stockInfoRowData[i].id == responseJson.id) {
						soldStockData = this.state.stockInfoRowData.splice(i, 1)
						break
					}
				}
				if (soldStockData) {
					responseJson.openPrice = soldStockData[0].settlePrice
					this.setState({
						stockInfo: ds.cloneWithRows(this.state.stockInfoRowData)
					})
				}

				responseJson.stockName = rowData.security.name
				responseJson.isCreate = false
				responseJson.isLong = rowData.isLong
				responseJson.time = new Date(responseJson.createAt)
				responseJson.invest = rowData.invest
				responseJson.totalHeight = Dimensions.get('window').height - UIConstants.HEADER_HEIGHT - UIConstants.TAB_BAR_HEIGHT - 50
				responseJson.security = rowData.security
				this.refs['confirmPage'].show(responseJson)
				NetworkModule.loadUserBalance(true)

				this.setState ({
					selectedRow: -1,
					selectedSubItem: 0,
				})
				isWaiting = false

				var eventParam = {};
				eventParam[TalkingdataModule.KEY_SECURITY_ID] = responseJson.id.toString();
				eventParam[TalkingdataModule.KEY_SECURITY_NAME] = rowData.security.name;
				eventParam[TalkingdataModule.KEY_IS_LONG] = rowData.isLong ? "是" : "否";
				eventParam[TalkingdataModule.KEY_INVEST] = rowData.invest.toString();
				eventParam[TalkingdataModule.KEY_LEVERAGE] = responseJson.leverage.toString();
				eventParam[TalkingdataModule.KEY_OPEN_PRICE]= rowData.settlePrice.toString();
				eventParam[TalkingdataModule.KEY_OPEN_TIME]= rowData.createAt;
				eventParam[TalkingdataModule.KEY_CLOSE_PRICE]= responseJson.settlePrice.toString();
				eventParam[TalkingdataModule.KEY_CLOSE_TIME]= responseJson.createAt;
				eventParam[TalkingdataModule.KEY_PROFIT]= responseJson.pl.toString();

				TalkingdataModule.trackEvent(TalkingdataModule.SOLD_EVENT, '', eventParam)
				//TongDaoModule.trackClosePositionEvent(responseJson)
			},
			(result) => {
				Alert.alert('', result.errorMessage);
				isWaiting = false
			}
		)
	},

    pressChartHeaderTab: function(type, rowData) {
		this.setState({
			chartType: type
		}, ()=>this.loadStockDetailInfo(type,rowData.security.id)
		)
	},

    currentExtendHeight: function(subItem) {
		var showNetIncome = false
		var newHeight = DEFAULT_EXTENDED_HEIGHT
		if (showNetIncome) {
			newHeight += 20
		}
		if (subItem === 1) {
			newHeight += 170
		}
		if (subItem === 2) {
			newHeight += 170 - 70
			newHeight += this.state.stopLossSwitchIsOn ? 55 : 0
			newHeight += this.state.stopProfitSwitchIsOn ? 55 : 0
		}
		if (this.state.showExchangeDoubleCheck) {
			newHeight += 28
		}
		return newHeight
	},

    onSwitchPressed: function(type, value) {
		var state = {};
		if (type===1) {
			state.stopProfitSwitchIsOn = value;
			stopProfitUpdated = true
		} else{
			state.stopLossSwitchIsOn = value;
			stopLossUpdated = true
		};

		state.profitLossUpdated = true;
		this.setState(state,()=>{
			this.doScrollAnimation();
		});
	},

    switchConfrim: function(rowData) {
		// console.log('Rambo: stopLossPercent switchConfrim = ' + stopLossPercent)
		var currentStopProfitUpdated = stopProfitUpdated;
		var currentStopLossUpdated = stopLossUpdated;
		var currentStopLossPercent = stopLossPercent;
		var currentStopProfitPercent = stopProfitPercent;
		var currentStopProfitSwitchIsOn = this.state.stopProfitSwitchIsOn;
		var currentStopLossSwitchIsOn = this.state.stopLossSwitchIsOn;

		var lastSelectedRow = this.state.selectedRow;
		// var tempStockInfo = this.state.stockInfoRowData;
		// tempStockInfo[lastSelectedRow].isSettingProfitLoss = true;
		//
		// this.setState({
		// 	stockInfoRowData: tempStockInfo,
		// 	stockInfo: ds.cloneWithRows(tempStockInfo),
		// }, ()=>{
			var userData = LogicData.getUserData()
			var url = NetConstants.CFD_API.STOP_PROFIT_LOSS_API
			if(LogicData.getAccountState()){
				url = NetConstants.CFD_API.STOP_PROFIT_LOSS_LIVE_API
				console.log('live', url );
			}

			var eventParam = {};
			eventParam[TalkingdataModule.KEY_STOP_PROFIT_SWITCH_ON] = currentStopProfitSwitchIsOn;
			eventParam[TalkingdataModule.KEY_STOP_LOSS_SWITCH_OFF] = currentStopLossSwitchIsOn;
			eventParam[TalkingdataModule.KEY_STOP_PROFIT] = currentStopProfitUpdated && currentStopProfitSwitchIsOn ? currentStopProfitPercent : '-';
			eventParam[TalkingdataModule.KEY_STOP_LOSS] = currentStopLossUpdated && currentStopLossSwitchIsOn ? currentStopLossPercent : '-';

			TalkingdataModule.trackEvent(TalkingdataModule.SET_STOP_PROFIT_LOSS_EVENT, '', eventParam)

			// STOP LOSS

			this.sendStopLossRequest(rowData,
				lastSelectedRow,
				currentStopLossSwitchIsOn,
				currentStopLossPercent,
				currentStopLossUpdated)
			.then((info)=>{
				return this.sendStopProfitRequest(rowData,
					lastSelectedRow,
					info,
					currentStopProfitSwitchIsOn,
					currentStopProfitPercent,
					currentStopProfitUpdated);
			}).then((result)=>{
				var newState = {
					profitLossUpdated: false,
					profitLossConfirmed: true,
				};

				if(result){
					var tempStockInfo = this.state.stockInfoRowData;
					if ('stopPx' in result){
						tempStockInfo[lastSelectedRow].stopPx = result.stopPx;
						console.log("update stopPx: " + result.stopPx)
					}
					if ('takeOID' in result){
						tempStockInfo[lastSelectedRow].takeOID = result.takeOID;
						console.log("update takeOID: " + result.takeOID)
					}
					if ('takePx' in result){
						tempStockInfo[lastSelectedRow].takePx = result.takePx;
						console.log("update takePx: " + result.takePx)
					}
					//tempStockInfo[lastSelectedRow].isSettingProfitLoss = false;
					newState.stockInfoRowData = tempStockInfo;
					newState.stockInfo = ds.cloneWithRows(tempStockInfo);
				}
				console.log("stop profit/loss finsished. Update state")
				this.setState(newState);
			})
			.catch((error)=>{
				console.log("Met error! " + error);
				//var tempStockInfo = this.state.stockInfoRowData;
				var newState = {
					profitLossUpdated: false,
					profitLossConfirmed: true,
					//stockInfoRowData: tempStockInfo,
					//stockInfo: ds.cloneWithRows(tempStockInfo),
				};
				this.setState(newState);
			});
		//});
	},

    sendStopLossRequest: function(rowData, lastSelectedRow, stopLossSwitchIsOn, stopLossPercent, stopLossUpdated){
		return new Promise((resolve, reject)=>{
			try{
				console.log("stopLossUpdated " + stopLossUpdated)
				if (stopLossUpdated) {
					var userData = LogicData.getUserData()
					if (stopLossSwitchIsOn && stopLossPercent < MAX_LOSS_PERCENT) {
						Alert.alert('', LS.str('ZSCG')+MAX_LOSS_PERCENT+LS.str('WFSZ'));
						reject();
						return
					}
					var url = NetConstants.CFD_API.STOP_PROFIT_LOSS_API
					if(LogicData.getAccountState()){
						url = NetConstants.CFD_API.STOP_PROFIT_LOSS_LIVE_API
						console.log('live', url );
					}
					var price = this.percentToPriceWithRow(stopLossPercent, rowData, 2)
					// console.log("sendStopLoss rowData " + JSON.stringify(rowData));
					// console.log('Rambo: stopLossPercent = ' + stopLossPercent)
					// console.log('Rambo: price = ' + price)
					if(!stopLossSwitchIsOn){
						stopLossPercent=DEFAULT_PERCENT
						price = this.percentToPriceWithRow(-100, rowData, 2)
						var dcm = Math.pow(10, rowData.security.dcmCount)
						if (rowData.isLong){
							price = Math.ceil(price * dcm)/dcm
						}
						else {
							price = Math.floor(price * dcm)/dcm
						}
					}
					// console.log('Rambo: final price = ' + price)
					NetworkModule.fetchTHUrl(
						url,
						{
							method: 'PUT',
							headers: {
								'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
								'Content-Type': 'application/json; charset=utf-8',
							},
							body: JSON.stringify({
								posId: rowData.id,
								securityId: rowData.security.id,
								orderId: rowData.stopOID,
								price: price
							}),
							showLoading: true,
						},
						(responseJson) => {
							console.log("set stop loss returned");
							stopLossUpdated = false
							// this.setState({
							// 	profitLossUpdated: false,
							// 	profitLossConfirmed: true})

							var stockInfo = {};
							stockInfo.stopPx = responseJson.stopPx;
							//var tempStockInfo = this.state.stockInfoRowData
							//tempStockInfo[lastSelectedRow].stopPx = responseJson.stopPx
							// this.setState({
							// 	stockInfoRowData: tempStockInfo,
							// 	stockInfo: ds.cloneWithRows(tempStockInfo),
							// });

							resolve(stockInfo);
						},
						(result) => {
							Alert.alert('', result.errorMessage);
							resolve(null);
						}
					);

					console.log("send request");
				}else{
					resolve(null);
				}
			}catch(error){
				console.log("stop loss has ERROR:" + error);
			}
		});
	},

    sendStopProfitRequest: function(rowData, lastSelectedRow, resolveData, stopProfitSwitchIsOn, stopProfitPercent, stopProfitUpdated){
		return new Promise(resolve=>{
			try{
				var type = 'PUT'
				var body = JSON.stringify({})
				if (stopProfitUpdated) {
					var url = NetConstants.CFD_API.STOP_PROFIT_LOSS_API
					if(LogicData.getAccountState()){
						url = NetConstants.CFD_API.STOP_PROFIT_LOSS_LIVE_API
						console.log('live', url );
					}

					var userData = LogicData.getUserData()
					var price = this.percentToPriceWithRow(stopProfitPercent, rowData, 1);
					console.log("StopProfitPrice rowData " + JSON.stringify(rowData));
					console.log("StopProfitPrice " + price);
					if (rowData.takeOID === undefined) {

						// console.log('Rambo: final price = ' + price)
						if (stopProfitSwitchIsOn) {
							url = NetConstants.CFD_API.ADD_REMOVE_STOP_PROFIT_API
							if(LogicData.getAccountState()){
								url = NetConstants.CFD_API.ADD_REMOVE_STOP_PROFIT_LIVE_API
								console.log('live', url );
							}
							type = 'POST'
							body = JSON.stringify({
									posId: rowData.id,
									securityId: rowData.security.id,
									price: price,
								})
						}
						else {
							stopProfitUpdated = false
							//this.setState({profitLossUpdated: false})
							resolve(resolveData);
							return
						}
					}
					else {
						if(stopProfitSwitchIsOn) {
							body = JSON.stringify({
								posId: rowData.id,
								securityId: rowData.security.id,
								orderId: rowData.takeOID,
								price: price,
							})
						}
						else {
							url = NetConstants.CFD_API.ADD_REMOVE_STOP_PROFIT_API
							if(LogicData.getAccountState()){
								url = NetConstants.CFD_API.ADD_REMOVE_STOP_PROFIT_LIVE_API
								console.log('live', url );
							}
							type = 'DELETE'
							body = JSON.stringify({
									posId: rowData.id,
									securityId: rowData.security.id,
									orderId: rowData.takeOID,
								})
						}
					}
					NetworkModule.fetchTHUrl(
						url,
						{
							method: type,
							headers: {
								'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
								'Content-Type': 'application/json; charset=utf-8',
							},
							body: body,
							showLoading: true,
						},
						(responseJson) => {
							stopProfitUpdated = false
							// this.setState({
							// 	profitLossUpdated: false,
							// 	profitLossConfirmed: true})

							var tempStockInfo = this.state.stockInfoRowData
							if(!resolveData){
								resolveData = {}
							}
							if (responseJson.takePx === undefined) {
								resolveData.takeOID = undefined
								resolveData.takePx = undefined
								// tempStockInfo[lastSelectedRow].takeOID = undefined
								// tempStockInfo[lastSelectedRow].takePx = undefined
							}
							else {
								resolveData.takeOID = responseJson.takeOID
								resolveData.takePx = responseJson.takePx
								// tempStockInfo[lastSelectedRow].takeOID = responseJson.takeOID
								// tempStockInfo[lastSelectedRow].takePx = responseJson.takePx
							}
							resolve(resolveData);
						},
						(result) => {
							Alert.alert('', result.errorMessage);
							resolve(resolveData);
						}
					)
				}
				else{
					resolve(resolveData);
				}
			}catch(error){
				console.log("set stop profit error: " + error);
			}
		});
	},

    getLastPrice: function(rowData) {
		var lastPrice = rowData.isLong ? rowData.security.bid : rowData.security.ask
		// console.log(rowData.security.bid, rowData.security.ask)
		return lastPrice === undefined ? rowData.security.last : lastPrice
	},

    renderHeaderBar: function() {
		var strCP = LS.str('CP')
		var strYK = LS.str('YK')
		var strSYL = LS.str('SYL')

			return (
				<View style={styles.headerBar}>
					<View style={[styles.rowLeftPart, {	paddingTop: 5,}]}>
						<Text style={styles.headerTextLeft}>{strCP}</Text>
					</View>
					<View style={[styles.rowCenterPart, {	paddingRight: 10,}]}>
						<Text style={[styles.headerTextLeft, {paddingRight: 0,}]}>{strYK}</Text>
					</View>
					<View style={styles.rowRightPart}>
						<Text style={styles.headerTextLeft}>{strSYL}</Text>
					</View>
				</View>
			);
	},

    renderFootBar: function() {
		var strCCYK = LS.str('CCYK')
			return (
				<View style={styles.headerBar}>
					<View style={[styles.rowLeftPart, {	paddingTop: 5,}]}>
						<Text style={styles.headerTextLeft}>{strCCYK}</Text>
					</View>
					<View style={[styles.rowCenterPart, {	paddingRight:width/3,}]}>
						<Text style={[styles.headerTextLeft, {paddingRight: 0,}]}>{this.state.totalCount.toFixed(2)}</Text>
					</View>
				</View>
			);

	},

    renderSeparator: function(sectionID, rowID, adjacentRowHighlighted) {
		if(rowID == this.state.selectedRow - 1) {
			return null
		}
		return (
			<View style={styles.line} key={rowID}>
				<View style={styles.separator}/>
			</View>
		);
	},

    renderFooter: function() {

	},

    renderStockStatus:function(rowData){
		if(rowData.security!==undefined){
			if(rowData.security.isOpen){
				return null;
			}else{
				// console.log('rowData.security.status = ' + rowData.security.status);
				var statusTxt = rowData.security.status == 2 ? LS.str('ZT'):LS.str('BS')
				return(
					<View style={styles.statusLableContainer}>
						<Text style={styles.statusLable}>{statusTxt}</Text>
					</View>
				)
			}
		}
	},

    renderCountyFlag: function(rowData) {
		if (rowData.tag !== undefined) {
			return (
				<View style={styles.stockCountryFlagContainer}>
					<Text style={styles.stockCountryFlagText}>
						{rowData.security.tag}
					</Text>
				</View>
			);
		}
	},

    renderProfit: function(percentChange, endMark) {
		var textSize = Math.round(18*width/375.0)
		percentChange = percentChange.toFixed(2)
		var startMark = percentChange > 0 ? "+":null
		return (
			<Text style={[styles.stockPercentText, {color: ColorConstants.stock_color(percentChange), fontSize:textSize}]}>
				 {startMark}{percentChange} {endMark}
			</Text>
		);

	},

    renderChartHeader: function(rowData) {
		var tabs = tabData.map(
			(data, i) =>
			<TouchableOpacity style={{width:width/tabData.length}} key={i}
					onPress={() => this.pressChartHeaderTab(data.type, rowData)}>
				<Text style={this.state.chartType == data.type? styles.chartTitleTextHighlighted : styles.chartTitleText}>
					{data.name}
				</Text>
			</TouchableOpacity>
		)
		return(
			<View>
				<ScrollView horizontal={true} style={{flex: 0, paddingBottom: 5, marginTop: 6}}>
					{tabs}
				</ScrollView>
			</View>
			);
	},

    renderStockMaxPriceInfo: function(maxPrice, maxPercentage, isTop) {
		if (maxPrice && maxPercentage)
		{
			return (
				<View style={{flexDirection: 'row'}}>
					<View style={{flex: 1, alignItems: 'flex-start', marginLeft: 20}}>
						<Text style={[styles.priceText, isTop && {color:'black'}]}>
							{maxPrice}
						</Text>
					</View>

					<View style={{flex: 1, alignItems: 'flex-end', marginRight: 20}}>
						<Text style={[styles.priceText, isTop && {color:'black'}]}>
							{maxPercentage} %
						</Text>
					</View>
				</View>
			);
		}
		else {
			return (
				<View style={{height:16}}/>)
		}
	},

    setSliderValue: function(type, value, rowData) {
		// console.log('Rambo:stopLossPercent' + value)
		if (type === 1) {
			stopProfitPercent = value
			stopProfitUpdated = true
		}
		else {
			stopLossPercent = value
			stopLossUpdated = true
		}
		this.useNativePropsToUpdate(type, value, rowData)
	},

    percentToPrice: function(percent, basePrice, leverage, type, isLong) {
		//if (type === 1) {
			// 止盈
		return isLong ? basePrice * (1+percent/100/leverage) : basePrice * (1-percent/100/leverage)
		// }
		// else {
		// 	// 止损
		// 	return isLong ? basePrice * (1-percent/100/leverage) : basePrice * (1+percent/100/leverage)
		// }
	},

    percentToPriceWithRow: function(percent, rowData, type) {
		var leverage = rowData.leverage === 0 ? 1 : rowData.leverage
		return this.percentToPrice(percent, rowData.settlePrice, leverage, type, rowData.isLong)
	},

    priceToPercent: function(price, basePrice, leverage, type, isLong) {	
		//if (type === 1) {
			return (price-basePrice)/basePrice*100*leverage * (isLong?1:-1)
		// }
		// else {
		// 	return (basePrice-price)/basePrice*100*leverage * (isLong?1:-1)
		// }
	},

    priceToPercentWithRow: function(price, rowData, type) {
		var leverage = rowData.leverage === 0 ? 1 : rowData.leverage
		return this.priceToPercent(price, rowData.settlePrice, leverage, type, rowData.isLong)
	},

    calculateProfitWithOutright: function(profitAmount, fxData) {
		if (profitAmount > 0) {//want to sell XXX and buy USD
			var fxPrice
			if (fxData.symbol.substring(UIConstants.USD_CURRENCY.length) != UIConstants.USD_CURRENCY) {//USD/XXX
				fxPrice = 1 / fxData.ask
			} else {// XXX/USD
				fxPrice = fxData.bid
			}
			profitAmount *= fxPrice
		} else {// Want to buy XXX and sell USD
			var fxPrice
			if (fxData.symbol.substring(UIConstants.USD_CURRENCY.length) != UIConstants.USD_CURRENCY) { // USD/XXX
				fxPrice = 1 / fxData.bid
			} else { // XXX/USD
				fxPrice = fxData.ask
			}
			console.log("fxData" + JSON.stringify(fxData))
			profitAmount *= fxPrice
		}
		return profitAmount
	},

    renderSlider: function(rowData, type, startPercent, endPercent, percent) {
		//1, stop profit
		//2, stop loss
		var disabled = false
		if (type === 2) {
			if (endPercent < MAX_LOSS_PERCENT) {
				// max visible percent should be not less than MAX_LOSS_PERCENT(-90)
				endPercent = MAX_LOSS_PERCENT
				startPercent = endPercent
				disabled = true
			}
		}
		return (
			<View style={[styles.sliderView]}>
				<Slider
					ref={component => this.bindSliderRef(type, component, type)}
					style={styles.slider}
					minimumTrackTintColor={ColorConstants.title_blue()}
					minimumValue={startPercent}
					value={percent}
					maximumValue={endPercent}
					step={0.01}
					disabled={disabled}
					onSlidingComplete={(value) => this.setState({profitLossUpdated: true})}
					onValueChange={(value) => this.setSliderValue(type, value, rowData)} />
				<View style = {styles.subDetailRowWrapper}>
					<Text style={styles.sliderLeftText}>{startPercent.toFixed(2)}%</Text>
					<Text style={styles.sliderRightText}>{endPercent.toFixed(2)}%</Text>
				</View>
			</View>
			)
	},

    useNativePropsToUpdate: function(type, value, rowData){
		var price = this.percentToPriceWithRow(value, rowData, type)
		if (type === 1){
			this._text1.setNativeProps({text: value.toFixed(2)+'%'});
			this._text3.setNativeProps({text: price.toFixed(rowData.security.dcmCount)})
		}
		else if (type === 2) {
			var props = {text: value.toFixed(2)+'%'};
			if(Platform.OS === "ios"){
				props.color = value >= 0
				 ? ColorConstants.STOCK_RISE_RED : ColorConstants.STOCK_DOWN_GREEN;
			}else{
				props.style = {color: value >= 0 ? ColorConstants.STOCK_RISE_RED : ColorConstants.STOCK_DOWN_GREEN};
			}
			this._text2.setNativeProps(props);
			this._text4.setNativeProps({text: price.toFixed(rowData.security.dcmCount)})
		}
	},

    bindRef: function(type, component, mode){
		if (mode === 1) {
			if (type === 1){
				this._text1 = component
			}
			else if (type === 2) {
				this._text2 = component
			}
		}
		else {
			if (type === 1){
				this._text3 = component
			}
			else if (type === 2) {
				this._text4 = component
			}
		}
	},

    bindSliderRef: function(type, component){
		if (type === 1){
			this._slider1 = component
		}
		else if (type === 2) {
			this._slider2 = component
		}
	},

    stopProfitLossRowId: 0,

    //1 stop profit, 2 stop loss
    stopProfitLossKeyboardType: 0,

    stopProfitMinValue: 0,
    stopProfitMaxValue: 0,
    stopLossMinValue: 0,
    stopLossMaxValue: 0,

    renderStopProfitLoss: function(rowData, type) {

		var titleText = type===1 ?  LS.str('ZY1'):LS.str('ZS1')
		var switchIsOn = type===1 ? this.state.stopProfitSwitchIsOn : this.state.stopLossSwitchIsOn
		var price = rowData.settlePrice
		var percent = type===1 ? stopProfitPercent : stopLossPercent
		var startPercent = 0
		var endPercent = MAX_LOSS_PERCENT

		if (type === 1) {
			// stop profit
			startPercent = this.priceToPercentWithRow(rowData.security.last, rowData, type)
			// use gsmd to make sure this order is guaranteed.
			startPercent += rowData.security.smd*100*rowData.leverage
			if (startPercent < 0)
				startPercent = 0
			endPercent = startPercent + 100
			if (percent === DEFAULT_PERCENT) {
				percent = rowData.takePx === undefined ? startPercent
					: this.priceToPercentWithRow(rowData.takePx, rowData, type)
				stopProfitPercent = percent
			}
		} else{
			// stop loss
			startPercent = MAX_LOSS_PERCENT
			endPercent = this.priceToPercentWithRow(rowData.security.last, rowData, type)
			// use smd to make sure this order is guaranteed.
			endPercent -= rowData.security.gsmd*100*rowData.leverage
			
			if(endPercent - startPercent > 100){
				startPercent = endPercent - 100
			}
			if (!stopLossUpdated){//percent === MAX_LOSS_PERCENT) {

				percent = this.priceToPercentWithRow(rowData.stopPx, rowData, type)
				if (percent < startPercent) {
					percent = startPercent
				}
				stopLossPercent = percent
			}
		};

		var color = type===1 ? ColorConstants.STOCK_RISE_RED : ( percent >= 0 ? ColorConstants.STOCK_RISE_RED : ColorConstants.STOCK_DOWN_GREEN);

		var disabled = false
		if (type === 2) {
			if (startPercent < MAX_LOSS_PERCENT) {
				disabled = true
			}
		}

		price = this.percentToPriceWithRow(percent, rowData, type)

		var endValue1 = this.percentToPriceWithRow(startPercent, rowData, type)
		var endValue2 = this.percentToPriceWithRow(endPercent, rowData, type)

		var minValue = Math.min(endValue1, endValue2).toFixed(4)
		var maxValue = Math.max(endValue1, endValue2).toFixed(4)

		return (
			<View>
				<View style={[styles.subDetailRowWrapper, {height:50}]}>
					<Text style={styles.extendLeft}>{titleText}</Text>
					{
						switchIsOn ?
						<View style={[styles.extendMiddle,
							 {flexDirection: 'row', flex:3, paddingTop:0, paddingBottom:0, justifyContent: 'center', alignItems: 'center'}]}>
							<TextInput editable={false} ref={component => this.bindRef(type, component, 1)} defaultValue={percent.toFixed(2)+'%'}
								style={{flex:3, textAlign:'right', fontSize:17, color: color}}
								underlineColorAndroid='transparent'/>
							<TouchableOpacity
								style={{flex:3, alignSelf:'stretch', flexDirection:'column', alignItems:'center', justifyContent:'center'}}
								onPress={()=>{
									//this.setState({isFocused: true});
									this.onChangeStopProfitValuePressed(
										rowData,
										type,
										price.toFixed(rowData.security.dcmCount))
								}}>
								<View style={[styles.stopProfitLossInputBox, {borderColor:'#445c86',}]} pointerEvents={'none'}>
									<TextInput editable={false} ref={component => this.bindRef(type, component, 2)}
										defaultValue={price.toFixed(rowData.security.dcmCount)}
										style={styles.stopProfitLossInputBoxText}
										numberOfLines={1}
										underlineColorAndroid='transparent'
										pointerEvents={'none'}/>
								</View>
							</TouchableOpacity>
						</View>
						: null
					}
					<View style={styles.extendRight}>
		        <Switch
		          onValueChange={(value) => this.onSwitchPressed(type, value)}
		          value={switchIsOn}
							disabled={disabled}
						  onTintColor={ColorConstants.title_blue()} />
			        </View>
				</View>
				{ switchIsOn ? this.renderSlider(rowData, type, startPercent, endPercent, percent) : null}
				<View style={styles.darkSeparator} />
			</View>)
	},

    toFixedCeil: function(num, precision) {
		return (+(Math.ceil(+(num + 'e' + precision)) + 'e' + -precision)).toFixed(precision);
	},

    toFixedFloor: function(num, precision) {
		return (+(Math.floor(+(num + 'e' + precision)) + 'e' + -precision)).toFixed(precision);
	},

    getErrorText: function(type, minValue, maxValue) {
		if( type == 1){
			return LS.str('ZYWZ') +" "+ minValue.toString()+" " + LS.str('D') +" "+ maxValue.toString()+" "+   LS.str('ZJ_');
		}else if (type == 2){
			return LS.str('ZSWZ') +" "+ minValue.toString()+" " + LS.str('D')+" " + maxValue.toString() +" "+ LS.str('ZJ_');
		}
	},

    getError: function(value, rowData, type){
		var maxValue, minValue = 0;
		if( type == 1){
			var maxValue = this.toFixedFloor(this.stopProfitMaxValue, rowData.security.dcmCount);
			var minValue = this.toFixedCeil(this.stopProfitMinValue, rowData.security.dcmCount);
		}else if (type == 2){
			var maxValue = this.toFixedFloor(this.stopLossMaxValue, rowData.security.dcmCount);
			var minValue = this.toFixedCeil(this.stopLossMinValue, rowData.security.dcmCount);
		}

		if(value < minValue || value > maxValue){
			return this.getErrorText(type, minValue, maxValue)
		}
		return null;
	},

    getStopProfitLossMinMaxValue: function(rowData, type){
		var percent = type===1 ? stopProfitPercent : stopLossPercent
		var startPercent = 0
		var endPercent = MAX_LOSS_PERCENT

		if (type === 1) {

			// stop profit
			startPercent = this.priceToPercentWithRow(rowData.security.last, rowData, type)
			// use gsmd to make sure this order is guaranteed.
			startPercent += rowData.security.smd*100*rowData.leverage

			if (startPercent < 0)
				startPercent = 0
			endPercent = startPercent + 100
			if (percent === DEFAULT_PERCENT) {
				percent = rowData.takePx === undefined ? startPercent
					: this.priceToPercentWithRow(rowData.takePx, rowData, type)
				stopProfitPercent = percent
			}
		} else{

			// stop loss
			startPercent = MAX_LOSS_PERCENT
			endPercent = this.priceToPercentWithRow(rowData.security.last, rowData, type)
			// use smd to make sure this order is guaranteed.
			endPercent -= rowData.security.gsmd*100*rowData.leverage

			if(endPercent - startPercent > 100){
				startPercent = endPercent - 100
			}

			if (!stopLossUpdated){//percent === MAX_LOSS_PERCENT) {

				percent = this.priceToPercentWithRow(rowData.stopPx, rowData, type)
				if (percent < startPercent) {
					percent = startPercent
				}
				stopLossPercent = percent
			}
		};

		var endValue1 = this.percentToPriceWithRow(startPercent, rowData, type)
		var endValue2 = this.percentToPriceWithRow(endPercent, rowData, type)

		var minValue = Math.min(endValue1, endValue2).toFixed(4)
		var maxValue = Math.max(endValue1, endValue2).toFixed(4)
		return {
			minValue:minValue,
			maxValue: maxValue
		};
	},

    updateCurrentStopLossProfitMinMaxValue: function(rowData, type){
		var values = this.getStopProfitLossMinMaxValue(rowData,type)
		var minValue = values.minValue;
		var maxValue = values.maxValue;

		if(type === 1){
			this.stopProfitMinValue = minValue
			this.stopProfitMaxValue = maxValue
		}else if (type === 2){
			this.stopLossMinValue = minValue
			this.stopLossMaxValue = maxValue
		}
	},

    updateStopProfitLossMinMaxValue: function(rowData){

		if(MainPage.getIsKeyboardShown()){
			var type = this.stopProfitLossKeyboardType;

			var previousMinValue = 0;
			var previousMaxValue = 0;

			var minValue, maxValue = 0;

			if(type === 1){
				previousMinValue = this.stopProfitMinValue;
				previousMaxValue = this.stopProfitMaxValue;
			}else if (type === 2){
				previousMinValue = this.stopLossMinValue;
				previousMaxValue = this.stopLossMaxValue;
			}

			this.updateCurrentStopLossProfitMinMaxValue(rowData, type);
			if(type === 1){
				minValue = this.stopProfitMinValue;
				maxValue = this.stopProfitMaxValue;
			}else if (type === 2){
				minValue = this.stopLossMinValue;
				maxValue = this.stopLossMaxValue;
			}
			
			if(previousMinValue != minValue || previousMaxValue != maxValue){
				MainPage.updateKeyboardErrorText(this.getErrorText(rowData, type));
			}
		}
	},

    onChangeStopProfitValuePressed: function(
		rowData,
		type,
		currentValue){

		this.stopProfitLossKeyboardType = type;
		this.stopProfitLossRowId = rowData.id;

		this.updateCurrentStopLossProfitMinMaxValue(rowData, type);

		MainPage.showKeyboard({
			value: currentValue,
			checkError: (value)=>{
				return this.getError(value, rowData, type);
			},
			hasDot: true,
			dcmCount: rowData.security.dcmCount,
			onInputConfirmed: (newValue)=>{
				var newPercent = this.priceToPercentWithRow(newValue, rowData, type)

				this.setState({
					stockInfo: ds.cloneWithRows(this.state.stockInfoRowData),
				})
				this.setSliderValue(type, newPercent, rowData)
			}
		})
	},

    renderChart:function(){
		var state = this.state.dataStatus;
		// console.log("RAMBO: chartType = " + this.state.chartType)
		var opacity = state == 0? 1.0 : 0.01;
		if(Platform.OS === 'ios'){
			return(
				<LineChart style={[styles.lineChart,{opacity:opacity}]}
					data={JSON.stringify(this.state.stockDetailInfo)}
					chartType={this.state.chartType}
					colorType={1}
					// chartIsActual={LogicData.getAccountState()}
					lineChartGradient={LogicData.getAccountState() ? ['#374d74','#6683b3'] : ['#99bfff', '#1954b9']}
					descriptionColor={1}>
				</LineChart>
			)
		}else{
			var textColor, borderColor, lineChartGradient;
			textColor = LogicData.getAccountState() ? "#94a9cf" : "#0740a7"
			borderColor = LogicData.getAccountState() ? "#91a4c5" : "#0d4ab6";
			lineChartGradient = LogicData.getAccountState() ? ['#5f7baa','#3f5680'] : ['#387ae7', '#1962dd'];

			return (
				<LineChart style={[styles.lineChart,{opacity:opacity}]}
					data={JSON.stringify(this.state.stockDetailInfo)}
					chartType={this.state.chartType}
					colorType={1}
					// chartIsActual={LogicData.getAccountState()}
					lineChartGradient={LogicData.getAccountState() ? ['#374d74','#6683b3'] : ['#99bfff', '#1954b9']}
					descriptionColor={1}
					xAxisPosition="BOTTOM"
					borderColor={borderColor}
					preCloseColor={borderColor}
					xAxisTextSize={8}
					textColor={textColor}
					chartPaddingTop={0}
					chartPaddingBottom={4}	//The limit line needs some space to show, set it to 3...
					chartPaddingLeft={10}
					chartPaddingRight={10}
				>
				</LineChart>)
		}
	},

    renderDataStatus:function(){
		//status 0:正常 1：暂时无法获取数据 2:加载中
		var status = this.state.dataStatus;
		// if(WebSocketModule.isConnected()){status=0}

		var imageError = LogicData.getAccountState()?require('../../images/icon_network_connection_error_live.png'):require('../../images/icon_network_connection_error.png')
		if(status === 1){
			return (
				<View style={styles.dataStatus}>
					<View style={styles.dataStatus2}>
					<Image style={{width:24,height:24,marginBottom:5}} source={imageError}></Image>
					<Text style={styles.textDataStatus}>暂时无法获取数据</Text>
					<TouchableOpacity onPress={()=> this.dataRefreshClicked()}>
						<View>
							<Text style={styles.textDataStatusRefresh}>刷新</Text>
						</View>
					</TouchableOpacity>
					</View>
				</View>
			)
		}else if(status === 2){
			return (
				<View style={styles.dataStatus}>
					<View style={styles.dataStatus2}>
					{this._renderActivityIndicator()}
					<Text style={styles.textDataStatus}>加载中...</Text>
					</View>
				</View>
			)
		}
	},

    dataRefreshClicked:function(){

		// if(!loadStockInfoSuccess){
		// 	this.loadStockInfo();
		// }else{
	  // this.loadStockPriceToday(false, this.state.chartType, this.state.stockInfo)
		// }
		// console.log('Rambo stockId is '+_currentRowData.security.id);
		this.loadStockDetailInfo(this.state.chartType,_currentRowData.security.id)

	},

    _renderActivityIndicator() {
			return ActivityIndicator ? (
					<ActivityIndicator
							style={{marginRight: 10,}}
							animating={true}
							color={'black'}
							size={'small'}/>
			) : Platform.OS == 'android' ?
					(
							<ProgressBarAndroid
									style={{marginRight: 10,}}
									color={'black'}
									styleAttr={'Small'}/>

					) :  (
					<ActivityIndicatorIOS
							style={{marginRight: 10,}}
							animating={true}
							color={'black'}
							size={'small'}/>
			)
	},

    renderSubDetail: function(rowData) {
		if (this.state.selectedSubItem === 1) {
			// market view
			var priceData = this.state.stockDetailInfo.priceData
			var maxPrice = undefined
			var minPrice = undefined
			var maxPercentage = undefined
			var minPercentage = undefined

			if (priceData != undefined) {
				//todo
				var lastClose = rowData.security.preClose
				maxPrice = Number.MIN_VALUE
				minPrice = Number.MAX_VALUE

				for (var i = 0; i < priceData.length; i ++) {
					var price = 0

					if(this.state.chartType == NetConstants.PARAMETER_CHARTTYPE_5_MINUTE||
					  this.state.chartType == NetConstants.PARAMETER_CHARTTYPE_DAY){
						price = priceData[i].close
					}else{
						price = priceData[i].p
					}

					if (price > maxPrice) {
						maxPrice = price
					}
					if (price < minPrice) {
						minPrice = price
					}
				}
				var maxPercentage = (maxPrice - lastClose) / lastClose * 100
				var minPercentage = (minPrice - lastClose) / lastClose * 100
				maxPercentage = maxPercentage.toFixed(2)
				minPercentage = minPercentage.toFixed(2)
			}
			// market detail
			return (
				<View style={{height: 170}}>
					{this.renderChartHeader(rowData)}
					{this.renderChart()}
					{this.renderDataStatus()}
					<View style={{marginBottom:5}}>
						<Text style={styles.tipsLine}>行情可能存在细微偏差</Text>
					</View>
				</View>
			);
		}
		else {
			var thisPartHeight = 100 //170
			thisPartHeight += this.state.stopLossSwitchIsOn ? 55 : 0
			thisPartHeight += this.state.stopProfitSwitchIsOn ? 55 : 0

			return (
				<View style={{height:thisPartHeight}}>
					{this.renderStopProfitLoss(rowData, 1)}
					{this.renderStopProfitLoss(rowData, 2)}
				</View>
				);
		}
	},

    renderProfitOKViw: function(rowData){
		var confirmText = '确认'
		if (!this.state.profitLossUpdated && this.state.profitLossConfirmed) {
			confirmText = '已设置'
		}

		return (
			<TouchableHighlight
				underlayColor={this.state.profitLossUpdated ? ColorConstants.title_blue():'#dfdee4'}
				onPress={() => this.switchConfrim(rowData)} style={[styles.okView, !this.state.profitLossUpdated && styles.okViewDisabled,this.state.profitLossUpdated && {backgroundColor:ColorConstants.title_blue()} ]}>
				<Text style={[styles.okButton, !this.state.profitLossUpdated && styles.okViewDisabled, this.state.profitLossUpdated && {backgroundColor:ColorConstants.title_blue()}]}>
					{confirmText}
				</Text>
			</TouchableHighlight>
		)
	},

    renderOKView: function(rowData) {
		var showNetIncome = false

		var profitAmount = rowData.upl
		if (rowData.settlePrice !== 0) {
			var lastPrice = this.getLastPrice(rowData)
			var profitPercentage = (lastPrice - rowData.settlePrice) / rowData.settlePrice * rowData.leverage

			profitPercentage *= (rowData.isLong ? 1 : -1)
			profitAmount = profitPercentage * rowData.invest

			//Only use the fxdata for non-usd
			if (rowData.security.ccy != UIConstants.USD_CURRENCY) {
				if (rowData.fxData && rowData.fxData.ask) {
					//This fxData returned by socket instead of the API response!
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxData)
				}
				else if(rowData.fxOutright && rowData.fxOutright.ask){
					//Only use this value when there's no fxData returned from socket.
					//rowData.fxOutright won't change once it's fetched from the api!
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxOutright)
				} else {
					//Error below! Use the upl will make the percentage and price not synchronized...
					profitAmount = rowData.upl
				}
			}
		}

		var buttonText = (profitAmount < 0 ? LS.str('KS'):LS.str('HL')) + ': $' + profitAmount.toFixed(2)
		if (this.state.showExchangeDoubleCheck) {
			buttonText = LS.str('QR')+':$' + profitAmount.toFixed(2)
		}

		var underlayColor = rowData.security.isOpen ? ColorConstants.title_blue() : '#dfdee4';
		var separatorStyle = styles.darkSeparator;
		var buttonStyle = [styles.okView,{backgroundColor:ColorConstants.title_blue()},this.state.showExchangeDoubleCheck && {backgroundColor:'white',borderWidth:1,borderColor:ColorConstants.title_blue()}, !rowData.security.isOpen && styles.okViewDisabled];
		var buttonTextStyle = [styles.okButton,this.state.showExchangeDoubleCheck&&{color:ColorConstants.title_blue()}];
		if(this.state.selectedSubItem === 2){
			var buttonText = LS.str('QR')
			if (!this.state.profitLossUpdated && this.state.profitLossConfirmed) {
				buttonText = LS.str('YSZ')
			}
			//separatorStyle = {backgroundColor: 'pink'};
			underlayColor = this.state.profitLossUpdated ? ColorConstants.title_blue():'#dfdee4';
			buttonStyle = [styles.okView, !this.state.profitLossUpdated && styles.okViewDisabled,this.state.profitLossUpdated && {backgroundColor:ColorConstants.title_blue()} ]
			buttonTextStyle = [styles.okButton, !this.state.profitLossUpdated && styles.okViewDisabled, this.state.profitLossUpdated && {backgroundColor:ColorConstants.title_blue()}];
			// if(rowData.isSettingProfitLoss){
			// 	buttonText = "请稍后"
			// 	buttonStyle = [styles.okView, styles.okViewDisabled];
			// 	buttonTextStyle = [styles.okButton, styles.okViewDisabled];
			// }
		}
		return(
			<View>
				<View style={separatorStyle}/>
				{showNetIncome ? <Text style={styles.netIncomeText}>净收益:9.26</Text> : null}

				<TouchableHighlight
					underlayColor={underlayColor}
					onPress={()=>this.state.selectedSubItem === 2 ? this.switchConfrim(rowData) : this.okPress(rowData)}
					style={buttonStyle}
					>
					<Text style={buttonTextStyle}>
						{buttonText}
					</Text>
				</TouchableHighlight>

				{this.state.showExchangeDoubleCheck ?
					<Text style={styles.feeText}>平仓费：0</Text> :
					null}
			</View>)
	},

    renderDetailInfo: function(rowData) {
		var tradeImage = rowData.isLong ? require('../../images/icon_up_cw.png') : require('../../images/icon_down_cw.png')
		var lastPrice = this.getLastPrice(rowData)
		// console.log('RAMBO rowData.id = ' + rowData.security.id)
		_currentRowData = rowData
	//   console.log('RAMBO _currentRowData.id = ' + _currentRowData.security.id)
		var newExtendHeight = this.currentExtendHeight(this.state.selectedSubItem)
		var stopLossImage = LogicData.getAccountState()?require('../../images/check_actual.png'):require('../../images/check.png')
		var stopLoss = this.priceToPercentWithRow(rowData.stopPx, rowData, 2) >= MAX_LOSS_PERCENT
		var stopProfit = rowData.takePx !== undefined
		if (stopLoss || stopProfit) {
			stopLossImage = LogicData.getAccountState()?require('../../images/check2_actual.png'):require('../../images/check2.png')
		}
		var currentPriceLabel = rowData.isLong ?   LS.str('DQMJ2'):LS.str('DQMJ')
		var openDate = new Date(rowData.createAt)
		var currency = UIConstants.CURRENCY_CODE_LIST[rowData.security.ccy]

		var financing_dividend_sum = 0;
		if(rowData.financingSum){
			financing_dividend_sum += rowData.financingSum;
		}
		if(rowData.dividendSum){
			financing_dividend_sum += rowData.dividendSum;
		}

		return (
			<View style={[{height: newExtendHeight}, styles.extendWrapper]} >
				<View style={[styles.darkSeparator, {marginLeft: 0}]} />
				<View style={styles.extendRowWrapper}>
					<View style={styles.extendLeft}>
						<Text style={styles.extendTextTop}>{LS.str('LX')}</Text>
						<Image style={styles.extendImageBottom} source={tradeImage}/>
					</View>
					<View style={styles.extendMiddle}>
						<Text style={styles.extendTextTop}>{LS.str('BENJIN2')}({currency})</Text>
						<Text style={styles.extendTextBottom}>{rowData.invest.toFixed(2)}</Text>
					</View>
					<View style={styles.extendRight}>
						<Text style={styles.extendTextTop}>{LS.str('GANGAN2')}</Text>
						<Text style={styles.extendTextBottom}>{rowData.leverage}</Text>
					</View>
				</View>
				<View style={styles.darkSeparator} />
				<View style={styles.extendRowWrapper}>
					<View style={styles.extendLeft}>
						<Text style={styles.extendTextTop}>{LS.str('KCJG')}</Text>
						<Text style={styles.extendTextBottom}>{rowData.settlePrice.maxDecimal(5)}</Text>
					</View>
					<View style={styles.extendMiddle}>
						<Text style={styles.extendTextTop}>{currentPriceLabel}</Text>
						<Text style={styles.extendTextBottom}>{lastPrice.maxDecimal(5)}</Text>
					</View>
					<View style={styles.extendRight}>
						<Text style={styles.extendTextTop}>{openDate.Format('yy/MM/dd')}</Text>
						<Text style={styles.extendTextBottom}>{openDate.Format('hh:mm')}</Text>
					</View>
				</View>
				<View style={styles.darkSeparator} />

				<View style={styles.extendRowWrapper}>
					<View style={[styles.extendLeft, this.state.selectedSubItem==2 && styles.bottomBorder,
						{borderBottomColor:ColorConstants.title_blue()},]}>
						<View>
      				<Text style={styles.extendTextTop}>{LS.str('GYF_FH')}</Text>
      			</View>
						<View>
      				<Text style={styles.extendTextBottom}>{financing_dividend_sum.toFixed(2)}</Text>
      			</View>
					</View>

					<TouchableOpacity onPress={()=>this.subItemPress(2, rowData)}
						style={[styles.extendMiddle, (this.state.selectedSubItem===1)&&styles.bottomBorder,
								(this.state.selectedSubItem===2)&&styles.leftTopRightBorder,
								{borderTopColor:ColorConstants.title_blue()},
								{borderBottomColor:ColorConstants.title_blue()},
								{borderLeftColor:ColorConstants.title_blue()},
								{borderRightColor:ColorConstants.title_blue()},
							]}>
						<Text style={styles.extendTextTop}>{LS.str('ZYZS')}</Text>
						<Image style={styles.extendImageBottom} source={stopLossImage}/>
					</TouchableOpacity>

					<View style={[styles.extendRight, this.state.selectedSubItem==2 && styles.bottomBorder, ]}/>
				</View>


				{this.state.selectedSubItem !== 0 ? this.renderSubDetail(rowData): null}

				{this.renderOKView(rowData)}
			</View>
		);
	},

    renderRow: function(rowData, sectionID, rowID, highlightRow) {
		var profitPercentage = 0
		var profitAmount = rowData.upl
		if (rowData.settlePrice !== 0) {
			profitPercentage = (this.getLastPrice(rowData) - rowData.settlePrice) / rowData.settlePrice * rowData.leverage
			profitPercentage *= (rowData.isLong ? 1 : -1)
			profitAmount = profitPercentage * rowData.invest

			//Only use the fxdata for non-usd
			if (rowData.security.ccy != UIConstants.USD_CURRENCY) {
				if (rowData.fxData && rowData.fxData.ask) {
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxData)
				}	else if(rowData.fxOutright && rowData.fxOutright.ask){
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxOutright)
				} else {
					profitAmount = rowData.upl
				}
			}
		}
		var bgcolor = this.state.selectedRow == rowID ? '#e6e5eb' : 'white'
		var topLine = rowData.security.name
		var bottomLine = rowData.security.symbol
		// if(LogicData.getLanguageEn() == '1'){
		// 	 topLine = rowData.security.symbol
		// 	 bottomLine = rowData.security.name
		// }
		return (
			<View>
				<TouchableHighlight activeOpacity={1} onPress={() => this.stockPressed(rowData, sectionID, rowID, highlightRow)}>
					<View style={[styles.rowWrapper, {backgroundColor: bgcolor}]} key={rowData.key}>
						<View style={styles.rowLeftPart}>
							<Text style={styles.stockNameText} allowFontScaling={false} numberOfLines={1}>
								{topLine}
							</Text>

							<View style={{flexDirection: 'row', alignItems: 'center'}}>
								{/* {this.renderCountyFlag(rowData)} */}
								{this.renderStockStatus(rowData)}
								<Text style={styles.stockSymbolText}>
									{bottomLine}
								</Text>
							</View>
						</View>

						<View style={styles.rowCenterPart}>
							{this.renderProfit(profitAmount, null)}
						</View>

						<View style={styles.rowRightPart}>
							{this.renderProfit(profitPercentage * 100, "%")}
						</View>
						{/* {rowData.security.isOpen ? null :
							<Image style={styles.notOpenImage} source={require('../../images/not_open.png')}/>
						} */}
					</View>
				</TouchableHighlight>

				{this.state.selectedRow == rowID ? this.renderDetailInfo(rowData): null}
			</View>
		);
	},

    renderLoadingText: function() {
		var strZWCCJL = LS.str('ZWCCJL')
		if(this.state.stockInfoRowData.length === 0) {
			return (
				<View style={styles.loadingTextView}>
					<Text style={styles.loadingText}>{strZWCCJL}</Text>
				</View>
				)
		}
	},

    renderOrClear:function(){
		if(this.state.isClear){
			return(<View style={{height:10000}}></View>)
		}
	},

    renderContent: function(){
		if(!this.state.contentLoaded){
			return (
				<NetworkErrorIndicator onRefresh={()=>this.loadOpenPositionInfo()} refreshing={this.state.isRefreshing}/>
			)
		}else{
			return(
				<View style={{flex:1}}>
					{this.renderOrClear()}
					{this.renderHeaderBar()}
					{this.renderLoadingText()}
					<ListView
						style={styles.list}
						ref="listview"
						initialListSize={11}
						dataSource={this.state.stockInfo}
						enableEmptySections={true}
						renderFooter={this.renderFooter}
						renderRow={this.renderRow}
						renderSeparator={this.renderSeparator}
						onEndReached={this.onEndReached}/>
				  {this.renderFootBar()}
					<StockTransactionInfoModal ref='confirmPage'/>
				</View>
			)
		}
	},

    render: function() {
		
		return (
			<View style={viewStyle}>
				{this.renderContent()}
			</View>
		)
	},
});

var styles = StyleSheet.create({
	list: {
		alignSelf: 'stretch',
	},

	line: {
		height: 0.5,
		backgroundColor: 'white',
	},

	separator: {
		marginLeft: 15,
		height: 0.5,
		backgroundColor: ColorConstants.SEPARATOR_GRAY,
	},

	rowWrapper: {
		flexDirection: 'row',
		alignSelf: 'stretch',
		alignItems: 'center',
		paddingLeft: 15,
		paddingRight: 15,
		paddingBottom: 10,
		paddingTop: 10,
		backgroundColor: '#ffffff',
	},

	stockCountryFlagContainer: {
		backgroundColor: '#00b2fe',
		borderRadius: 2,
		paddingLeft: 3,
		paddingRight: 3,
		marginRight: 6,
	},

	stockCountryFlagText: {
		fontSize: 10,
		textAlign: 'center',
		color: '#ffffff',
	},

	rowLeftPart: {
		flex: 3,
		alignItems: 'flex-start',
		paddingLeft: 0,
	},

	rowCenterPart: {
		flex: 2.5,
		paddingTop: 5,
		paddingBottom: 5,
		paddingRight: 5,
		alignItems: 'flex-end',
	},

	rowRightPart: {
		flex: 2.5,
		paddingTop: 5,
		paddingBottom: 5,
		paddingRight: 0,
		alignItems: 'flex-end',
	},

	notOpenImage: {
		width: 23,
		height: 23,
		position: 'absolute',
		top: 0,
		right: 0,
	},

	stockNameText: {
		fontSize: stockNameFontSize,
		textAlign: 'center',
		fontWeight: 'bold',
		lineHeight: 22,
	},

	stockSymbolText: {
		fontSize: 12,
		textAlign: 'center',
		color: '#5f5f5f',
		lineHeight: 14,
	},

	stockPercentText: {
		fontSize: 18,
		color: '#ffffff',
		fontWeight: 'normal',
	},

	darkSeparator: {
		marginLeft: 15,
		height: 0.5,
		backgroundColor: '#dfdfdf',
	},

	extendWrapper: {
		alignItems: 'stretch',
		justifyContent: 'space-around',
		backgroundColor: ColorConstants.LIST_BACKGROUND_GREY,
	},

	extendRowWrapper: {
		flexDirection: 'row',
		alignItems: 'stretch',
		justifyContent: 'space-around',
		height: 51,
	},

	extendLeft: {
		flex: 1,
		alignItems: 'flex-start',
		marginLeft: 15,
		paddingTop: 8,
		paddingBottom: 8,
	},
	extendMiddle: {
		flex: 1,
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 8,
	},
	extendRight: {
		flex: 1,
		alignItems: 'flex-end',
		marginRight: 15,
		paddingTop: 8,
		paddingBottom: 8,
	},

	extendTextTop: {
		fontSize:14,
		color: '#7d7d7d',
	},
	extendTextBottom: {
		fontSize:13,
		color: 'black',
		marginTop: 5,
	},
	extendImageBottom: {
		width: 24,
		height: 24,
	},
	lineChart: {
		flex: 1,
		backgroundColor:'transparent',
		justifyContent:'space-between',
		paddingTop: 1,
		paddingBottom: 11,
	},

	okView: {
		width: 312,
		height: 39,
		backgroundColor: ColorConstants.TITLE_BLUE,
		paddingVertical: 10,
    borderRadius:5,
		marginTop: 15,
		marginBottom: 15,
		justifyContent: 'space-around',
		alignSelf: 'center',
	},
	okViewDoubleConfirm: {
		backgroundColor: 'transparent',
    	borderWidth:1,
    	borderColor: ColorConstants.TITLE_BLUE,
	},
	okViewDoubleConfirmLive: {
		backgroundColor: 'transparent',
    	borderWidth:1,
    	borderColor: 'white',
	},
	okViewDisabled: {
		backgroundColor: '#dfdee4',
	},
	okButton: {
		color: 'white',
		textAlign: 'center',
		fontSize: 17,
	},

	okButtonDoubleConfirm: {
		color: ColorConstants.TITLE_BLUE,
	},
	okButtonDoubleConfirmLive: {
		color: '#e60b11',
	},

	feeText: {
		color: 'grey',
		marginBottom: 10,
		alignSelf: 'center',
		fontSize: 15,
	},
	netIncomeText: {
		fontSize: 14,
		color: '#e60b11',
		alignSelf: 'center',
		marginTop: 10,
	},

	rightTopBorder: {
		borderRightWidth: 1,
		borderRightColor: ColorConstants.TITLE_BLUE,
		borderTopWidth: 1,
		borderTopColor: ColorConstants.TITLE_BLUE,
	},
	bottomBorder: {
		borderBottomWidth: 1,
		borderBottomColor: ColorConstants.TITLE_BLUE,
	},
	leftTopRightBorder: {
		borderLeftWidth: 1,
		borderLeftColor: ColorConstants.TITLE_BLUE,
		borderRightWidth: 1,
		borderRightColor: ColorConstants.TITLE_BLUE,
		borderTopWidth: 1,
		borderTopColor: ColorConstants.TITLE_BLUE,
	},
	leftTopBorder: {
		borderLeftWidth: 1,
		borderLeftColor: ColorConstants.TITLE_BLUE,
		borderTopWidth: 1,
		borderTopColor: ColorConstants.TITLE_BLUE,
	},

	priceText: {
		marginTop: 5,
		marginBottom: 5,
		fontSize: 8,
		textAlign: 'center',
		color: '#ffffff',
		backgroundColor: 'transparent',
	},

	chartTitleTextHighlighted: {
		fontSize: 15,
		textAlign: 'center',
		color: '#70a5ff',
	},
	chartTitleText: {
		fontSize: 15,
		textAlign: 'center',
		color: '#7d7d7d'
	},

	subDetailRowWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
	},

	sliderView: {
		paddingLeft: 15,
		paddingRight: 15,
	},
	slider: {
		marginLeft: Platform.OS === 'ios' ? 15 : 0,
		marginRight: Platform.OS === 'ios' ? 15 : 0,
		height: 40,
		//flex: 1,
	},
	sliderLeftText: {
		fontSize: 12,
		color: '#909090',
		textAlign: 'left',
		flex: 1,
		marginTop: -4,
		marginBottom: 6,
	},
	sliderRightText: {
		fontSize: 12,
		color: '#909090',
		textAlign: 'right',
		flex: 1,
		marginTop: -4,
		marginBottom: 6,
	},

	loadingTextView: {
		alignItems: 'center',
		paddingTop: 180,
		backgroundColor: 'transparent'
	},
	loadingText: {
		fontSize: 13,
		color: '#9f9f9f'
	},

	headerBar: {
		flexDirection: 'row',
		backgroundColor: '#d9e6f3',
		height: UIConstants.LIST_HEADER_BAR_HEIGHT,
		paddingLeft: 15,
		paddingRight: 15,
		paddingTop:2,
	},
	headerCell: {
		flexDirection: 'row',
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		// borderWidth: 1,
	},
	headerText: {
		fontSize: 14,
		textAlign: 'center',
		color:'#576b95',
	},

	headerTextLeft: {
		fontSize: 14,
		textAlign: 'left',
		color:'#576b95',
	},

	dataStatus:{
		position:'absolute',
		top:0,
		left:0,
		right:0,
		bottom:0,
		width:width,
		alignItems:'center',
		justifyContent:'center',
		backgroundColor:'transparent',

	},
	dataStatus2:{
		alignItems:'center',
		justifyContent:'center',
		width:width - 48,
		height:120,
	},
	textDataStatus:{
		color:'black',
		marginTop:5,
	},
	textDataStatusRefresh:{
		color:'black',
		paddingLeft:15,
		paddingRight:15,
		marginTop:10,
		paddingTop:5,
		paddingBottom:5,
		borderColor:'black',
		borderRadius:4,
		borderWidth:1,
	},
	tipsLine:{
		fontSize:9,
		color:'#5b7eb9',
		marginRight:10,
		alignSelf:'flex-end',
	},
	statusLableContainer: {
		backgroundColor: '#999999',
		borderRadius: 2,
		paddingLeft: 1,
		paddingRight: 1,
		marginRight: 2,
	},
	statusLable:{
		fontSize: 10,
		textAlign: 'center',
		color: '#ffffff',
	},
	stopProfitLossInputBox:	{
		flexDirection:'row',
		alignSelf: "stretch",
		alignItems: 'center',
		justifyContent:'center',
		height: 31,
		borderWidth:1,
		borderRadius:3,
		backgroundColor:'white',
		marginLeft: 15,
	},
	stopProfitLossInputBoxText: {
		flex: 1,
		color: "#000000",
		textAlign:'center',
		padding: 0,
	},
});


module.exports = StockOpenPositionPage;
