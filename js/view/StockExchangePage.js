'use strict';

import React from 'react';
import {
	StyleSheet,
	View,
	Text,
	Image,
	Dimensions,
	TouchableHighlight,
	TouchableOpacity,
	WebView,
} from 'react-native';

var {EventCenter, EventConst} = require('../EventCenter')

var CookieManager = require('react-native-cookies')
var LoginPage = require('./LoginPage')
var WebViewPage = require('./WebViewPage')
var ScrollTabView = require('./component/ScrollTabView')
var StockOpenPositionPage = require('./StockOpenPositionPage')
var StockClosedPositionPage = require('./StockClosedPositionPage')
var StockStatisticsPage = require('./StockStatisticsPage')
var ColorConstants = require('../ColorConstants')
var NavBar = require('../view/NavBar')
var LogicData = require('../LogicData')
var MainPage = require('./MainPage')
var OAStatusPage= require('./openAccount/OAStatusPage')
var LS = require('../LS')
var tabNames = ['CC', 'PC', 'TJ']
var didTabSelectSubscription = null
var didAccountChangeSubscription = null
//var didAccountLoginOutSideSubscription = null
var didLoginSubscription = null;
var didLogoutSubscription = null;

class StockExchangePage extends React.Component {
    state = {
        currentSelectedTab : 0,
        loggined: false,
    };

    componentDidMount() {
		didTabSelectSubscription = EventCenter.getEventEmitter().addListener(EventConst.EXCHANGE_TAB_PRESS_EVENT, this.onTabChanged);
		didAccountChangeSubscription = EventCenter.getEventEmitter().addListener(EventConst.ACCOUNT_STATE_CHANGE, ()=>this.clearViews());
		//didAccountLoginOutSideSubscription = EventCenter.getEventEmitter().addListener(EventConst.ACCOUNT_LOGIN_OUT_SIDE, ()=>this.clearViews());
		didLoginSubscription = EventCenter.getEventEmitter().addListener(EventConst.ACCOUNT_LOGIN, ()=>this.clearViews());
		didLogoutSubscription = EventCenter.getEventEmitter().addListener(EventConst.ACCOUNT_LOGOUT, ()=>this.clearViews());
	}

    componentWillUnmount() {
		didTabSelectSubscription && didTabSelectSubscription.remove();
		didAccountChangeSubscription && didAccountChangeSubscription.remove();
		//didAccountLoginOutSideSubscription && didAccountLoginOutSideSubscription.remove();
		didLoginSubscription && didLoginSubscription.remove();
		didLogoutSubscription && didLogoutSubscription.remove();
	}

    clearViews = () => {
		if(LogicData.getTabIndex() == MainPage.STOCK_EXCHANGE_TAB_INDEX){
			var routes = this.props.navigator.getCurrentRoutes();
			if(routes && routes[routes.length-1] &&
				(routes[routes.length-1].name == MainPage.STOCK_EXCHANGE_ROUTE
			|| routes[routes.length-1].name == MainPage.LOGIN_ROUTE)){
				this.reloadTabData();
				// if(this.refs['page2'])this.refs['page2'].clearViews();
				// if(this.refs['page1'])this.refs['page1'].clearViews();
				// if(this.refs['page0'])this.refs['page0'].clearViews();
			}
		}
	};

    onPageSelected = (index) => {
		this.setState({
			currentSelectedTab: index,
		})
		LogicData.setCurrentPageTag(index);

		var userData = LogicData.getUserData()
		var loggined = Object.keys(userData).length !== 0
		if (loggined && this.refs['page' + index]) {
			this.refs['page' + index].tabPressed()
		}
	};

    onTabChanged = () => {
	  LogicData.setTabIndex(MainPage.STOCK_EXCHANGE_TAB_INDEX);
		LogicData.setCurrentPageTag(this.state.currentSelectedTab);
		this.reloadTabData();
	};

    reloadTabData = () => {
		var userData = LogicData.getUserData()
		var loggined = Object.keys(userData).length !== 0

		if (loggined){
			this.setState({
				loggined: true,
			})
			var currentTab = MainPage.initExchangeTab
			if(this.refs['page0']){
				//If user has goes into this tab before...
				this.refs['tabPages'].tabClicked(currentTab)
				this.setState({
					currentSelectedTab: currentTab
				}, ()=>{
					if(currentTab === 2) {
						this.refs['page2'].tabPressed()
					}
					else if(currentTab === 1) {
						this.refs['page1'].tabPressed()
					}
					else {
						this.refs['page0'].tabPressed()
					}
				});				
			}
			else{
				//It is the first time user goes into this tab! Just trigger the render!
				this.setState({
					currentSelectedTab: 0
				})
			}

			// if(!LogicData.getActualLogin()){
			// 	this.gotoAccountStateExce()
			// }

		}else{
			this.setState({
				loggined: false,
			});
		}
	};

    renderLiveLogin = () => {
		var strWDCW = LS.str('WDCW')
		return(
			<View>
				{/* <NavBar title={''} navigator={this.props.navigator}/> */}
				<OAStatusPage onLoginClicked={()=>this.jumpToLogin()}/>
			</View>

		)
	};

    jumpToLogin = () => {
		var userData = LogicData.getUserData()
		var userId = userData.userId
		if (userId == undefined) {
			userId = 0
		}
		var strSPJY = LS.str('SPJY')
		console.log("gotoAccountStateExce userId = " + userId);

		MainPage.gotoLiveLogin(this.props.navigator, false, ()=>{this.onWebViewNavigationStateChange()})
	};

    onWebViewNavigationStateChange = () => {
		// todo
		console.log('success login ok');
		MainPage.ayondoLoginResult(true)
		this.setState({
			loggined:true,
		},()=>{
			if(this.refs['page'+this.state.currentSelectedTab]){
				this.refs['page'+this.state.currentSelectedTab].tabPressed()
			}
		});		
	};


    renderContent = () => {
		//var userData = LogicData.getUserData()
		var loggined = this.state.loggined;//Object.keys(userData).length !== 0

		var {height, width} = Dimensions.get('window');
		var tabPages = [
			<StockOpenPositionPage navigator={this.props.navigator} ref={'page0'}
					showTutorial={(type)=>this.props.showTutorial(type)}/>,
			<StockClosedPositionPage navigator={this.props.navigator} ref={'page1'}/>,
			<StockStatisticsPage navigator={this.props.navigator} ref={'page2'}
				style={{paddingTop:10}}/>
		]

		var viewPages = tabNames.map(
			(tabName, i) =>
			<View style={styles.slide} key={i}>
				{tabPages[i]}
			</View>
		)

		var userData = LogicData.getUserData()
		var userId = userData.userId
		if (userId == undefined) {
			userId = 0
		}


		console.log('loggined = '+loggined + ' accState = ' + LogicData.getAccountState());
		var strWDCW = LS.str('WDCW')
		var tabNameShow = [LS.str(tabNames[0]),LS.str(tabNames[1]),LS.str(tabNames[2])]
		if(loggined && LogicData.getAccountState()){//实盘状态
			if(LogicData.getActualLogin()){
				return (
					<View style={{flex: 1}}>
						<NavBar title={strWDCW} showSearchButton={true} navigator={this.props.navigator}/>
						<ScrollTabView ref={"tabPages"} tabNames={tabNameShow} viewPages={viewPages} removeClippedSubviews={true}
							onPageSelected={(index) => this.onPageSelected(index)} />
					</View>
				)
			} else{
				return(this.renderLiveLogin())
			}
		}else{//模拟盘状态
			if (loggined) {
				return (
					<View style={{flex: 1}}>
						<NavBar title={LS.str('WDCW')} showSearchButton={true} navigator={this.props.navigator}/>
						<ScrollTabView ref={"tabPages"} tabNames={tabNameShow} viewPages={viewPages} removeClippedSubviews={true}
							onPageSelected={(index) => this.onPageSelected(index)} />
					</View>
				)
			}
			else {
				return (
					<LoginPage navigator={this.props.navigator}
										isTabbarShown={()=> { return true;}}/>
				)
			}
		}

	};

    render() {
		return (
			<View style={{flex: 1}}>
				{this.renderContent()}
			</View>
		);
	}
}

var styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		justifyContent: 'space-around',
	},
	rowWrapper: {
		flex:1,
		alignItems:'center',
		flexDirection:'row',
	},

	headerText: {
		flex: 1,
		fontSize: 17,
		color: 'white',
	},

	text1: {
		flex: 1,
		fontSize: 27,
		color: 'white',
	},
	text2: {
		flex: 1,
		fontSize: 14,
		color: '#92b9fa',
	},

	logoImage: {
		flex: 3,
		width: 190,
		height: 190,
	},

	registerView: {
		alignSelf: 'stretch',
		height: 42,
		backgroundColor: 'transparent',
		paddingVertical: 10,
    	borderRadius:5,
		borderWidth: 1,
		borderColor: 'white',
		margin: 15,
	},

	registerButton: {
		color: 'white',
		fontSize: 17,
		textAlign: 'center',
	},

});


module.exports = StockExchangePage;
