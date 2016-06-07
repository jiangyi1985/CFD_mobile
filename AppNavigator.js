'use strict';

import React from 'react';
import {
	StyleSheet,
	Navigator,
	View,
	Text,
	Image,
	StatusBar,
	Platform,
	Dimensions,
	TouchableOpacity,
	Alert,
} from 'react-native';

import {
	isFirstTime,
	isRolledBack,
	packageVersion,
	currentVersion,
	checkUpdate,
	downloadUpdate,
	switchVersion,
	switchVersionLater,
	markSuccess,
} from 'react-native-update';

import _updateConfig from './update.json';
const {appKey} = _updateConfig[Platform.OS];

var buildStyleInterpolator = require('buildStyleInterpolator');
var UIManager = require('UIManager');

require('./js/utils/dateUtils')


var SCREEN_WIDTH = Dimensions.get('window').width;
var ToTheLeft = {
	opacity: {
		from: 1,
		to: 0.5,
		min: 0,
		max: 1,
		type: 'linear',
		extrapolate: false,
	},
	left: {
		from: 0,
		to: -SCREEN_WIDTH,
		min: 0,
		max: 1,
		type: 'linear',
		extrapolate: true,
	},
};
Navigator.SceneConfigs.PushFromRight.animationInterpolators.out = buildStyleInterpolator(ToTheLeft)

var TimerMixin = require('react-timer-mixin');
var LayoutAnimation = require('LayoutAnimation')
var Swiper = require('react-native-swiper')
var StorageModule = require('./js/module/StorageModule')
var FSModule = require('./js/module/FSModule')
var LogicData = require('./js/LogicData')
var MainPage = require('./js/view/MainPage')
var AskForRestartPage = require('./js/view/AskForRestartPage')

var GUIDE_SLIDES = [
	require('./images/Guide-page01.png'),
	require('./images/Guide-page02.png'),
	require('./images/Guide-page03.png'),
];
var GUIDE_VERSION = {version: 1}

var LOADING_PHASE = 'loading'
var GUIDE_PHASE = 'guide'
var MAIN_PAGE_PHASE = 'mainPage'
var AppNavigator = React.createClass({

	mixins: [TimerMixin],

	getInitialState: function() {
		return {
			startUpPhase: LOADING_PHASE,
			showAskForRestart: false,
			updateDescription: '',
			updateHash: '',
		};
	},

	componentDidMount: function() {
		if (isFirstTime) {
			markSuccess()
		}

		UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
		StorageModule.loadUserData()
			.then((value) => {
				if (value !== null) {
					LogicData.setUserData(JSON.parse(value))
				}
				this.checkUpdate()

				StorageModule.loadGuide()
				.then((value) => {
					var guideData = JSON.parse(value)
					var nextPhase = GUIDE_PHASE
					if (guideData && guideData.version == GUIDE_VERSION.version) {
						nextPhase = MAIN_PAGE_PHASE
					}
					this.setTimeout(
						() => {
							LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
							this.setState({
								startUpPhase: nextPhase,
							})
						 },
						200
					);
				})
				.done()
			})
			.done()

		StorageModule.loadOwnStocksData().then((value) => {
				if (value !== null) {
					LogicData.setOwnStocksData(JSON.parse(value))
				}
			})
			.done()


		StorageModule.loadSearchHistory().then((value) => {
				if (value !== null) {
					LogicData.setSearchStockHistory(JSON.parse(value))
				}
			})
			.done()
	},

	enterMainPage: function() {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		this.setState({
			startUpPhase: MAIN_PAGE_PHASE,
		})
		StorageModule.setGuide(JSON.stringify(GUIDE_VERSION))
	},

	checkUpdate: function() {
		checkUpdate(appKey).then(info => {
			if (info.expired) {
				// TODO redirect to App store to update.
				// Alert.alert('提示', '您的应用版本已更新,请前往应用商店下载新的版本', [
				// 	{text: '确定', onPress: ()=>{info.downloadUrl && Linking.openURL(info.downloadUrl)}},
				// ]);
			} else if (info.upToDate) {
				// Do nothing as the version is up-to-date.
			} else {
				var description = info.description.replace(/\\n/g, '\n')
				this.setState({
					updateDescription: description,
				})
				this.doUpdate(info)
			}
		}).catch(err => {
			// Do nothing.
		});
	},

	doUpdate: function(info) {
		downloadUpdate(info).then(hash => {
			this.setState({
				showAskForRestart: true,
				updateHash: hash,
			})
		}).catch(err => {
			// TODO upload log for update failed.
		});
	},

	closeAskForRestartDialog: function() {
		this.setState({
			showAskForRestart: false,
		})
	},

	renderAskForRestart: function() {
		if (this.state.showAskForRestart) {
			return (
				<AskForRestartPage
					updateDescription={this.state.updateDescription}
					updateHash={this.state.updateHash}
					closeCallback={this.closeAskForRestartDialog}/>
			)
		}
	},

	render: function() {
		var {height, width} = Dimensions.get('window')
		var statusBar = <StatusBar barStyle="light-content"/>

		if (this.state.startUpPhase == MAIN_PAGE_PHASE) {
			return (
				<View style={styles.container}>
					{statusBar}
					<MainPage />
					{this.renderAskForRestart()}
				</View>
			)
		} else if (this.state.startUpPhase == GUIDE_PHASE) {
			var activeDot = <View style={styles.guideActiveDot} />
			var dot = <View style={styles.guideDot} />
			var slides = []
			for (var i = 0; i < GUIDE_SLIDES.length; i++) {
				slides.push(
					<View style={[styles.guideContainer, {height: height}]} key={i}>
						<View style={{flex: 5, justifyContent: 'flex-end'}}>
							<Image
								style={styles.guideImage}
								source={GUIDE_SLIDES[i]}/>
						</View>
						<View style={{flex: 1, justifyContent: 'flex-end'}} >
							{i == GUIDE_SLIDES.length - 1 ?
								<TouchableOpacity onPress={this.enterMainPage}>
									<View style={styles.guideEnterTextView}>
										<Text style={styles.guideEnterText}>
											点击开启
										</Text>
									</View>
								</TouchableOpacity>
								: null}
						</View>
						<View style={{flex: 1}} />
					</View>
				)
			}
			return (
				<View style={{width: width, height: height, backgroundColor: '#0079ff'}}>
					{statusBar}
					<Swiper loop={false} bounces={true} activeDot={activeDot} dot={dot}>
						{slides}
					</Swiper>
					{this.renderAskForRestart()}
				</View>
			)
		} else if (this.state.startUpPhase == LOADING_PHASE){
			if (Platform.OS === 'ios') {
				return (
					<View style={{backgroundColor: '#0665de', alignItems: 'center'}}>
						{statusBar}
						<Image
							style={[styles.image, {width: width, height: height}]}
							source={require('./images/frontPage.jpg')}/>

						{this.renderAskForRestart()}
					</View>
				);
			} else {
				return null;
			}
		}
	}
});

var styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#eaeaea',
		alignItems: 'stretch',
	},
	image: {
		resizeMode: Image.resizeMode.contain,
	},
	guideContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	guideImage: {
		height: 375,
		width: 413,
		resizeMode: Image.resizeMode.contain,
	},
	guideActiveDot: {
		backgroundColor: 'rgba(255, 255, 255, 0.8)',
		width: 8,
		height: 8,
		borderRadius: 4,
		marginLeft: 3,
		marginRight: 3,
		marginTop: 3,
		marginBottom: 20,
	},
	guideDot: {
		backgroundColor:'rgba(0,0,0,.2)',
		width: 8,
		height: 8,
		borderRadius: 4,
		marginLeft: 3,
		marginRight: 3,
		marginTop: 3,
		marginBottom: 20,
	},
	guideEnterTextView: {
		paddingHorizontal: 40,
		paddingVertical: 10,
		borderColor: 'white',
		borderWidth: 0.5,
		borderRadius: 5,
		justifyContent: 'center',
	},
	guideEnterText: {
		fontSize: 20,
		textAlign: 'center',
		color: '#ffffff',
	},
});

module.exports = AppNavigator;
