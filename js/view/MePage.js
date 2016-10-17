'use strict';

import React from 'react';
import {
	StyleSheet,
	View,
	Dimensions,
	ListView,
	Text,
	Image,
	TouchableOpacity,
	ScrollView,
	Alert,
} from 'react-native';

var {EventCenter, EventConst} = require('../EventCenter')

var LogicData = require('../LogicData')
var ColorConstants = require('../ColorConstants')
var NavBar = require('./NavBar')
var Button = require('./component/Button')
var MainPage = require('./MainPage')
var NativeDataModule = require('../module/NativeDataModule')
var NativeSceneModule = require('../module/NativeSceneModule')
var StorageModule = require('../module/StorageModule')
var NetConstants = require('../NetConstants')
var NetworkModule = require('../module/NetworkModule')

var {height, width} = Dimensions.get('window')
var heightRate = height/667.0

var listRawData = [{'type':'account','subtype':'accountInfo'},
// {'type':'button','title':'开设实盘账户'},
{'type':'Separator', 'height':10},
{'type':'accountState'},
{'type':'normal','title':'我的交易金', 'image':require('../../images/icon_income.png'), 'subtype':'income'},
{'type':'normal','title':'帮助中心', 'image':require('../../images/icon_helpcenter.png'), 'subtype':'helpcenter'},
{'type':'normal','title':'线上咨询', 'image':require('../../images/icon_onlinehelp.png'), 'subtype':'onlinehelp'},
{'type':'normal','title':'产品反馈', 'image':require('../../images/icon_response.png'), 'subtype':'feedback'},
{'type':'normal','title':'关于我们', 'image':require('../../images/icon_aboutus.png'), 'subtype':'aboutus'},
{'type':'normal','title':'设置', 'image':require('../../images/icon_config.png'), 'subtype':'config'},]

var accountInfoData = [
	{type:'开通实盘账户',color:ColorConstants.TITLE_BLUE},
	{type:'登入实盘账户',color:ColorConstants.TITLE_BLUE},
	{type:'实盘开户审核中...',color:'#757575'},
	{type:'继续开户',color:ColorConstants.TITLE_BLUE},
	{type:'重新开户',color:ColorConstants.TITLE_BLUE}
]

var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

var didTabSelectSubscription = null

var MePage = React.createClass({
	getInitialState: function() {
		return {
			loggedIn: false,
			hasUnreadMessage: false,
			dataSource: ds.cloneWithRows(listRawData),
		};
	},

	componentWillMount: function(){
		var userData = LogicData.getUserData()
		var notLogin = Object.keys(userData).length === 0
		if(!notLogin){
			//If previously logged in, fetch me data from server.
			NetworkModule.fetchTHUrlWithNoInternetCallback(
				NetConstants.CFD_API.GET_USER_INFO_API,
				{
					method: 'GET',
					headers: {
						'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
					},
				},
				function(responseJson) {
					StorageModule.setMeData(JSON.stringify(responseJson))
					LogicData.setMeData(responseJson);

					this.reloadMeData();
				}.bind(this),
				function(errorMessage) {
					this.reloadMeDataFromStorage();
				}.bind(this),
				function(errorMessage) {
					this.reloadMeDataFromStorage();
				}.bind(this)
			)
		}else{
			this.reloadMeDataFromStorage();
		}
	},

	componentDidMount: function(){
		didTabSelectSubscription = EventCenter.getEventEmitter().
			addListener(EventConst.ME_TAB_PRESS_EVENT, this.onTabChanged);
	},

	componentWillUnmount: function() {
		didTabSelectSubscription && didTabSelectSubscription.remove();
	},

	reloadMeDataFromStorage: function(){
		StorageModule.loadMeData()
		.then(function(value) {
			if (value) {
				LogicData.setMeData(JSON.parse(value))
				this.reloadMeData();
			}
		}.bind(this));
	},

	onTabChanged: function(){
		LogicData.setTabIndex(3);
		this.reloadMeData()
	},

	reloadMeData: function(){
		//Check if the user has logged in and the config row need to be shown.
		var userData = LogicData.getUserData();
		var meData = LogicData.getMeData()
		var notLogin = Object.keys(meData).length === 0
		if (notLogin) {
			this.setState({
				loggedIn: false,
			})
		}else{
			if(meData.picUrl !== undefined){
				NativeDataModule.passRawDataToNative('myLogo', meData.picUrl)
			}
			this.setState({
				loggedIn: true,
			})

			NetworkModule.fetchTHUrlWithNoInternetCallback(
				NetConstants.CFD_API.GET_UNREAD_MESSAGE,
				{
					method: 'GET',
					headers: {
						'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
					},
				},
				function(response) {
					this.setState(
						{
							hasUnreadMessage: response > 0,
						}
					)
				}.bind(this),
				function(errorMessage) {
					console.log(errorMessage)
				}.bind(this),
				function(errorMessage) {
					console.log(errorMessage)
				}.bind(this)
			);
		}

		var datasource = ds.cloneWithRows(listRawData);
		this.setState({
			dataSource: datasource,
		})
	},

	gotoOpenAccount: function() {
		this.props.navigator.push({
			name: MainPage.LOGIN_ROUTE,
		});
	},

	gotoLogin: function(){
		this.props.navigator.push({
			name: MainPage.LOGIN_ROUTE,
			popToRoute: MainPage.ME_ROUTE,	//Set to destination page
			onPopToRoute: this.reloadMeData,
		});
	},

	gotoUserInfoPage: function() {
		//TODO: Use real page.
		this.props.navigator.push({
			name: MainPage.ACCOUNT_INFO_ROUTE,
			backButtonOnClick: this.reloadMeData,
			//popToRoute: MainPage.ME_PUSH_CONFIG_ROUTE,	//Set to destination page
		});
	},

	gotoAccountStateExce:function(){
		console.log("gotoAccountStateExce");
		this.props.navigator.push({
			name:MainPage.NAVIGATOR_WEBVIEW_ROUTE,
			title:'实盘交易',
			// url:'https://tradehub.net/demo/auth?response_type=token&client_id=62d275a211&redirect_uri=https://api.typhoontechnology.hk/api/demo/oauth&state=guid'
			url:'https://www.tradehub.net/live/yuefei-beta/login.html',
		});

	},

	gotoWebviewPage: function(targetUrl, title) {
		var userData = LogicData.getUserData()
		var userId = userData.userId
		if (userId == undefined) {
			userId = 0
		}

		if (targetUrl.indexOf('?') !== -1) {
			targetUrl = targetUrl + '&userId=' + userId
		} else {
			targetUrl = targetUrl + '?userId=' + userId
		}

		this.props.navigator.push({
			name: MainPage.NAVIGATOR_WEBVIEW_ROUTE,
			url: targetUrl,
			title: title,
		});
	},

	goToMailPage: function(){
		this.props.navigator.push({
			name: MainPage.MY_MESSAGES_ROUTE,
			onPopToRoute: this.reloadMeData,
		});
	},

	onSelectNormalRow: function(rowData) {
		if(rowData.subtype === 'income'){
			this.props.navigator.push({
				name: MainPage.MY_INCOME_ROUTE,
			})
		}
		else if(rowData.subtype === 'helpcenter') {
			this.props.navigator.push({
				name: MainPage.QA_ROUTE,
			});
		}
		else if(rowData.subtype === 'onlinehelp') {
			NativeSceneModule.launchNativeScene('MeiQia')
		}
		else if(rowData.subtype === 'aboutus') {
			// this.props.navigator.push({
			// 	name: MainPage.ABOUT_US_ROUTE,
			// });
			this.gotoWebviewPage(NetConstants.TRADEHERO_API.WEBVIEW_URL_ABOUT_US, '关于我们');
			LogicData.setAccountState(true)
		}
		else if(rowData.subtype === 'config') {
			this.props.navigator.push({
				name: MainPage.ME_CONFIG_ROUTE,
				onPopBack: this.reloadMeData
			});

		}
		else if(rowData.subtype === 'feedback') {
			var meData = LogicData.getMeData();
			this.props.navigator.push({
				name: MainPage.FEEDBACK_ROUTE,
				phone: meData.phone,
			});
			LogicData.setAccountState(false)
		}
		else if(rowData.subtype === 'accountInfo') {
			this.gotoUserInfoPage()
		}
	},

	renderSeparator: function(sectionID, rowID, adjacentRowHighlighted){
		var marginLeft = 0
		if (rowID > 1 && rowID < 6){
			marginLeft = 15
		}
		return (
			<View style={styles.line} key={rowID}>
				<View style={[styles.separator, {marginLeft: marginLeft}]}/>
			</View>
			)
	},

	renderUserNameView: function(){
		var meData = LogicData.getMeData();
		if(meData.phone){
			return (
				<View style={[styles.userInfoWrapper]}>
					<Text style={styles.userNameText}>{meData.nickname}</Text>
					<Text style={styles.phoneText}>{"账号: " + meData.phone}</Text>
				</View>
			);
		}
		else{
			return(
				<View style={[styles.userInfoWrapper]}>
					<Text style={styles.userNameText}>{meData.nickname}</Text>
				</View>
			)
		}
	},

	renderUserPortraitView: function(){
		var meData = LogicData.getMeData();
		if(meData.picUrl){
			return (
				<Image source={{uri: meData.picUrl}} style={styles.headImage}
				defaultSource={require('../../images/head_portrait.png')}/>
			);
		}else{
			return (
				<Image source={require('../../images/head_portrait.png')} style={styles.headImage} />
			);
		}
	},

	renderUserInfoView: function(){
		return(
			<TouchableOpacity activeOpacity={0.5} onPress={()=>this.gotoUserInfoPage()}>
				<View style={[styles.rowWrapper, {height:Math.round(88*heightRate)}]}>
					{this.renderUserPortraitView()}
					{this.renderUserNameView()}
					<Image style={styles.moreImage} source={require("../../images/icon_arrow_right.png")} />
				</View>
			</TouchableOpacity>
		);
	},

	renderAccountStateView: function(){
		return(
			<TouchableOpacity activeOpacity={0.5} onPress={()=>this.gotoAccountStateExce()}>
				<View style={styles.accoutStateLine}>
						<View style={styles.accoutStateButton}>
							<Text style={styles.accountStateInfo}>开通实盘账户</Text>
					  </View>
				</View>
			</TouchableOpacity>
		)
	},

	renderRow: function(rowData, sectionID, rowID) {
		if (rowData.type === 'normal') {
			if(rowData.subtype === 'config' && !this.state.loggedIn){
				return (
					<View></View>
				);
			}
			else if(rowData.subtype == 'income' && LogicData.getAccountState()){
				 return(
					 <View></View>
				 );
			}
			else{
				return(
					<TouchableOpacity activeOpacity={0.5} onPress={()=>this.onSelectNormalRow(rowData)}>
						<View style={[styles.rowWrapper, {height:Math.round(64*heightRate)}]}>
							<Image source={rowData.image} style={styles.image} />
							<Text style={styles.title}>{rowData.title}</Text>
							<Image style={styles.moreImage} source={require("../../images/icon_arrow_right.png")} />
						</View>
					</TouchableOpacity>
				)
			}
		}
		else if (rowData.type === 'button'){
			return(
				<View style={[styles.rowWrapper, {height:Math.round(68*heightRate)}]}>
					<Button style={styles.buttonArea}
						enabled={true}
						onPress={this.gotoOpenAccount}
						textContainerStyle={styles.buttonView}
						textStyle={styles.buttonText}
						text= {rowData.title}/>
				</View>
			)
		}
		else if (rowData.type === 'account'){
			// account
			if(this.state.loggedIn){
				return this.renderUserInfoView();
			}else{
				return(
					<TouchableOpacity activeOpacity={0.5} onPress={()=>this.gotoLogin()}>
						<View style={[styles.rowWrapper, {height:Math.round(88*heightRate)}]}>
							<Image source={require('../../images/head_portrait.png')} style={styles.headImage} />
							<Text style={styles.defaultText}>手机号/微信号登录</Text>
							<Image style={styles.moreImage} source={require("../../images/icon_arrow_right.png")} />
						</View>
					</TouchableOpacity>
				)
			}
		}
		else if(rowData.type === 'accountState'){
				if(this.state.loggedIn && LogicData.getAccountState()){
					return this.renderAccountStateView()
				}else{
					return (
						<View></View>
					)
				}
		}
		else {
			// separator
			if(LogicData.getAccountState()){
				return (
					<View></View>
				)
			}else{
				return (
				<View style={[styles.line, {height:rowData.height}]}>
					<View style={[styles.separator, {height:rowData.height}]}/>
				</View>
					)
			}
		}
	},

	renderNavBar: function(){
		var userData = LogicData.getUserData()
		var notLogin = Object.keys(userData).length === 0
		if(!notLogin){
			var image;
			console.log("this.state.hasUnreadMessage: " + this.state.hasUnreadMessage)
			if(this.state.hasUnreadMessage){
				image = require('../../images/icon_my_messages_new.png');
			}else{
				image = require('../../images/icon_my_message.png');
			}
			return(
				<NavBar title="我的" imageOnRight={image}
					rightImageOnClick={this.goToMailPage}
					navigator={this.props.navigator}/>
			)
		}else{
			return(
				<NavBar title="我的"
					navigator={this.props.navigator}/>
			);
		}
	},

	renderListView: function(){
		var listDataView = listRawData.map((data, i)=>{
			return(
				<View key={i}>
					{this.renderRow(data, 's1', i)}
					{this.renderSeparator('s1', i, false)}
				</View>
			);
		})

		return (
			<View>
				{listDataView}
			</View>);
	},

	render: function() {
		//Do not use List view with image inside under RN 3.3
		//since there's a serious bug that the portrait won't update if user changes.
		/*
		<ListView
			ref={(scrollView) => { this._scrollView = scrollView; }}
			style={styles.list}
			dataSource={this.state.dataSource}
			renderRow={this.renderRow}
			renderSeparator={this.renderSeparator} />
		*/
		return (
			<View style={styles.wrapper}>
				{this.renderNavBar()}
				<ScrollView>
					{this.renderListView()}
				</ScrollView>
			</View>
		);
	},
});

var styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		width: width,
   		alignItems: 'stretch',
    	justifyContent: 'space-around',
		backgroundColor: ColorConstants.BACKGROUND_GREY,
	},

	list: {
		flex: 1,
		// borderWidth: 1,
	},
	rowWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 15,
		paddingRight: 15,
		paddingBottom: 5,
		paddingTop: 5,
		backgroundColor: 'white',
	},
	userInfoWrapper: {
		flex: 1,
		flexDirection: 'column',
		backgroundColor: 'white',
		alignItems: 'flex-start',
	},
	line: {
		height: 0.5,
		backgroundColor: 'white',
	},
	separator: {
		height: 0.5,
		backgroundColor: ColorConstants.SEPARATOR_GRAY,
	},

	image: {
		marginLeft: -10,
		width: 40,
		height: 40,
	},
	title: {
		flex: 1,
		fontSize: 17,
		marginLeft: 10,
		color: '#303030',
	},

	moreImage: {
		alignSelf: 'center',
		width: 7.5,
		height: 12.5,
	},

	buttonArea: {
		flex: 1,
		borderRadius: 3,
	},
	buttonView: {
		height: Math.round(44*heightRate),
		borderRadius: 3,
		backgroundColor: ColorConstants.TITLE_BLUE,
		justifyContent: 'center',
	},
	buttonText: {
		fontSize: 17,
		textAlign: 'center',
		color: '#ffffff',
	},

	defaultText: {
		flex: 1,
		fontSize: 17,
		marginLeft: 10,
		color: '#6d6d6d',
	},

	userNameText: {
		textAlign: 'left',
		fontSize: 17,
		marginLeft: 10,
		color: '#303030',
	},

	phoneText: {

		textAlign: 'left',
		fontSize: 17,
		marginLeft: 10,
		marginTop: 9,
		color: '#757575',
	},

	headImage: {
		width: Math.round(62*heightRate),
		height: Math.round(62*heightRate),
		borderRadius: Math.round(31*heightRate),
	},

	accoutStateLine:{
		flex:1,
		height:Math.round(60*heightRate),
		alignItems:'center',
		justifyContent: 'center',
	},


	accoutStateButton:{
		width:width - 10 *2,
		height:40*heightRate,
		backgroundColor:ColorConstants.TITLE_BLUE,
		justifyContent: 'center',
		alignItems:'center',
	},

	accountStateInfo:{
		fontSize:16,
		color:'white',
	},
});


module.exports = MePage;
