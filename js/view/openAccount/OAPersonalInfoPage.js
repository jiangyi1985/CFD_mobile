'use strict';

import React from 'react';
import {
	StyleSheet,
	View,
	Dimensions,
	ListView,
	Text,
	TextInput,
} from 'react-native';

var Button = require('../component/Button')
var MainPage = require('../MainPage')
var LogicData = require('../../LogicData')
var ColorConstants = require('../../ColorConstants')
var TalkingdataModule = require('../../module/TalkingdataModule')
var OpenAccountRoutes = require('./OpenAccountRoutes')
var OpenAccountUtils = require('./OpenAccountUtils')
var ErrorBar = require('./ErrorBar')

var {height, width} = Dimensions.get('window')
var rowPadding = Math.round(18*width/375)
var fontSize = Math.round(16*width/375)
var listRawData = [
		{"title":"姓名", "key": "realName", "value":""},	//TODO: add ignoreInRegistery when API is avaliable.
		{"title":"性别", "key": "gender", "value":""},
		{"title":"出生日期", "key": "birthday", "value":""},
		{"title":"民族", "key": "ethnic", "value":""},
		{"title":"身份证号", "key": "idCode", "value":""},
		{"title":"证件地址", "key": "addr", "value":"", maxLine: 2},
		{"title":"签发机关", "key": "issueAuth", "value":""},
		{"title":"有效期限", "key": "validPeriod", "value":""}];
var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 === r2 });

var OAPersonalInfoPage = React.createClass({
	propTypes: {
		data: React.PropTypes.array,
		onPop: React.PropTypes.func,
	},

	getDefaultProps() {
		return {
			data: null,
			onPop: ()=>{},
		}
	},

	getInitialState: function() {
		if (this.props.data && this.props.data) {
			OpenAccountUtils.getPageListRawDataFromData(listRawData, this.props.data);
		}
		return {
			dataSource: ds.cloneWithRows(listRawData),
			validateInProgress: false,
			//error: "error!"
		};
	},

	gotoNext: function() {
		//TODO: GZT validation.
		this.setState({
			validateInProgress: true,
		})
		TalkingdataModule.trackEvent(TalkingdataModule.LIVE_OPEN_ACCOUNT_STEP3, TalkingdataModule.LABEL_OPEN_ACCOUNT);
		OpenAccountRoutes.goToNextRoute(this.props.navigator, this.getData(), this.props.onPop);
	},

	getData: function(){
		return OpenAccountUtils.getDataFromPageListRawData(listRawData);
	},

	textInputChange: function(text, rowID) {
		listRawData[rowID].value = text;
		this.updateList();
	},

	updateList: function(){
		this.setState({
				dataSource: ds.cloneWithRows(listRawData),
		});
	},

	renderRow: function(rowData, sectionID, rowID) {
		var numberOfLines = 1;
		var multiline = false;
		var style = styles.rowWrapper;
		if(rowData.maxLine && rowData.maxLine > 1){
			multiline = true;
			numberOfLines = rowData.maxLine;
			style = styles.multilineRowWrapper;
		}
		return (
			<View style={style}>
				<Text style={styles.rowTitle}>{rowData.title}</Text>
				<TextInput style={styles.valueText}
					autoCapitalize="none"
					autoCorrect={false}
					defaultValue={rowData.value}
					multiline={multiline}
					numberOfLines={numberOfLines}
					onChangeText={(text)=>this.textInputChange(text, rowID)}
					/>
			</View>
			)
	},

	renderSeparator: function(sectionID, rowID, adjacentRowHighlighted){
		return (
			<View style={styles.line} key={rowID}>
				<View style={styles.separator}/>
			</View>
			)
	},

	render: function() {
		var nextEnabled = OpenAccountUtils.canGoNext(listRawData);

		return (
			<View style={styles.wrapper}>
				<ErrorBar error={this.state.error}/>
		    <ListView
		    	style={styles.list}
					dataSource={this.state.dataSource}
					renderRow={this.renderRow}
					renderSeparator={this.renderSeparator} />
				<View style={styles.bottomArea}>
					<Button style={styles.buttonArea}
						enabled={nextEnabled}
						onPress={this.gotoNext}
						textContainerStyle={styles.buttonView}
						textStyle={styles.buttonText}
						text={this.state.validateInProgress? "信息正在检查中...": '下一步'} />
				</View>
			</View>
		);
	},
});

var styles = StyleSheet.create({
	wrapper: {
		flex: 1,
   		alignItems: 'stretch',
    	justifyContent: 'space-around',
		backgroundColor: ColorConstants.BACKGROUND_GREY,
	},

	list: {
		flex: 1,
	},
	rowWrapper: {
		flexDirection: 'row',
		alignSelf: 'stretch',
		alignItems: 'center',
		paddingLeft: 15,
		paddingRight: 15,
		paddingBottom: rowPadding,
		paddingTop: rowPadding,
		backgroundColor: '#ffffff',
	},
	multilineRowWrapper: {
		flexDirection: 'row',
		alignSelf: 'stretch',
		alignItems: 'center',
		paddingLeft: 15,
		paddingRight: 15,
		paddingBottom: rowPadding,
		paddingTop: rowPadding,
		backgroundColor: '#ffffff',
	},
	line: {
		height: 0.5,
		backgroundColor: 'white',
	},
	separator: {
		marginLeft: 0,
		height: 0.5,
		backgroundColor: ColorConstants.SEPARATOR_GRAY,
	},
	rowTitle:{
		fontSize: fontSize,
		color: '#333333',
		flex: 1,
	},
	valueText: {
		fontSize: fontSize,
		color: '#333333',
		flex: 3,
		marginTop: -rowPadding,
		marginBottom: -rowPadding,
	},

	bottomArea: {
		height: 72,
		backgroundColor: 'white',
		alignItems: 'flex-end',
		flexDirection:'row'
	},
	buttonArea: {
		flex: 1,
		marginLeft: 15,
		marginRight: 15,
		marginBottom: 16,
		borderRadius: 3,
	},
	buttonView: {
		height: 40,
		borderRadius: 3,
		backgroundColor: '#4567a4',
		justifyContent: 'center',
	},
	buttonText: {
		fontSize: 17,
		textAlign: 'center',
		color: '#ffffff',
	},
});


module.exports = OAPersonalInfoPage;
