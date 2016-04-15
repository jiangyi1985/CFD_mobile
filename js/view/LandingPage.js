'use strict'

var React = require('react-native');
var Swiper = require('react-native-swiper')

var {
	StyleSheet,
	View,
	Image,
	Text,
	TouchableHighlight,
	Alert,
	Dimensions,
} = React;

var LogicData = require('../LogicData')
var StorageModule = require('../module/StorageModule')
var NetworkModule = require('../module/NetworkModule')
var AppNavigator = require('../../AppNavigator')

var LandingPage = React.createClass({

	loginPress: function() {
		StorageModule.loadUserData()
			.then((value) => {
				if (value !== null) {
					LogicData.setUserData(JSON.parse(value))

					this.props.navigator.push({
						name: AppNavigator.WECHAT_LOGIN_CONFIRM_ROUTE,
					});	
				} else {
					this.props.navigator.push({
						name: AppNavigator.LOGIN_ROUTE,
					});
				}
			})
	},

	logoutPress: function() {
		StorageModule.removeUserData()
		.then(() => {
			LogicData.removeUserData()
		})
	},

	render: function() {
		var {height, width} = Dimensions.get('window');

		return (
			<View style={styles.wrapper}>
				

				<Swiper height={420} loop={false} bounces={true}>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('image!guide_screen1')}/>
					</View>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('image!guide_screen2')}/>
					</View>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('image!guide_screen3')}/>
					</View>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('image!guide_screen4')}/>
					</View>
				</Swiper>
				<TouchableHighlight style={styles.loginClickableArea}
					onPress={this.loginPress}>
					<View style={{borderRadius: 3, padding: 5, backgroundColor: '#1789d5'}}>
						<Text style={styles.loginText}>
							登录
						</Text>
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.loginClickableArea}
					onPress={this.logoutPress}>
					<View style={{borderRadius: 3, padding: 5, backgroundColor: '#1789d5'}}>
						<Text style={styles.loginText}>
							退出
						</Text>
					</View>
					
				</TouchableHighlight>
			</View>
		)
	}
})

var styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		paddingTop: 20,
	},
	slide: {
		alignItems: 'center',
		flex: 1,
	},
	image: {
		flex: 1,
		height: 400,
		resizeMode: Image.resizeMode.contain,
	},
	loginClickableArea: {
		marginTop: 10,
	},
	loginText: {
		fontSize: 20,
		width: 200,
		height: 30,
		lineHeight: 25,
		textAlign: 'center',
		color: '#ffffff',
	},
})

module.exports = LandingPage;