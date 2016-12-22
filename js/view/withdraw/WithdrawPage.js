'use strict'

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
	Dimensions,
	ListView,
	TextInput,
	TouchableOpacity,
	Image,
	Platform,
	ScrollView,
} from 'react-native';

var NavBar = require('../NavBar');
var Button = require('../component/Button');

var CheckBoxButton = require('../component/CheckBoxButton')
var MainPage = require('../MainPage')
var LogicData = require('../../LogicData')
var ColorConstants = require('../../ColorConstants')
var TalkingdataModule = require('../../module/TalkingdataModule')
var NavBar = require('../NavBar')
// var OpenAccountRoutes = require('./OpenAccountRoutes')
// var OpenAccountUtils = require('./OpenAccountUtils')
var NetworkModule = require('../../module/NetworkModule');
var NetConstants = require('../../NetConstants');
var LogicData = require('../../LogicData');


var {height, width} = Dimensions.get('window')
var rowPadding = Math.round(18*width/375)
var fontSize = Math.round(16*width/375)

var rowTitleWidth = (width - (2 * rowPadding)) / 4;
var rowValueWidth = (width - (2 * rowPadding)) / 4 * 3;

var defaultRawData = [
		{"type": "cardEntry",},
		{"type": "withdraw", value: null},
];

export default class WithdrawPage extends Component {
  listRawData = [];
  ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 === r2 });
  constructor(props) {
	  super(props);

    this.listRawData = JSON.parse(JSON.stringify(defaultRawData));

    this.state={
      dataSource: this.ds.cloneWithRows(this.listRawData),
      cardImageUrl: 'https://cfdstorage.blob.core.chinacloudapi.cn/bank/bankofchina.jpg',
			cardBank: "中国银行",
			lastCardNumber: "1234",
      withdrawHint: "每笔出金固定费用: 15美元",
      refundableBanalce: 0,
      withdrawValueText: "",
      withdrawValue: 0,
      hasRead: true,
      withdrawChargeHint: "每笔出金费用15美元"
    }
  }

  componentDidMount(){
    var userData = LogicData.getUserData()
    if(userData.token == undefined){return}

    NetworkModule.fetchTHUrl(NetConstants.CFD_API.REFUNDABLE_BALANCE,
      {
				method: 'GET',
        headers: {
          'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
        },
			},
      (response)=>{
        this.setState({
          refundableBanalce: response
        })
      },
      (result)=>{

      });
  }

  pressHelpButton(){
    alert("help!!!")
  }

  withdrawAll(){
    var newState = {
      withdrawValueText: "" + this.state.refundableBanalce,
      withdrawValue: this.state.refundableBanalce,
    }
    console.log("withdrawAll " + JSON.stringify(newState))
    console.log("this.state.withdrawValue1" + this.state.withdrawValue);
    this.setState({
      withdrawValueText: "" + this.state.refundableBanalce,
      withdrawValue: this.state.refundableBanalce,
    }, ()=>{
      console.log("this.state.withdrawValue2" + this.state.withdrawValue);
    })
  }

  onChangeWithdrawValue(text){
    var newState = {
      withdrawValueText: this.state.withdrawValueText,
    };//{withdrawValueText: text,}
    if(text !== ""){
      var value = parseFloat(text);
      if(!isNaN(value)){
        newState.withdrawValueText = text;
        newState.withdrawValue = value;
      }
    }else{
      newState.withdrawValueText = "";
      newState.withdrawValue = 0;
    }

    console.log("newState " + JSON.stringify(newState));
    this.setState(newState);
  }

  onClickCheckbox(value){
    this.setState({
      hasRead: value
    })
  }

  isWithdrawValueAvailable(){
    if(this.state.withdrawValue > this.state.refundableBanalce){
      return false;
    }
    return true;
  }

  gotoCardInfoPage(){
    this.props.navigator.push({
      'name': MainPage.WITHDRAW_BIND_CARD_ROUTE,
      isReadOnlyMode: true,
    })
  }

  renderRow(rowData, section, rowID){
    if(rowData.type === 'cardEntry'){
      return (
        <TouchableOpacity style={[styles.rowWrapper, styles.cardRowWrapper]} onPress={()=>this.gotoCardInfoPage()}>
          <Image source={{uri: this.state.cardImageUrl}} style={{height: 55, width: 55, resizeMode: 'contain', marginRight: 15}} />
          <View style={{flexDirection: 'column', flex: 1}}>
   					<Text style={styles.bankTitle}>{this.state.cardBank}</Text>
  	        <Text style={styles.cardNumberText}>{"尾号"+this.state.lastCardNumber}</Text>
          </View>
          <Image style={styles.moreImage} source={require("../../../images/icon_arrow_right.png")} />
        </TouchableOpacity>
      );
    }else if(rowData.type === 'withdraw'){
      var withdrawValue = this.state.withdrawValueText;
      var withdrawValueError = false;
      var inputStyle = styles.normalInputText;
      var fundableValueStyle = styles.fundableValueText;
      var fundableValueText = "可出资金: " + this.state.refundableBanalce + "美元， ";
      if(!this.isWithdrawValueAvailable()){
        inputStyle = styles.errorInputText;
        fundableValueStyle = styles.errorInputText;
        withdrawValueError = true;
        fundableValueText = "大于可出资金: " + this.state.refundableBanalce + "美元， ";
      }

      return (
        <View style={[styles.rowWrapper, styles.depositRowWrapper]}>
 					<Text style={{fontSize: 15, color: '#5a5a5a', marginTop: 18}}>出金金额</Text>
          <View style={{flexDirection: 'row', marginTop:10, alignItems:"center"}}>
   					<Text style={{fontSize: 17, fontWeight: 'bold'}}>美元</Text>
            <TextInput style={[styles.inputText, inputStyle]}
   						autoCapitalize="none"
   						autoCorrect={false}
   						defaultValue={rowData.value}
   						placeholder={rowData.hint}
   						placeholderTextColor={ColorConstants.INPUT_TEXT_PLACE_HOLDER_COLOR}
   						selectionColor={'#bfccfb'}
   						underlineColorAndroid='transparent'
              value={withdrawValue}
   					  onChangeText={(text)=>this.onChangeWithdrawValue(text)}
              keyboardType={"numeric"}
              //  onChange={(text)=>this.ontextInputChange(text, rowID)}
   						/>
          </View>
          <View style={styles.line} key={rowID}>
            <View style={styles.separator}/>
          </View>
          <View style={{height:38, flexDirection: 'row', marginTop: 13,}}>
        		<Text style={fundableValueStyle}>{fundableValueText}</Text>
            <TouchableOpacity onPress={()=>this.withdrawAll()}>
              <Text style={{fontSize: 14, color: '#415a86', }}>
                全部出金
                <Text style={{color: 'transparent'}}>
                  0
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
 				</View>
      )
    }
  }

  renderSeparator(rowData, section, rowID){
    if(rowData.type === 'cardEntry'){
      return(
        <View style={styles.bigSeparator} key={rowID}>
          <View style={styles.separator}/>
        </View>
      )
    }else if(rowData.type === 'withdraw'){
      return(
        <View style={styles.line} key={rowID}>
          <View style={styles.separator}/>
        </View>
      )
    }
  }

  renderListView(){
		var listDataView = this.listRawData.map((data, i)=>{
			return(
				<View key={i} style={{marginTop: 10}}>
					{this.renderRow(data, 's1', i)}
					{this.renderSeparator(data, 's1', i, false)}
				</View>
			);
		})

		return (
			<View>
				{listDataView}
			</View>);
	}

  gotoNext(){

  }

  render() {
		var nextEnabled = true;//OpenAccountUtils.canGoNext(this.listRawData);
		//console.log("listRawData: " + JSON.stringify(listRawData));
		if(!this.state.withdrawValue || !this.isWithdrawValueAvailable()){
      nextEnabled = false;
    }else if(!this.state.hasRead){
      nextEnabled = false;
    }

    return (
			<View style={styles.wrapper}>
        <NavBar title="出金"
          showBackButton={true}
          navigator={this.props.navigator}
          imageOnRight={require('../../../images/icon_question.png')}
          rightImageOnClick={()=>this.pressHelpButton()}
          />
				<ScrollView style={styles.list}>
					{this.renderListView()}
				</ScrollView>

        <View style={styles.checkboxView}>
          <CheckBoxButton
            defaultSelected={this.state.hasRead}
            onPress={(value)=>{this.onClickCheckbox(value)}}
            selectedIcon={require('../../../images/check_selected.png')}
            unSelectedIcon={require('../../../images/check_unselected.png')}>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.readMeText}>
                我已阅读并同意
                <Text style={{color: 'transparent',}}>0</Text>
              </Text>
              <TouchableOpacity onPress={()=>this.showWithdrawDocument()}>
                <Text style={styles.documentText}>
                出金协议内容
                <Text style={{color: 'transparent',}}>0</Text>
                </Text>
              </TouchableOpacity>
              <Text style={styles.readMeText}>{this.state.withdrawChargeHint}</Text>
            </View>
          </CheckBoxButton>
        </View>

				<View style={styles.bottomArea}>
					<Button style={styles.buttonArea}
						enabled={this.state.validateInProgress ? false : nextEnabled}
						onPress={()=>this.gotoNext()}
						textContainerStyle={styles.buttonView}
						textStyle={styles.buttonText}
						text={this.state.validateInProgress? "信息正在检查中...": '3天内到账，确认出金'} />
				</View>
			</View>
		);
  }
}

const styles = StyleSheet.create({
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
		backgroundColor: '#ffffff',
	},
  cardRowWrapper: {
    height: 60
  },
  depositRowWrapper:{
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  bigSeparator: {
    marginLeft: 0,
    marginBottom: 0,
		height: 0.5,
		backgroundColor: ColorConstants.SEPARATOR_GRAY,
  },
	rowTitle:{
		fontSize: fontSize,
		color: ColorConstants.INPUT_TEXT_COLOR,
		width:rowTitleWidth,
	},
	valueText: {
		fontSize: 30,
		color: ColorConstants.INPUT_TEXT_COLOR,
		flex: 1,
		alignItems:'center',
		justifyContent:'center',
		marginLeft:0,
		paddingLeft:0
	},
	centerText: {
		fontSize: fontSize,
		color: ColorConstants.INPUT_TEXT_COLOR,
		alignItems:'center',
		justifyContent:'center',
		margin: 0,
	},
	valueContent:{
		flex: 1,
		flexDirection: 'row',
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
		backgroundColor: ColorConstants.TITLE_DARK_BLUE,
		justifyContent: 'center',
	},
	buttonText: {
		fontSize: 17,
		textAlign: 'center',
		color: '#ffffff',
	},
	moreImage: {
		alignSelf: 'center',
		width: 7.5,
		height: 12.5,
	},
  bankTitle: {
    fontSize: 17,
    fontWeight: 'bold'
  },
  cardNumberText: {
    fontSize: 17,
    color: '#5a5a5a',
    marginTop: 5,
  },
  bottomHintText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    color: '#415a87',
  },
  inputText:{
    fontSize: 50,
    color: '#000000',
    flex: 1,
    alignItems:'center',
    justifyContent:'center',
    marginLeft:10,
    paddingLeft:0,
    height: 80
  },
  normalInputText: {
    color: '#000000',
  },
  fundableValueText: {
    color: '#747474',
  },
  errorInputText: {
    color: '#d71a18',
  },
	checkboxView: {
		height: 30,
		paddingLeft: 15,
		paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
	},
  checkbox: {
    width: 20,
    flex: 0,
  },
  readMeText:{
    fontSize: 12,
    color: '#858585',
  },
  documentText:{
    fontSize: 12,
    color: '#ff6666',
  }
});

module.exports = WithdrawPage;