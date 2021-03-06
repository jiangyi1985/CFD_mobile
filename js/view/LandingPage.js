'use strict'

import React from 'react';
import {
	StyleSheet,
	View,
	Image,
	Text,
	TouchableHighlight,
	Alert,
	Dimensions,
} from 'react-native';
var Swiper = require('react-native-swiper')

var LogicData = require('../LogicData')
var StorageModule = require('../module/StorageModule')
var NetworkModule = require('../module/NetworkModule')
var MainPage = require('./MainPage')
var WebSocketModule = require('../module/WebSocketModule')

class LandingPage extends React.Component {
    loginPress = () => {
		StorageModule.loadUserData()
			.then((value) => {
				if (value !== null) {
					LogicData.setUserData(JSON.parse(value))

					this.props.navigator.push({
						name: MainPage.WECHAT_LOGIN_CONFIRM_ROUTE,
					});	
				} else {
					this.props.navigator.push({
						name: MainPage.LOGIN_ROUTE,
					});
				}
			})
	};

    logoutPress = () => {
		StorageModule.removeUserData()
		.then(() => {
			LogicData.removeUserData()
			WebSocketModule.registerCallbacks(
				() => {
			})
		})
	};

    render() {
		var {height, width} = Dimensions.get('window');

		return (
			<View style={styles.wrapper}>
				

				<Swiper height={420} loop={false} bounces={true}>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('../../images/guide_screen1.png')}/>
					</View>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('../../images/guide_screen2.png')}/>
					</View>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('../../images/guide_screen3.png')}/>
					</View>
					<View style={styles.slide}>
						<Image 
							style={styles.image} 
							source={require('../../images/guide_screen4.png')}/>
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
}

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
		resizeMode: 'contain',
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