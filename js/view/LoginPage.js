'use strict'

var React = require('react-native')
var {
	StyleSheet,
	Platform,
	View,
	TextInput,
	Text,
	TouchableHighlight,
	Alert,
	Dimensions,
	Image,
	TouchableWithoutFeedback,
} = React;

var TimerMixin = require('react-timer-mixin');

var LogicData = require('../LogicData')
var MyHomePage = require('./MyHomePage')
var StorageModule = require('../module/StorageModule')
var NetworkModule = require('../module/NetworkModule')
var LoadingIndicator = require('./LoadingIndicator')
var ColorConstants = require('../ColorConstants')
var NetConstants = require('../NetConstants')
var WechatModule = require('../module/WechatModule')
var Button = require('./component/Button')
var AppNavigator = require('../../AppNavigator')
var dismissKeyboard = require('dismissKeyboard');


var rowHeight = 40;
var fontSize = 16;
var MAX_ValidationCodeCountdown = 60

var LoginPage = React.createClass({
	mixins: [TimerMixin],

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
			wechatInstalled: false,
			phoneNumber: '',
			validationCode: '',
			validationCodeCountdown: -1,
			animating: false,
			phoneNumberBorderColor: ColorConstants.TITLE_BLUE,
			validationCodeBorderColor: ColorConstants.DISABLED_GREY,
			getValidationCodeButtonEnabled: false,
			phoneLoginButtonEnabled: false
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

	phoneNumberOnFocus: function() {
		this.setState({
			phoneNumberBorderColor: ColorConstants.TITLE_BLUE,
			validationCodeBorderColor: ColorConstants.DISABLED_GREY,
		})
	},

	validationCodeOnFocus: function() {
		this.setState({
			phoneNumberBorderColor: ColorConstants.DISABLED_GREY,
			validationCodeBorderColor: ColorConstants.TITLE_BLUE,
		})
	},

	getValidationCodePressed: function() {
		console.log('getValidationCodePressed')
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

	wechatPressed: function() {
		WechatModule.wechatLogin(
			() => {
				this.wechatLogin()
			},

			function() {}.bind(this)
		)
	},

	wechatLogin: function() {
		var wechatUserData = LogicData.getWechatUserData()

		NetworkModule.fetchTHUrl(
			NetConstants.WECHAT_LOGIN_API, 
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				},
				body: JSON.stringify({
					openid: wechatUserData.openid,
					unionid: wechatUserData.unionid,
					nickname: wechatUserData.nickname,
					headimgurl: wechatUserData.headimgurl,
				})
			},
			function(responseJson) {
				this.loginSuccess(responseJson);
			}.bind(this),
			function(errorMessage) {
				Alert.alert('提示',errorMessage);
			}
		)
	},

	loginPressed: function() {
		NetworkModule.fetchTHUrl(
			NetConstants.PHONE_NUM_LOGIN_API, 
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				},
				body: JSON.stringify({
					phone: this.state.phoneNumber,
					verifyCode: this.state.validationCode,
				})
			},
			function(responseJson) {
				this.loginSuccess(responseJson);
			}.bind(this),
			function(errorMessage) {
				Alert.alert('提示',errorMessage);
			}
		)
	},

	loginSuccess: function(userData) {
		StorageModule.setUserData(JSON.stringify(userData))
		LogicData.setUserData(userData);
		console.log(LogicData.getUserData());

		NetworkModule.syncOwnStocks(userData)

		this.props.navigator.replace({
			name: AppNavigator.UPDATE_USER_INFO_ROUTE,
		});
	},


	renderFastLogin: function() {
		if (this.state.wechatInstalled) {
			return (
				<View style={styles.fastLoginContainer}>
					<View style={styles.fastLoginRowWrapper}>
						<View style={styles.line}/>
						<Text style={styles.fastLoginTitle}>
							快速登录
						</Text>
						<View style={styles.line}/>
					</View>

					<TouchableHighlight style={styles.wechatClickableArea}
						onPress={this.wechatPressed}>
						<View>
							<Image 
								style={styles.wechatIcon} 
								source={require('../../images/wechat_icon.png')}/>
							<Text style={styles.wechatTitle}>
								微信
							</Text>
						</View>
					</TouchableHighlight>
				</View>
			);
		} else {
			return <View />;
		}
	},

	renderGetValidationCodeButton: function() {
		if (this.state.validationCodeCountdown < 0) {
			return  (
				<Button style={styles.getValidationCodeArea}
					enabled={this.state.getValidationCodeButtonEnabled}
					onPress={this.getValidationCodePressed}
					textContainerStyle={styles.getValidationTextView}
					textStyle={styles.getValidationText}
					text='点击获取' />
			);
		} else {
			return  (
				<Button style={styles.getValidationCodeArea}
					enabled={this.state.getValidationCodeButtonEnabled}
					onPress={this.getValidationCodePressed}
					textContainerStyle={styles.getValidationTextView}
					textStyle={styles.getValidationText}
					text={'(' + this.state.validationCodeCountdown + ')'} />
			);
		}
	},

	render: function() {
		var {height, width} = Dimensions.get('window');

		return (
			<TouchableWithoutFeedback onPress={()=> dismissKeyboard()}>
			<View style={[styles.wrapper, {height: height}]}>

				<View style={styles.phoneLoginContainer}>
					<View style={styles.rowWrapper}>
						<View style={[styles.phoneNumberInputView, {borderColor: this.state.phoneNumberBorderColor}]}>
							<TextInput style={styles.phoneNumberInput}
								autoFocus={Platform.OS !== 'ios'}
								onFocus={() => this.phoneNumberOnFocus()}
								onChangeText={(text) => this.setPhoneNumber(text)}
								placeholder='手机号'
								underlineColorAndroid='#ffffff'
								maxLength={11}
								keyboardType='numeric'/>
						</View>
						
						{this.renderGetValidationCodeButton()}
					</View>

					<View style={styles.rowWrapper}>
						<View style={[styles.validationCodeInputView, {borderColor: this.state.validationCodeBorderColor}]}>
							<TextInput style={styles.validationCodeInput}
								onFocus={() => this.validationCodeOnFocus()}
								onChangeText={(text) => this.setValidationCode(text)}
								placeholder='验证码' 
								underlineColorAndroid='#ffffff'
								maxLength={4}
								keyboardType='numeric'/>
						</View>
					</View>

					<View style={styles.rowWrapper}>
						<Button style={styles.loginClickableArea}
							enabled={this.state.phoneLoginButtonEnabled}
							onPress={this.loginPressed}
							textContainerStyle={styles.loginTextView}
							textStyle={styles.loginText}
							text='登录' />
					</View>
				</View>

				{this.renderFastLogin()}
			</View>	
			</TouchableWithoutFeedback>			
		)
	}
})

var styles = StyleSheet.create({
	wrapper: {
		alignSelf: 'stretch',
		alignItems: 'stretch',
		justifyContent: 'space-around',
		backgroundColor: ColorConstants.BACKGROUND_GREY,
	},
	phoneLoginContainer: {
		flex: 2,
		paddingTop: 20,
		alignItems: 'stretch',
	},
	fastLoginContainer: {
		flex: 1,
		alignItems: 'stretch',
	},
	rowWrapper: {
		flexDirection: 'row',
		alignItems: 'stretch',
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 10,
		paddingRight: 10,
		justifyContent: 'space-around',
	},
	phoneNumberInputView: {
		flex: 3,
		borderWidth: 1,
		borderRadius: 3,
		marginRight: 10,
		backgroundColor: '#ffffff',
	},
	phoneNumberInput: {
		height: rowHeight,
		fontSize: fontSize,
		paddingLeft: 10,
	},
	getValidationCodeArea: {
		flex: 1,
		borderRadius: 3,
		height: rowHeight,
	},
	getValidationTextView: {
		padding: 5,
		height: rowHeight,
		borderRadius: 3,
		backgroundColor: ColorConstants.TITLE_BLUE,
		justifyContent: 'center',
	},
	getValidationText: {
		fontSize: fontSize,
		textAlign: 'center',
		color: '#ffffff',
	},
	validationCodeInputView: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 3,
		backgroundColor: '#ffffff',
	},
	validationCodeInput: {
		height: 40,
		fontSize: fontSize,
		paddingLeft: 10,
	},
	loginClickableArea: {
		flex: 1,
		alignSelf: 'center',
	},
	loginTextView: {
		padding: 5,
		height: rowHeight,
		borderRadius: 3,
		backgroundColor: ColorConstants.TITLE_BLUE,
		justifyContent: 'center',
	},
	loginText: {
		fontSize: fontSize,
		textAlign: 'center',
		color: '#ffffff',
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
		borderColor: ColorConstants.DISABLED_GREY,
	},
	fastLoginTitle: {
		fontSize: 14,
		textAlign: 'center',
		color: '#9c9c9c',
	},
	wechatClickableArea: {
		marginTop: 15,
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


module.exports = LoginPage;