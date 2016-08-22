'use strict'

import React from 'react';
import {
	StyleSheet,
	Platform,
	View,
	TextInput,
	Text,
	TouchableOpacity,
	Alert,
	Dimensions,
	Image,
	TouchableWithoutFeedback,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
var TimerMixin = require('react-timer-mixin');

var LogicData = require('../LogicData')
var MyHomePage = require('./MyHomePage')
var StorageModule = require('../module/StorageModule')
var NetworkModule = require('../module/NetworkModule')
var LoadingIndicator = require('./LoadingIndicator')
var ColorConstants = require('../ColorConstants')
var UIConstants = require('../UIConstants');
var NetConstants = require('../NetConstants')
var WechatModule = require('../module/WechatModule')
var WebSocketModule = require('../module/WebSocketModule')
var MainPage = require('./MainPage')
var dismissKeyboard = require('dismissKeyboard');

var {height, width} = Dimensions.get('window')
var rowHeight = 40;
var fontSize = 16;
var MAX_ValidationCodeCountdown = 60

const TAB_LIVE = 1
const TAB_SIMULATOR = 2

var MeBindingMobilePage = React.createClass({
	mixins: [TimerMixin],

	propTypes: {
		showCancelButton: React.PropTypes.bool,
		onPopBack: React.PropTypes.func,
		existingMobile: React.PropTypes.string
	},

	getDefaultProps() {
		return {
			showCancelButton: false,
			onPopBack: null,
			existingMobile: null,
		}
	},
	componentWillMount: function() {
		WechatModule.isWechatInstalled()
		.then((installed) => {
			this.setState({
				wechatInstalled: installed
			})
		})
	},

	getInitialState: function() {
		return {
			tabSelected: TAB_SIMULATOR,
			wechatInstalled: false,
			phoneNumber: '',
			validationCode: '',
			validationCodeCountdown: -1,
			animating: false,
			getValidationCodeButtonEnabled: false,
			phoneLoginButtonEnabled: false,
			liveLoginRememberUserName: true,
		};
	},

	checkButtonsEnable: function() {
		this.setState({
			getValidationCodeButtonEnabled: (this.state.phoneNumber.length === 11 && this.state.validationCodeCountdown < 0),
			phoneLoginButtonEnabled: (this.state.phoneNumber.length === 11 && this.state.validationCode.length === 4),
		})
	},

	setPhoneNumber: function(text: string) {
		this.setState({
			phoneNumber: text
		})

		this.checkButtonsEnable()
	},

	setValidationCode: function(text: string) {
		this.setState({
			validationCode: text
		})

		this.checkButtonsEnable()
	},

	getValidationCodePressed: function() {
		if (! this.state.getValidationCodeButtonEnabled) {
			return
		}
		NetworkModule.fetchTHUrl(
			NetConstants.GET_PHONE_CODE_API + '?' + NetConstants.PARAMETER_PHONE + "=" + this.state.phoneNumber,
			{
				method: 'POST',
			},
			function(responseJson) {
				// Nothing to do.
			}.bind(this),
			function(errorMessage) {
				Alert.alert('提示',errorMessage);
			}
		)

		this.setState({
			validationCodeCountdown: MAX_ValidationCodeCountdown,
			getValidationCodeButtonEnabled: false
		})
		var timer = this.setInterval(
			() => {
				var currentCountDown = this.state.validationCodeCountdown

				if (currentCountDown > 0) {
					this.setState({
						validationCodeCountdown: this.state.validationCodeCountdown - 1
					})
				} else {
					if (this.state.phoneNumber.length == 11) {
						this.setState({
							getValidationCodeButtonEnabled: true,
							validationCodeCountdown: -1
						})
					}
					this.clearInterval(timer)
				}
			},
			1000
		);
	},

	bindWithCode: function() {
		if (!this.state.phoneLoginButtonEnabled) {
			return
		}
		var userData = LogicData.getUserData()
		this.setState({
			phoneLoginButtonEnabled: false
		})
		NetworkModule.fetchTHUrl(
			NetConstants.BIND_MOBILE_API,
			{
				method: 'POST',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
					'Content-Type': 'application/json; charset=UTF-8'
				},
				body: JSON.stringify({
					phone: this.state.phoneNumber,
					verifyCode: this.state.validationCode,
				}),
				showLoading: true,
			},
			(responseJson) => {
				this.loginSuccess(responseJson);
			},
			(errorMessage) => {
				this.setState({
					phoneLoginButtonEnabled: true
				})
				Alert.alert('提示',errorMessage);
			}
		)
	},

	liveRegisterPressed: function() {
		this.props.navigator.push({
			name: MainPage.LIVE_REGISTER_ROUTE,
		});
	},

	loginSuccess: function(userData) {
		NetworkModule.fetchTHUrl(
			NetConstants.GET_USER_INFO_API,
			{
				method: 'GET',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
				},
			},
			function(responseJson) {
				StorageModule.setMeData(JSON.stringify(responseJson))
				LogicData.setMeData(responseJson);

				this.setState({
					phoneLoginButtonEnabled: true
				});

				if(this.props.onPopBack){
					this.props.onPopBack();
				}

				this.props.navigator.pop();
			}.bind(this),
			function(errorMessage) {
				Alert.alert('提示',errorMessage);
			}
		)
	},

	forgetPassword: function() {

	},

	renderGetValidationCodeButton: function() {
		var {height, width} = Dimensions.get('window');
		var textSize = Math.round(fontSize*width/375.0)
		var text = '获取验证码'
		if (this.state.validationCodeCountdown > 0) {
			text = '(' + this.state.validationCodeCountdown + ')'
		}
		return  (
			<TouchableOpacity style={styles.getValidationCodeArea} onPress={this.getValidationCodePressed}>
				<Text style={[styles.getValidationText, {fontSize: textSize}]}>
					{text}
				</Text>
			</TouchableOpacity>
		);
	},

	renderTab: function() {
		var liveTabAdditionalAttributes = {}
		var liveTextAdditionalAttributes = {}
		var simulatorTabAdditionalAttributes = {}
		var simulatorTextAdditionalAttributes = {}
		if (this.state.tabSelected == TAB_LIVE) {
			liveTextAdditionalAttributes = {
				color: '#415a87'
			}
			simulatorTabAdditionalAttributes = {
				backgroundColor: 'transparent',
				opacity: 0.5,
			}
			simulatorTextAdditionalAttributes = {
				color: 'white'
			}
		} else {
			liveTabAdditionalAttributes = {
				backgroundColor: 'transparent',
				opacity: 0.5,
			}
			liveTextAdditionalAttributes = {
				color: 'white'
			}
			simulatorTextAdditionalAttributes = {
				color: ColorConstants.TITLE_BLUE
			}
		}
		return (
			<View style={styles.tabContainer}>
				<TouchableOpacity onPress={() => this.setState({tabSelected: TAB_LIVE})}>
					<View style={[styles.liveTab, liveTabAdditionalAttributes]}>
						<Text style={[styles.tabText, liveTextAdditionalAttributes]}>
							实盘
						</Text>
					</View>
				</TouchableOpacity>
				<TouchableOpacity  onPress={() => this.setState({tabSelected: TAB_SIMULATOR})}>
					<View style={[styles.simulatorTab, simulatorTabAdditionalAttributes]}>
						<Text style={[styles.tabText, simulatorTextAdditionalAttributes]}>
							模拟
						</Text>
					</View>
				</TouchableOpacity>
			</View>
		)
	},

	renderRememberUserCheckbox: function() {
		var checkBox = require('../../images/checkbox_unchecked.png')
		if (this.state.liveLoginRememberUserName) {
			checkBox = require('../../images/checkbox_checked.png')
		}
		return (
			<TouchableOpacity style={{padding: 10}} onPress={() => {this.setState({liveLoginRememberUserName: !this.state.liveLoginRememberUserName})}}>
				<Image source={checkBox} style={{width: 17, height: 17}} />
			</TouchableOpacity>
		)
	},

	renderMobileLoginContent: function() {
		var {height, width} = Dimensions.get('window');
		return (
			<TouchableWithoutFeedback onPress={()=> dismissKeyboard()}>
				<View style={{flex: 1, justifyContent: 'space-between'}}>
					<View>
						<Image style={styles.ayondoLogoImage} source={require('../../images/ayondo_logo.png')}/>
						<Text style={{alignSelf: 'center', fontSize: 35, color: 'white'}}>ayondo</Text>
						<Text style={{alignSelf: 'center', fontSize: 11, color: '#2a3f43', marginTop: 30}}>您正在登录券商ayondo</Text>

						<View style={styles.phoneLoginContainer}>
							<View style={styles.rowWrapper}>
								<View style={[styles.phoneNumberInputView]}>
									<TextInput style={styles.phoneNumberInput}
										onChangeText={(text) => this.setPhoneNumber(text)}
										placeholder='手机号'
										placeholderTextColor='white'
										underlineColorAndroid='transparent'
										maxLength={11}
										keyboardType='numeric'/>
								</View>

								<View style={{borderWidth: 0.5, borderColor: 'white', marginHorizontal: 15, marginVertical: 7}}/>
								{this.renderGetValidationCodeButton()}
							</View>

							<View style={[styles.rowWrapper, {marginTop: 2}]}>
								<View style={[styles.validationCodeInputView]}>
									<TextInput style={styles.validationCodeInput}
										onChangeText={(text) => this.setValidationCode(text)}
										placeholder='验证码'
										placeholderTextColor='white'
										underlineColorAndroid='transparent'
										maxLength={4}
										keyboardType='numeric'/>
								</View>
							</View>

							<View style={[styles.rowWrapper, {marginTop: 20, backgroundColor: 'transparent'}]}>
								<TouchableOpacity style={styles.loginClickableArea} onPress={this.bindWithCode}>
									<View style={styles.loginTextView}>
										<Text style={styles.loginText}>
											确认
										</Text>
									</View>
								</TouchableOpacity>
							</View>
						</View>
					</View>

				</View>
			</TouchableWithoutFeedback>
		)
	},

	renderLoginContent: function() {
			return this.renderMobileLoginContent()
	},

	render: function() {
		var {height, width} = Dimensions.get('window');
		var gradientColors = ['#1c5fd1', '#123b80']
		if (this.state.tabSelected == TAB_LIVE) {
			gradientColors = ['#415a87', '#36496a']
		}

		return (
			<LinearGradient colors={gradientColors} style={[styles.wrapper, {height: height}]}>
				{/* {this.renderTab()} */}
				<View style={styles.tabContainer}>
					<Text style={{flex: 1, fontSize: 18, textAlign: 'center', color: '#ffffff'}}>
						绑定手机号
					</Text>
					{this.renderCancelButton()}
				</View>
				{this.renderLoginContent()}
			</LinearGradient>
		)
	},

	renderCancelButton: function() {
		if (this.props.showCancelButton) {
			return (
				<TouchableOpacity
					onPress={()=>this.props.navigator.pop()}>
						<Text style={styles.cancel}>
							取消
						</Text>
				</TouchableOpacity>
			);
		}
	},

})

var styles = StyleSheet.create({
	cancel: {
		color: 'white',
		paddingLeft: 15,
		width: 60,
		marginLeft: -width,
	},

	tabContainer: {
		height: UIConstants.HEADER_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: (Platform.OS === 'ios') ? 15 : 0,
	},
	liveTab: {
		backgroundColor: 'white',
		borderColor: 'white',
		borderWidth: 1,
		borderRightWidth: 0,
		borderTopLeftRadius: 5,
		borderBottomLeftRadius: 5,
		paddingLeft: 15,
		paddingRight: 15,
		paddingVertical: 5,
	},
	simulatorTab: {
		backgroundColor: 'white',
		borderColor: 'white',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopRightRadius: 5,
		borderBottomRightRadius: 5,
		paddingLeft: 15,
		paddingRight: 15,
		paddingVertical: 5,
	},
	tabText: {
		fontSize: 15
	},
	logoImage: {
		marginTop: 10,
		alignSelf: 'center',
		width: 190,
		height: 190,
	},
	ayondoLogoImage: {
		marginTop: 20,
		alignSelf: 'center',
		width: 89,
		height: 48,
	},
	wrapper: {
		flex:1,
		alignItems:'stretch',
	},
	phoneLoginContainer: {
		paddingTop: 10,
		alignItems: 'stretch',
	},
	fastLoginContainer: {
		paddingBottom: 70,
		alignItems: 'stretch',
	},
	rowWrapper: {
		flexDirection: 'row',
		alignItems: 'stretch',
		paddingVertical: 5,
		paddingHorizontal: 10,
		justifyContent: 'space-around',
		backgroundColor: '#678cc9',
	},
	liveRowWrapper: {
		flexDirection: 'row',
		alignItems: 'stretch',
		paddingVertical: 5,
		paddingHorizontal: 10,
		justifyContent: 'space-around',
		backgroundColor: '#7e8da5',
	},
	phoneNumberInputView: {
		flex: 2.5,
	},
	phoneNumberInput: {
		height: rowHeight,
		fontSize: fontSize,
		paddingLeft: 10,
		color: 'white',
	},
	getValidationCodeArea: {
		paddingVertical: 5,
		flex: 1,
		height: rowHeight,
		justifyContent: 'center',
	},
	getValidationText: {
		fontSize: fontSize,
		textAlign: 'center',
		color: '#ffffff',
	},
	validationCodeInputView: {
		flex: 1,
	},
	validationCodeInput: {
		height: 40,
		fontSize: fontSize,
		paddingLeft: 10,
		color: 'white',
	},
	loginClickableArea: {
		flex: 1,
		alignSelf: 'center',
	},
	loginTextView: {
		padding: 5,
		height: rowHeight,
		borderRadius: 3,
		backgroundColor: '#b8c7db',
		justifyContent: 'center',
	},
	loginText: {
		fontSize: fontSize,
		textAlign: 'center',
		color: '#2e2e2e',
	},
	registerTextView: {
		padding: 5,
		height: rowHeight,
		borderRadius: 3,
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#b8c7db',
		justifyContent: 'center',
	},
	registerText: {
		fontSize: fontSize,
		textAlign: 'center',
		color: '#b8c7db',
	},
	fastLoginRowWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 10,
		paddingRight: 10,
		justifyContent: 'space-around',
	},
	line: {
		flex: 1,
		marginLeft: 5,
		marginRight: 5,
		borderWidth: 0.5,
		borderColor: '#1c5fcf',
	},
	fastLoginTitle: {
		fontSize: 14,
		textAlign: 'center',
		color: '#1c5fcf',
	},
	forgetPasswordLine: {
		flex: 1,
		marginLeft: 5,
		marginRight: 5,
		borderWidth: 0.5,
		borderColor: '#415a87',
	},
	forgetPasswordTitle: {
		fontSize: 14,
		textAlign: 'center',
		color: '#415a87',
	},
	wechatClickableArea: {
		marginTop: 5,
		alignSelf: 'center',
		borderRadius: 3,
	},
	wechatIcon: {
		width: 39,
		height: 39,
	},
	wechatTitle: {
		fontSize: 12,
		height: 15,
		lineHeight: 15,
		textAlign: 'center',
		color: '#9c9c9c',
		alignSelf: 'center',
	},
})


module.exports = MeBindingMobilePage;