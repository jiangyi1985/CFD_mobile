'use strict';

import React from 'react';
import {
	AppRegistry,
	StyleSheet,
	Navigator,
	Platform,
	View,
	Text,
	Image,
	TouchableHighlight,
} from 'react-native';

var ColorPropType = require('ColorPropType');
var ColorConstants = require('../ColorConstants')
var UIConstants = require('../UIConstants');
var MainPage = require('./MainPage')
var WebSocketModule = require('../module/WebSocketModule');

var NavBar = React.createClass({
	propTypes: {
		showBackButton: React.PropTypes.bool,
		showSearchButton: React.PropTypes.bool,
		imageOnLeft: React.PropTypes.number,
		textOnLeft: React.PropTypes.string,
		textOnRight: React.PropTypes.string,
		imageOnRight: React.PropTypes.number,
		leftTextOnClick: React.PropTypes.func,
		rightTextOnClick: React.PropTypes.func,
		rightImageOnClick: React.PropTypes.func,
		backButtonOnClick: React.PropTypes.func,
		subTitle: React.PropTypes.string,
		subTitleStyle: Text.propTypes.style,
		backgroundColor: ColorPropType,
		rightCustomContent: React.PropTypes.func,
		barStyle: View.propTypes.style,
		titleStyle: Text.propTypes.style,
		enableRightText: React.PropTypes.bool
	},

	getDefaultProps() {
		return {
			showBackButton: false,
			showSearchButton: false,
			imageOnLeft: null,
			textOnLeft: null,
			textOnRight: null,
			imageOnRight: null,
			leftTextOnClick: null,
			rightTextOnClick: null,
			rightImageOnClick: null,
			backButtonOnClick: null,
			subTitle: null,
			backgroundColor: ColorConstants.TITLE_BLUE,
			rightCustomContent: null,
			enableRightText: true,
		}
	},


	backOnClick: function() {
		this.props.navigator.pop();
		WebSocketModule.cleanRegisteredCallbacks()
		if (this.props.backButtonOnClick) {
			this.props.backButtonOnClick()
		}
	},

	leftTextOnClick: function() {
		if (this.props.leftTextOnClick) {
			this.props.leftTextOnClick()
		}
	},

	rightTextOnClick: function() {
		if (this.props.rightTextOnClick) {
			this.props.rightTextOnClick()
		}
	},

	rightImageOnClick: function() {
		if (this.props.rightImageOnClick) {
			this.props.rightImageOnClick()
		}
	},

	searchButtonClicked: function() {
		this.props.navigator.push({
			name: MainPage.STOCK_SEARCH_ROUTE,
		});
	},

	render: function() {
		return (
			<View style={[styles.container, {backgroundColor: this.props.backgroundColor}, this.props.barStyle]} >
				<View style={styles.leftContainer}>
					{this.renderBackButton()}
					{this.renderLeftText()}
				</View>

				<View style={styles.centerContainer}>
					<Text style={[styles.title, this.props.titleStyle]}>
						{this.props.title}
					</Text>
					{this.renderSubTitle()}
				</View>

				<View style={styles.rightContainer}>
					{this.renderSearchButton()}
					{this.renderRightText()}
					{this.renderRightImage()}
					{this.renderRightCustomContent()}
				</View>
			</View>
		);
	},

	renderBackButton: function() {
		if (this.props.showBackButton) {
			var imageOnLeft = require('../../images/back.png');
			if(this.props.imageOnLeft){
				imageOnLeft = this.props.imageOnLeft;
			}

			return (
				<TouchableHighlight
					onPress={this.backOnClick}
					underlayColor={ColorConstants.TITLE_BLUE}>
					<View style={{padding: 5}}>
						<Image
							style={styles.backButton}
							source={imageOnLeft}/>
					</View>
				</TouchableHighlight>
			);
		}
	},

	renderLeftText: function() {
		if (this.props.textOnLeft !== null) {
			return (
				<TouchableHighlight
					onPress={this.leftTextOnClick}
					underlayColor={ColorConstants.TITLE_BLUE}>

					<Text style={styles.textOnLeft}>
						{this.props.textOnLeft}
					</Text>

				</TouchableHighlight>
			);
		}
	},

	renderSearchButton: function() {
		if (this.props.showSearchButton) {
			return (
				<TouchableHighlight
					onPress={this.searchButtonClicked}
					underlayColor={ColorConstants.TITLE_BLUE}>

					<Image
						style={styles.rightImage}
						source={require('../../images/search.png')}/>

				</TouchableHighlight>
			);
		}
	},

	renderRightText: function() {
		if (this.props.textOnRight !== null) {
			if(this.props.enableRightText) {
				return (
					<TouchableHighlight
						onPress={this.rightTextOnClick}
						underlayColor={ColorConstants.TITLE_BLUE}>

						<Text style={styles.textOnRight}>
							{this.props.textOnRight}
						</Text>

					</TouchableHighlight>
				);
			}
			else {
				return (
					<Text style={styles.disabledTextOnRight}>
						{this.props.textOnRight}
					</Text>
					)
			}
		}
	},

	renderRightImage: function() {
		if (this.props.imageOnRight !== null) {
			return (
				<TouchableHighlight
					onPress={this.rightImageOnClick}
					underlayColor={ColorConstants.TITLE_BLUE}>

					<Image
						style={styles.rightImage}
						source={this.props.imageOnRight}/>

				</TouchableHighlight>
			);
		}
	},

	renderSubTitle: function() {
		if (this.props.subTitle !== null) {
			return (
				<Text style={this.props.subTitleStyle}>
					{this.props.subTitle}
				</Text>
			)
		}
	},

	renderRightCustomContent: function() {
		if (this.props.rightCustomContent !== null) {
			return (
				<View>
					{this.props.rightCustomContent()}
				</View>
			);
		}
	},
});

var styles = StyleSheet.create({
	container: {
		height: UIConstants.HEADER_HEIGHT,
		backgroundColor: ColorConstants.TITLE_BLUE,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: (Platform.OS === 'ios') ? 15 : 0,
	},
	leftContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	centerContainer: {
		flex: 2,
	},
	rightContainer: {
		flex: 1,
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	backButton: {
		width: 20,
		height: 14,
		marginLeft: 10,
		resizeMode: Image.resizeMode.contain,
	},
	rightImage: {
		width: 21,
		height: 21,
		marginRight: 20,
		resizeMode: Image.resizeMode.contain,
	},
	left: {
		fontSize: 15,
		textAlign: 'center',
		color: '#ffffff',
	},
	title: {
		fontSize: 18,
		textAlign: 'center',
		color: '#ffffff',
	},
	textOnLeft: {
		fontSize: 15,
		textAlign: 'center',
		color: '#ffffff',
		marginLeft: 20,
	},
	textOnRight: {
		fontSize: 15,
		textAlign: 'center',
		color: '#ffffff',
		marginRight: 10,
	},
	disabledTextOnRight: {
		fontSize: 15,
		textAlign: 'center',
		color: '#3e86ff',
		marginRight: 10,
	},
});

module.exports = NavBar;
