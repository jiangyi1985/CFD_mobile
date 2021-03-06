'use strict';

import React from 'react';
import {
	StyleSheet,
	View,
	Dimensions,
	ListView,
	Alert,
	Text,
	Image,
	TouchableOpacity,
} from 'react-native';

var LogicData = require('../LogicData')
var NetConstants = require('../NetConstants')
var NetworkModule = require('../module/NetworkModule')
var LocalDataUpdateModule = require('../module/LocalDataUpdateModule')
var WebSocketModule = require('../module/WebSocketModule')
var ColorConstants = require('../ColorConstants')
var Button = require('./component/Button')
var MainPage = require('./MainPage')
var WechatModule = require('../module/WechatModule')
var LoadingIndicator = require('./LoadingIndicator')
var UIConstants = require('../UIConstants')
var LS = require('../LS')

var {height, width} = Dimensions.get('window')
var heightRate = height/667.0

var listRawData = [
{'type':'mobile','title':'MOBILE_NUMBER', 'subtype': 'bindMobile'},
{'type':'wechat','title':'WE_CHAT_ID', 'subtype': 'bindWeChat'}
]

var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

class MeAccountBindingPage extends React.Component {
    state = {
        dataSource: ds.cloneWithRows(listRawData),
        phoneNumber: null,
        weChatOpenId: null,
        wechatInstalled: false,
    };

    componentWillMount() {
		var userData = LogicData.getUserData()
		var notLogin = Object.keys(userData).length === 0
		WechatModule.isWechatInstalled()
		.then((installed) => {
			this.setState({
				wechatInstalled: installed
			})
			this.loadAccountBindingInfo(userData)
		})
	}

    onSelectNormalRow = (rowData) => {
		if(rowData.subtype === 'bindWeChat') {
			this.wechatPressed();
		}else if(rowData.subtype === 'bindMobile'){
			this.props.navigator.push({
				name: MainPage.LOGIN_ROUTE,
				onLoginFinish: ()=>{
					this.loadAccountBindingInfo()
					this.props.navigator.pop();
				},
				isMobileBinding: true,
			});
		}
	};

    loadAccountBindingInfo = (userData) => {
		var meData = LogicData.getMeData();
		console.log(JSON.stringify(meData))

		if(meData.phone){
			this.setState({
				phoneNumber: meData.phone,
			})
		}

		if(meData.weChatOpenId){
			this.setState({
				weChatOpenId: meData.weChatOpenId,
			})
		}
		this.setState({
			dataSource: ds.cloneWithRows(listRawData),
		})
	};

    wechatPressed = () => {
		WechatModule.wechatLogin(
			() => {
				this.bindWechat()
			},

			function() {}.bind(this)
		)
	};

    bindWechat = () => {
		//TODO: Use MeData.
		var userData = LogicData.getUserData()
		var wechatUserData = LogicData.getWechatUserData()

		console.log(JSON.stringify(userData))

		var url = NetConstants.CFD_API.BIND_WECHAT_API;
		url = url.replace(/<wechatOpenId>/, wechatUserData.openid)

		NetworkModule.fetchTHUrl(
			url,
			{
				method: 'POST',
				headers: {
					'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
				},
				showLoading: true,
			},
			(responseJson) => {
				LocalDataUpdateModule.updateMeData(userData, ()=>{
					this.loadAccountBindingInfo(responseJson)
				})
			},
			(result) => {
				Alert.alert(LS.str("TS"), result.errorMessage);
			}
		)
	};

    renderSeparator = (sectionID, rowID, adjacentRowHighlighted) => {
		var marginLeft = 0
		return (
			<View style={styles.line} key={rowID}>
				<View style={[styles.separator, {marginLeft: marginLeft}]}/>
			</View>
			)
	};

    renderRow = (rowData, sectionID, rowID) => {
		if (rowData.type === 'mobile'){
			//TODO: Use Real Data
			if(this.state.phoneNumber !== null){
				return(
					<View style={[styles.rowWrapper, {height:Math.round(64*heightRate)}]}>
						<Text style={styles.title}>{LS.str(rowData.title)}</Text>
						<View style={styles.extendRight}>
							<Text style={styles.message}>{this.state.phoneNumber}</Text>
						</View>
					</View>
				);
			}else{
				return(
					<TouchableOpacity activeOpacity={0.5} onPress={()=>this.onSelectNormalRow(rowData)} showView={false}>
						<View style={[styles.rowWrapper, {height:Math.round(64*heightRate)}]} showView={false}>
							<Text style={styles.title}>{LS.str(rowData.title)}</Text>
							<View style={styles.extendRight}>
								{/* <Text style={[styles.clickableMessage,{color:ColorConstants.title_blue()}]}>未绑定</Text> */}
								<View style={{flexDirection:'row'}}>
									<Image style={styles.redPackageImage} source={require('../../images/icon_red_package.png')} />
									<Text style={styles.redPackageText}>{LS.str("BIND_MOBILE_REWARD")}</Text>
								</View>
							</View>
							<Image style={styles.moreImage} source={require("../../images/icon_arrow_right.png")} />
						</View>
					</TouchableOpacity>
				);
			}
		}else if (rowData.type === 'wechat'){
			if(this.state.weChatOpenId != null){
				return(
					<View style={[styles.rowWrapper, {height:Math.round(64*heightRate)}]}>
						<Text style={styles.title}>{LS.str(rowData.title)}</Text>
						<View style={styles.extendRight}>
							<Text style={styles.message}>{LS.str("ALREADY_BINDED")}</Text>
						</View>
					</View>
				);
			} else if(this.state.wechatInstalled){
					return(
						<TouchableOpacity activeOpacity={0.5} onPress={()=>this.onSelectNormalRow(rowData)}>
							<View style={[styles.rowWrapper, {height:Math.round(64*heightRate)}]}>
								<Text style={styles.title}>{LS.str(rowData.title)}</Text>
								<View style={styles.extendRight}>
									<Text style={[styles.clickableMessage,{color:ColorConstants.title_blue()}]}>未绑定</Text>
								</View>
								<Image style={styles.moreImage} source={require("../../images/icon_arrow_right.png")} />
							</View>
						</TouchableOpacity>
					);
			}else{
				return (<View></View>)
			}
		}
	};

    render() {
		return (
			<ListView
	    	style={styles.list}
				dataSource={this.state.dataSource}
				renderRow={this.renderRow}
				renderSeparator={this.renderSeparator} />
		);
	}
}

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
		paddingLeft: UIConstants.LIST_ITEM_LEFT_MARGIN,
		paddingRight: 15,
		paddingBottom: 5,
		paddingTop: 5,
		backgroundColor: 'white',
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
		color: '#303030',
	},
	message:{
		fontSize: 17,
		marginLeft: 10,
		marginRight: 10,
		color: '#757575',
	},
	extendRight: {
		alignItems: 'center',
	},
	clickableMessage: {
		fontSize: 17,
		marginLeft: 10,
		marginRight: 10,
		color: ColorConstants.TITLE_BLUE,
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
	headImage: {
		width: Math.round(62*heightRate),
		height: Math.round(62*heightRate),
	},
	redPackageImage:{
		alignSelf:'center',
		width:24,
		height:24,
		marginRight:1,
	},
	redPackageText:{
		alignSelf:'center',
		color:'#e60012',
		fontSize:11,
		marginRight:1,
	},
});


module.exports = MeAccountBindingPage;
