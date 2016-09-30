'use strict';

var LineChart = require('./component/lineChart/LineChart');
import React from 'react';
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
} from 'react-native';
var LayoutAnimation = require('LayoutAnimation')

var LogicData = require('../LogicData')
var NetConstants = require('../NetConstants')
var NetworkModule = require('../module/NetworkModule')
var WebSocketModule = require('../module/WebSocketModule')
var TalkingdataModule = require('../module/TalkingdataModule')
var TongDaoModule = require('../module/TongDaoModule')
var ColorConstants = require('../ColorConstants')
var UIConstants = require('../UIConstants');
var StockTransactionConfirmPage = require('./StockTransactionConfirmPage')
var TimerMixin = require('react-timer-mixin');
var StorageModule = require('../module/StorageModule')

var {height, width} = Dimensions.get('window');
var tabData = [
			{"type":NetConstants.PARAMETER_CHARTTYPE_TODAY, "name":'分时'},
			// {"type":NetConstants.PARAMETER_CHARTTYPE_TEN_MINUTE, "name":'10分钟'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_TWO_HOUR, "name":'2小时'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_WEEK, "name":'5日'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_DAY, "name":'日K'},
			{"type":NetConstants.PARAMETER_CHARTTYPE_5_MINUTE, "name":'5分钟'},]
var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => {
		return r1.id !== r2.id || r1.profitPercentage!==r2.profitPercentage || r1.hasSelected!==r2.hasSelected
	}});

var extendHeight = 222
var rowHeight = 0
var stockNameFontSize = Math.round(17*width/375.0)

var stopProfitPercent = 0
var stopLossPercent = 0
var stopProfitUpdated = false
var stopLossUpdated = false
var MAX_PERCENT = 90
var isWaiting = false

var StockOpenPositionPage = React.createClass({

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
		};
	},

	componentDidMount: function() {
		this.loadOpenPositionInfo()
	},

	onEndReached: function() {

	},

	tabPressed: function() {
		this.loadOpenPositionInfo()
	},

	loadOpenPositionInfo: function() {
		var userData = LogicData.getUserData()
		var url = NetConstants.GET_OPEN_POSITION_API
		NetworkModule.fetchTHUrl(
			url,
			{
				method: 'GET',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
				},
			},
			(responseJson) => {
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

				if (this.state.selectedRow >= responseJson.length) {
					this.setState ({
						stockInfoRowData: responseJson,
						stockInfo: this.state.stockInfo.cloneWithRows(responseJson),
						selectedRow: -1,
						selectedSubItem: 0,
					})
				}
				else {
					this.setState({
						stockInfoRowData: responseJson,
						stockInfo: this.state.stockInfo.cloneWithRows(responseJson),
					})
				}

				for (var i = 0; i < responseJson.length; i++) {
					var stockId = responseJson[i].security.id
					if (interestedStockIds.indexOf(stockId) < 0) {
						interestedStockIds.push(stockId)
					}
				};

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
			(errorMessage) => {
				Alert.alert('', errorMessage);
			}
		)
	},

	loadStockDetailInfo: function(chartType,stockCode) {
		var url = NetConstants.GET_STOCK_PRICE_TODAY_API
		// url = url.replace(/<stockCode>/, stockCode)
		// url = url.replace(/<chartType>/, this.state.chartType)

		if(chartType == NetConstants.PARAMETER_CHARTTYPE_5_MINUTE){
			url = NetConstants.GET_STOCK_KLINE_FIVE_M;
			url = url.replace(/<securityId>/, stockCode);
		}else if(chartType == NetConstants.PARAMETER_CHARTTYPE_DAY){
			url = NetConstants.GET_STOCK_KLINE_DAY;
			url = url.replace(/<securityId>/, stockCode);
		}else {
			 url = url.replace(/<stockCode>/, stockCode)
			 url = url.replace(/<chartType>/, chartType)
		}

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
				})
			},
			(errorMessage) => {
				Alert.alert('', errorMessage);
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
				}
				if (this.state.stockInfoRowData[i].fxData) {
					var fxData = this.state.stockInfoRowData[i].fxData
					if (fxData.id == realtimeStockInfo[j].id &&
								fxData.last !== realtimeStockInfo[j].last) {
						fxData.last = realtimeStockInfo[j].last
						fxData.ask = realtimeStockInfo[j].ask * 1.005
						fxData.bid = realtimeStockInfo[j].bid * 0.995
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

		if (hasUpdate) {
			this.setState({
				stockInfo: ds.cloneWithRows(this.state.stockInfoRowData)
			})
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
				LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
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

		extendHeight = 222
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

			var stopLoss = this.priceToPercentWithRow(rowData.stopPx, rowData, 2) <= MAX_PERCENT
			var stopProfit = rowData.takePx !== undefined

			stopProfitPercent = 0
			stopLossPercent = 0
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
			})

			this.doScrollAnimation()
		}
	},

	subItemPress: function(item, rowData) {
		var detalY = 0

		this.setState({
			selectedSubItem: this.state.selectedSubItem === item ? 0 : item,
		})

		if (item === 1) {
			var stockid = rowData.security.id
			this.setState({
				stockDetailInfo: rowData.security
			})
			this.loadStockDetailInfo(this.state.chartType,stockid)
		}
		this.doScrollAnimation()
	},

	okPress: function(rowData) {
		if (!rowData.security.isOpen)
			return

		if (this.state.showExchangeDoubleCheck === false) {
			this.setState({
				showExchangeDoubleCheck: true,
			})
			this.doScrollAnimation()
			return
		}

		if (isWaiting) {
			return
		}
		isWaiting = true

		var userData = LogicData.getUserData()
		var url = NetConstants.POST_DELETE_POSITION_API
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
				TongDaoModule.trackClosePositionEvent(responseJson)
			},
			(errorMessage) => {
				Alert.alert('', errorMessage);
				isWaiting = false
			}
		)
	},

	pressChartHeaderTab: function(type, rowData) {
		this.setState({
			chartType: type
		})
		this.loadStockDetailInfo(type,rowData.security.id)
	},

	currentExtendHeight: function(subItem) {
		var showNetIncome = false
		var newHeight = 222
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
		if (type===1) {
			this.setState({stopProfitSwitchIsOn: value})
			stopProfitUpdated = true
		} else{
			this.setState({stopLossSwitchIsOn: value})
			stopLossUpdated = true
		};

		this.setState({profitLossUpdated: true})
		this.doScrollAnimation()
	},

	switchConfrim: function(rowData) {
		var userData = LogicData.getUserData()
		var url = NetConstants.STOP_PROFIT_LOSS_API

		var eventParam = {};
		eventParam[TalkingdataModule.KEY_STOP_PROFIT_SWITCH_ON] = this.state.stopProfitSwitchIsOn;
		eventParam[TalkingdataModule.KEY_STOP_LOSS_SWITCH_OFF] = this.state.stopLossSwitchIsOn;
		eventParam[TalkingdataModule.KEY_STOP_PROFIT] = stopProfitUpdated && this.state.stopProfitSwitchIsOn ? stopProfitPercent : '-';
		eventParam[TalkingdataModule.KEY_STOP_LOSS] = stopLossUpdated && this.state.stopLossSwitchIsOn ? stopLossPercent : '-';

		TalkingdataModule.trackEvent(TalkingdataModule.SET_STOP_PROFIT_LOSS_EVENT, '', eventParam)

		// STOP LOSS
		if (stopLossUpdated) {
			if (this.state.stopLossSwitchIsOn && stopLossPercent > MAX_PERCENT) {
				Alert.alert('', '止损超过'+MAX_PERCENT+'%，无法设置');
				return
			}
			url = NetConstants.STOP_PROFIT_LOSS_API
			var price = this.percentToPriceWithRow(stopLossPercent, rowData, 2)
			if(!this.state.stopLossSwitchIsOn){
				stopLossPercent=0
				price = this.percentToPriceWithRow(100, rowData, 2)
				var dcm = Math.pow(10, rowData.security.dcmCount)
				if (rowData.isLong){
					price = Math.ceil(price * dcm)/dcm
				}
				else {
					price = Math.floor(price * dcm)/dcm
				}
			}
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
					stopLossUpdated = false
					this.setState({
						profitLossUpdated: false,
						profitLossConfirmed: true})

					var tempStockInfo = this.state.stockInfoRowData
					tempStockInfo[this.state.selectedRow].stopPx = responseJson.stopPx
					this.setState({
						stockInfoRowData: tempStockInfo,
						stockInfo: ds.cloneWithRows(tempStockInfo),
					})
				},
				(errorMessage) => {
					Alert.alert('', errorMessage);
				}
			)
		}
		// STOP PROFIT
		var type = 'PUT'
		var body = JSON.stringify({})
		if (stopProfitUpdated) {
			if (rowData.takeOID === undefined) {
				if (this.state.stopProfitSwitchIsOn) {
					url = NetConstants.ADD_REMOVE_STOP_PROFIT_API
					type = 'POST'
					body = JSON.stringify({
							posId: rowData.id,
							securityId: rowData.security.id,
							price: this.percentToPriceWithRow(stopProfitPercent, rowData, 1),
						})
				}
				else {
					stopProfitUpdated = false
					this.setState({profitLossUpdated: false})
					return
				}
			}
			else {
				if(this.state.stopProfitSwitchIsOn) {
					body = JSON.stringify({
						posId: rowData.id,
						securityId: rowData.security.id,
						orderId: rowData.takeOID,
						price: this.percentToPriceWithRow(stopProfitPercent, rowData, 1),
					})
				}
				else {
					url = NetConstants.ADD_REMOVE_STOP_PROFIT_API
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
					this.setState({
						profitLossUpdated: false,
						profitLossConfirmed: true})

					var tempStockInfo = this.state.stockInfoRowData
					if (responseJson.takePx === undefined) {
						tempStockInfo[this.state.selectedRow].takeOID = undefined
						tempStockInfo[this.state.selectedRow].takePx = undefined
					}
					else {
						tempStockInfo[this.state.selectedRow].takeOID = responseJson.takeOID
						tempStockInfo[this.state.selectedRow].takePx = responseJson.takePx
					}
					this.setState({
						stockInfoRowData: tempStockInfo,
						stockInfo: ds.cloneWithRows(tempStockInfo),
					})
				},
				(errorMessage) => {
					Alert.alert('', errorMessage);
				}
			)
		}
	},

	getLastPrice: function(rowData) {
		var lastPrice = rowData.isLong ? rowData.security.bid : rowData.security.ask
		// console.log(rowData.security.bid, rowData.security.ask)
		return lastPrice === undefined ? rowData.security.last : lastPrice
	},

	renderHeaderBar: function() {
			return (
				<View style={styles.headerBar}>
					<View style={[styles.rowLeftPart, {	paddingTop: 5,}]}>
						<Text style={styles.headerTextLeft}>产品</Text>
					</View>
					<View style={[styles.rowCenterPart, {	paddingRight: 10,}]}>
						<Text style={[styles.headerTextLeft, {paddingRight: 0,}]}>亏盈</Text>
					</View>
					<View style={styles.rowRightPart}>
						<Text style={styles.headerTextLeft}>收益率</Text>
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
			<ScrollView horizontal={true} style={{flex: 0, paddingBottom: 5, marginTop: 6}}>
				{tabs}
			</ScrollView>
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
		if (type === 1) {
			// 止盈
			return isLong ? basePrice * (1+percent/100/leverage) : basePrice * (1-percent/100/leverage)
		}
		else {
			// 止损
			return isLong ? basePrice * (1-percent/100/leverage) : basePrice * (1+percent/100/leverage)
		}
	},

	percentToPriceWithRow: function(percent, rowData, type) {
		var leverage = rowData.leverage === 0 ? 1 : rowData.leverage
		return this.percentToPrice(percent, rowData.settlePrice, leverage, type, rowData.isLong)
	},

	priceToPercent: function(price, basePrice, leverage, type, isLong) {
		if (type === 1) {
			return (price-basePrice)/basePrice*100*leverage * (isLong?1:-1)
		}
		else {
			return (basePrice-price)/basePrice*100*leverage * (isLong?1:-1)
		}
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
			profitAmount *= fxPrice
		}
		return profitAmount
	},

	renderSlider: function(rowData, type, startPercent, endPercent, percent) {
		//1, stop profit
		//2, stop loss
		var disabled = false
		if (type === 2) {
			if (startPercent > MAX_PERCENT) {
				endPercent = startPercent
				disabled = true
			}
		}
		return (
			<View style={styles.sliderView}>
				<Slider
					minimumTrackTintColor={ColorConstants.TITLE_BLUE}
					minimumValue={startPercent}
					value={percent}
					maximumValue={endPercent}
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
			this._text1.setNativeProps({text: value.toFixed(1)+'%'});
			this._text3.setNativeProps({text: price.toFixed(rowData.security.dcmCount)})
		}
		else if (type === 2) {
			this._text2.setNativeProps({text: value.toFixed(1)+'%'});
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

	renderStopProfitLoss: function(rowData, type) {
		var titleText = type===1 ? "止盈" : "止损"
		var switchIsOn = type===1 ? this.state.stopProfitSwitchIsOn : this.state.stopLossSwitchIsOn
		var color = type===1 ? ColorConstants.STOCK_RISE_RED : ColorConstants.STOCK_DOWN_GREEN
		var price = rowData.settlePrice
		var percent = type===1 ? stopProfitPercent : stopLossPercent
		var startPercent = 0
		var endPercent = MAX_PERCENT

		startPercent = this.priceToPercentWithRow(rowData.security.last, rowData, type)
		// use gsmd to make sure this order is guaranteed.
		startPercent += rowData.security.gsmd*100*rowData.leverage
		if (startPercent < 0)
			startPercent = 0

		if (type === 1) {
			endPercent = startPercent + 100
			if (percent === 0) {
				percent = rowData.takePx === undefined ? startPercent
					: this.priceToPercentWithRow(rowData.takePx, rowData, type)
				stopProfitPercent = percent
			}
		} else{
			if (percent=== 0) {
				percent = this.priceToPercentWithRow(rowData.stopPx, rowData, type)
				if (percent > endPercent) {
					percent = startPercent
				}
				stopLossPercent = percent
			}
		};
		price = this.percentToPriceWithRow(percent, rowData, type)

		return (
			<View>
				<View style={[styles.subDetailRowWrapper, {height:50}]}>
					<Text style={styles.extendLeft}>{titleText}</Text>
					{
						switchIsOn ?
						<View style={[styles.extendMiddle, {flexDirection: 'row', flex:3,paddingTop:0}]}>
							<TextInput editable={false} ref={component => this.bindRef(type, component, 1)} defaultValue={percent.toFixed(1)+'%'}
								style={{flex:3, textAlign:'right', fontSize:17, color: color}}
								underlineColorAndroid='transparent'/>
							<Text style={{flex:1, textAlign:'center', color: '#dfdfdf'}}>|</Text>
							<TextInput editable={false} ref={component => this.bindRef(type, component, 2)} defaultValue={price.toFixed(rowData.security.dcmCount)}
								style={{flex:3, textAlign:'left', fontSize:17}}
								underlineColorAndroid='transparent'/>
						</View>
						: null
					}
					<View style={styles.extendRight}>
				        <Switch
				          onValueChange={(value) => this.onSwitchPressed(type, value)}
				          value={switchIsOn}
						  onTintColor={ColorConstants.TITLE_BLUE} />
			        </View>
				</View>
				{ switchIsOn ? this.renderSlider(rowData, type, startPercent, endPercent, percent) : null}
				<View style={styles.darkSeparator} />
			</View>)
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
					<LineChart style={styles.lineChart}
						data={JSON.stringify(this.state.stockDetailInfo)}
						chartType={this.state.chartType}
						colorType={1}
						descriptionColor={1}>
						{/* {this.renderStockMaxPriceInfo(maxPrice, maxPercentage, true)}
						{this.renderStockMaxPriceInfo(minPrice, minPercentage, false)} */}
					</LineChart>
				</View>
			);
		}
		else {
			var thisPartHeight = 170
			thisPartHeight += this.state.stopLossSwitchIsOn ? 55 : 0
			thisPartHeight += this.state.stopProfitSwitchIsOn ? 55 : 0
			var confirmText = '确认'
			if (!this.state.profitLossUpdated && this.state.profitLossConfirmed) {
				confirmText = '已设置'
			}

			return (
				<View style={{height:thisPartHeight}}>
					{this.renderStopProfitLoss(rowData, 1)}

					{this.renderStopProfitLoss(rowData, 2)}

					<TouchableHighlight
						underlayColor={this.state.profitLossUpdated ? '#164593':'#dfdee4'}
						onPress={() => this.switchConfrim(rowData)} style={[styles.okView, !this.state.profitLossUpdated && styles.okViewDisabled]}>
						<Text style={[styles.okButton, !this.state.profitLossUpdated && styles.okViewDisabled]}>
							{confirmText}
						</Text>
					</TouchableHighlight>
				</View>
				);
		}
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
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxData)
				}
				else if(rowData.fxoutright && rowData.fxoutright.ask){
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxoutright)
				} else {
					//Error below! Use the upl will make the percentage and price not synchronized...
					profitAmount = rowData.upl
				}
			}
		}

		var buttonText = (profitAmount < 0 ? '亏损':'获利') + ': $' + profitAmount.toFixed(2)
		if (this.state.showExchangeDoubleCheck) {
			buttonText = '确认:$' + profitAmount.toFixed(2)
		}
		return(
			<View>
				<View style={styles.darkSeparator} />
				{showNetIncome ?
				<Text style={styles.netIncomeText}>净收益:9.26</Text>
				: null}

				<TouchableHighlight
					underlayColor={rowData.security.isOpen ? '#164593' : '#dfdee4'}
					onPress={() => this.okPress(rowData)} style={[styles.okView, this.state.showExchangeDoubleCheck && styles.okViewDoubleConfirm, !rowData.security.isOpen && styles.okViewDisabled]}>
					<Text style={[styles.okButton, this.state.showExchangeDoubleCheck && styles.okButtonDoubleConfirm]}>
						{buttonText}
					</Text>
				</TouchableHighlight>

				{this.state.showExchangeDoubleCheck ?
					<Text style={styles.feeText}>平仓费：0</Text> :
					null}
			</View>)
	},

	renderDetailInfo: function(rowData) {
		var tradeImage = rowData.isLong ? require('../../images/dark_up.png') : require('../../images/dark_down.png')
		var lastPrice = this.getLastPrice(rowData)

		var newExtendHeight = this.currentExtendHeight(this.state.selectedSubItem)
		var stopLossImage = require('../../images/check.png')
		var stopLoss = this.priceToPercentWithRow(rowData.stopPx, rowData, 2) <= MAX_PERCENT
		var stopProfit = rowData.takePx !== undefined
		if (stopLoss || stopProfit) {
			stopLossImage = require('../../images/check2.png')
		}
		var currentPriceLabel = rowData.isLong ? '当前买价' : '当前卖价'
		var openDate = new Date(rowData.createAt)
		var currency = UIConstants.CURRENCY_CODE_LIST[rowData.security.ccy]

		return (
			<View style={[{height: newExtendHeight}, styles.extendWrapper]} >
				<View style={[styles.darkSeparator, {marginLeft: 0}]} />
				<View style={styles.extendRowWrapper}>
					<View style={styles.extendLeft}>
						<Text style={styles.extendTextTop}>类型</Text>
						<Image style={styles.extendImageBottom} source={tradeImage}/>
					</View>
					<View style={styles.extendMiddle}>
						<Text style={styles.extendTextTop}>本金({currency})</Text>
						<Text style={styles.extendTextBottom}>{rowData.invest.toFixed(2)}</Text>
					</View>
					<View style={styles.extendRight}>
						<Text style={styles.extendTextTop}>杠杆</Text>
						<Text style={styles.extendTextBottom}>{rowData.leverage}</Text>
					</View>
				</View>
				<View style={styles.darkSeparator} />
				<View style={styles.extendRowWrapper}>
					<View style={styles.extendLeft}>
						<Text style={styles.extendTextTop}>开仓价格</Text>
						<Text style={styles.extendTextBottom}>{rowData.settlePrice}</Text>
					</View>
					<View style={styles.extendMiddle}>
						<Text style={styles.extendTextTop}>{currentPriceLabel}</Text>
						<Text style={styles.extendTextBottom}>{lastPrice}</Text>
					</View>
					<View style={styles.extendRight}>
						<Text style={styles.extendTextTop}>开仓时间</Text>
						<Text style={styles.extendTextBottom}>{openDate.Format('yy/MM/dd')}</Text>
					</View>
				</View>
				<View style={styles.darkSeparator} />

				<View style={styles.extendRowWrapper}>
					<TouchableOpacity onPress={()=>this.subItemPress(1, rowData)}
						style={[styles.extendLeft, (this.state.selectedSubItem===1)&&styles.rightTopBorder,
								(this.state.selectedSubItem===2)&&styles.bottomBorder]}>
						<Text style={styles.extendTextTop}>行情</Text>
						<Image style={styles.extendImageBottom} source={require('../../images/market.png')}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={()=>this.subItemPress(2, rowData)}
						style={[styles.extendMiddle, (this.state.selectedSubItem===1)&&styles.bottomBorder,
								(this.state.selectedSubItem===2)&&styles.leftTopRightBorder]}>
						<Text style={styles.extendTextTop}>止盈/止损</Text>
						<Image style={styles.extendImageBottom} source={stopLossImage}/>
					</TouchableOpacity>
					<View style={[styles.extendRight, this.state.selectedSubItem!==0 && styles.bottomBorder]}>
					</View>
				</View>

				{this.state.selectedSubItem !== 0 ? this.renderSubDetail(rowData): null}

				{this.state.selectedSubItem !== 2 ? this.renderOKView(rowData) : null}
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
				}	else if(rowData.fxoutright && rowData.fxoutright.ask){
					profitAmount = this.calculateProfitWithOutright(profitAmount, rowData.fxoutright)
				} else {
					profitAmount = rowData.upl
				}
			}
		}
		var bgcolor = this.state.selectedRow == rowID ? '#e6e5eb' : 'white'
		return (
			<View>
				<TouchableHighlight activeOpacity={1} onPress={() => this.stockPressed(rowData, sectionID, rowID, highlightRow)}>
					<View style={[styles.rowWrapper, {backgroundColor: bgcolor}]} key={rowData.key}>
						<View style={styles.rowLeftPart}>
							<Text style={styles.stockNameText} allowFontScaling={false} numberOfLines={1}>
								{rowData.security.name}
							</Text>

							<View style={{flexDirection: 'row', alignItems: 'center'}}>
								{this.renderCountyFlag(rowData)}
								<Text style={styles.stockSymbolText}>
									{rowData.security.symbol}
								</Text>
							</View>
						</View>

						<View style={styles.rowCenterPart}>
							{this.renderProfit(profitAmount, null)}
						</View>

						<View style={styles.rowRightPart}>
							{this.renderProfit(profitPercentage * 100, "%")}
						</View>
						{rowData.security.isOpen ? null :
							<Image style={styles.notOpenImage} source={require('../../images/not_open.png')}/>
						}
					</View>
				</TouchableHighlight>

				{this.state.selectedRow == rowID ? this.renderDetailInfo(rowData): null}
			</View>
		);
	},

	renderLoadingText: function() {
		if(this.state.stockInfoRowData.length === 0) {
			return (
				<View style={styles.loadingTextView}>
					<Text style={styles.loadingText}>暂无持仓记录</Text>
				</View>
				)
		}
	},

	render: function() {
		var viewStyle = Platform.OS === 'android' ?
			{width: width, height: height
				- UIConstants.ANDROID_LIST_VIEW_HEIGHT_MAGIC_NUMBER
				- UIConstants.HEADER_HEIGHT
				- UIConstants.SCROLL_TAB_HEIGHT
				- UIConstants.TAB_BAR_HEIGHT} :
			{width: width, flex: 1}
		return (
			<View style={viewStyle}>
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

					<StockTransactionConfirmPage ref='confirmPage'/>
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
		flex: 1,
		fontSize: 15,
		textAlign: 'center',
		color: '#70a5ff',
	},
	chartTitleText: {
		flex: 1,
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
});


module.exports = StockOpenPositionPage;
