'use strict';

import React from 'react';
import {
	AppRegistry,
	StyleSheet,
	ListView,
	Text,
	Image,
	View,
	TouchableHighlight,
	Alert,
} from 'react-native';

var NetConstants = require('../NetConstants')
var NetworkModule = require('../module/NetworkModule')
var LogicData = require('../LogicData')


class WechatLoginConfirmPage extends React.Component {
    state = {
        wechatData: LogicData.getWechatUserData(),
        userData: LogicData.getUserData(),
        nickName: '',
    };

    componentDidMount() {
		var userData = LogicData.getUserData()

		NetworkModule.fetchTHUrl(
			NetConstants.CFD_API.GET_USER_INFO_API,
			{
				method: 'GET',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
				},
			},
			function(responseJson) {
				this.setState({
					nickName: responseJson.nickname
				});
			}.bind(this),
			function(result) {
				Alert.alert('提示', result.errorMessage);
			}
		)
	}

    render() {
		return (
			<View style={styles.wrapper}>

				<Image
					style={styles.logo}
					source={{uri: this.state.wechatData.headimgurl}} />

				<Text style={styles.displayName}>
					昵称 {this.state.nickName}
				</Text>

				<Text style={styles.userId}>
					UserId: {this.state.userData.userId}
				</Text>

				<Text style={styles.token}>
					Token: {this.state.userData.token}
				</Text>

			</View>
		);
	}
}

var styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
	},
	line: {
		alignSelf: 'stretch',
		height: 1,
		borderWidth: 0.25,
		borderColor: '#d0d0d0'
	},
	logo: {
		width: 60,
		height: 60,
		backgroundColor: '#eaeaea',
		marginRight: 10,
	},
	displayName: {
		fontSize: 15,
		textAlign: 'center',
		fontWeight: 'bold',
	},
	userId: {
		fontSize: 15,
		textAlign: 'center',
		fontWeight: 'bold',
	},
	token: {
		fontSize: 15,
		textAlign: 'center',
		fontWeight: 'bold',
	},
});

module.exports = WechatLoginConfirmPage;
