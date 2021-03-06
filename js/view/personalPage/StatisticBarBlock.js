'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
var ColorConstants = require('../../ColorConstants');
var LogicData = require('../../LogicData');
var NetConstants = require('../../NetConstants');
var NetworkModule = require('../../module/NetworkModule');
var LS = require("../../LS");

var {height, width} = Dimensions.get('window');

export default class StatisticBarBlock extends Component {
  static propTypes = {
    userId: PropTypes.number,
    style: PropTypes.object,
    isStatisticPage: PropTypes.bool,
  }

  static defaultProps = {
    userId: 0,
    style: {},
    isStatisticPage: false,
  }

  constructor(props) {
    super(props);

    this.state = {
      statisticsBarInfo: [],
      statisticsSumInfo: [],
      maxBarSize: 1,
      barAnimPlayed: false,
    }
  }

  clear(){
    this.setState({
      statisticsBarInfo: [],
			statisticsSumInfo: [],
			maxBarSize: 1,
			barAnimPlayed: false,
    })
  }

  showBars(statisticsInfo){
    var initializeAnimation = false;

		var originalStatisticsInfo = []
		$.extend(true, originalStatisticsInfo, statisticsInfo)	// deep copy

		var maxBarSize = 1
		for (var i = 0; i < statisticsInfo.length; i++) {
			var barContent = statisticsInfo[i]
			if (Math.abs(maxBarSize) < Math.abs(barContent.pl)) {
				maxBarSize = Math.abs(barContent.pl)
			}
		}

		this.setState({
			maxBarSize: maxBarSize,
			statisticsBarInfo: statisticsInfo,
			statisticsSumInfo: originalStatisticsInfo,
			barAnimPlayed: true,
		}, ()=>{

		});
  }

	playStatisticsAnim(statisticsInfo) {
		var initializeAnimation = false;

		var originalStatisticsInfo = []
		$.extend(true, originalStatisticsInfo, statisticsInfo)	// deep copy

		var maxBarSize = 1
		for (var i = 0; i < statisticsInfo.length; i++) {
			var barContent = statisticsInfo[i]
			if (Math.abs(maxBarSize) < Math.abs(barContent.pl)) {
				maxBarSize = Math.abs(barContent.pl)
			}
			barContent.displayPL = barContent.pl;
			barContent.pl = 0;
			//For display...
		}

		//if(initializeAnimation){
  		this.setState({
  			maxBarSize: maxBarSize,
  			statisticsBarInfo: statisticsInfo,
  			statisticsSumInfo: originalStatisticsInfo,
  			barAnimPlayed: true,
  		});
    // , ()=>{
		// 		this.runAnimationIfNecessary(originalStatisticsInfo);
		// });
		// }else{
		// 	this.runAnimationIfNecessary(originalStatisticsInfo);
		// }
	}

	runAnimationIfNecessary(originalStatisticsInfo){
		setTimeout(() => {
				//We need to check if the layout will be changed.
				//If the profit bar won't change, we will not apply the LayoutAnimation.configureNext,
				//because it will affect the tab switch and display a wrong animation.
				var hasData = this.state.balanceData!==null;

				var sumInvest = 0
				for (var i = 0; i < this.state.statisticsSumInfo.length; i++) {
					var barContent = this.state.statisticsSumInfo[i]
					sumInvest += barContent.invest
				}
				if (hasData && sumInvest > 0) {
					var needAnimation = false;
					for(var i = 0; i < this.state.statisticsBarInfo.length; i++) {
						if(originalStatisticsInfo[i]
							&& this.state.statisticsBarInfo[i].pl !== originalStatisticsInfo[i].pl){
								var oldInvestBarFlex = Math.floor(this.state.statisticsBarInfo[i].invest / this.state.maxBarSize * 100)
								var oldProfitBarFlex = Math.floor(this.state.statisticsBarInfo[i].pl / this.state.maxBarSize * 100)
								var newInvestBarFlex = Math.floor(originalStatisticsInfo[i].invest / this.state.maxBarSize * 100)
								var newProfitBarFlex = Math.floor(originalStatisticsInfo[i].pl / this.state.maxBarSize * 100)

								if(oldInvestBarFlex != newInvestBarFlex || oldProfitBarFlex != newProfitBarFlex){
									needAnimation = true;
									break;
								}
						}
					}

					if(needAnimation){
						console.log("anim started");
						LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
					}
				}
				this.setState({
					statisticsBarInfo: originalStatisticsInfo,
					barAnimPlayed: true,
				});

			},
			100
		);
	}

	refresh(staticBarBlock) {

    this.setState({
      statisticsBarInfo: [],
      statisticsSumInfo: [],
      isPrivate: staticBarBlock==undefined?false:staticBarBlock.isPrivate,
    }, ()=>{
      if(!this.state.isPrivate){
        this.loadData();
      }else{
        //No need to load private data.
      }
    })

	}

  loadData(){
    var userData = LogicData.getUserData()
  	var url = '';
    // if(this.props.isStatisticPage){
    //   url = NetConstants.CFD_API.GET_USER_STATISTICS_API
    //   if(LogicData.getAccountState()){
    // 		url = NetConstants.CFD_API.GET_USER_STATISTICS_LIVE_API
    // 		console.log('live', url );
    // 	}
    // }
    // else{
    if(!LogicData.getAccountState()){
      url = NetConstants.CFD_API.GET_USER_STATISTICS_API;
    }else{
      //Always use the same api
      url = NetConstants.CFD_API.GET_OTHER_USER_STATISTICS_API;
      url = url.replace('<userID>', this.props.userId)
    }

    //}

  	NetworkModule.fetchTHUrl(
  		url,
  		{
  			method: 'GET',
  			headers: {
          'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
        },
  			cache: 'offline',
  		},
  		(responseJson) => {
        console.log("playStatisticsAnim " + JSON.stringify(responseJson))
  			this.showBars(responseJson);
  		},
  		(result) => {
  			if(NetConstants.AUTH_ERROR === result.errorMessage){

  			}else{
  				// Alert.alert('', errorMessage);
  			}
  		}
  	)
  }


  render() {
    return (
      <View style={[styles.container, this.props.style]}>
        {this.renderBody()}
        {this.renderChart()}
      </View>
    );
  }

  renderBody() {
    if(LogicData.getAccountState() == true) {
      return null;
    }
		var sumPl = '--'
		var sumInvest = '--'
		var avgPlRate = '--'
		if (this.state.statisticsSumInfo.length > 0) {
      var invest = 0;
			sumPl = 0
			for (var i = 0; i < this.state.statisticsSumInfo.length; i++) {
				var barContent = this.state.statisticsSumInfo[i]
				sumPl += barContent.pl
				invest += barContent.invest
			}

			avgPlRate = (invest > 0) ? sumPl / invest * 100: 0
      sumInvest = invest.toFixed(2)
			sumPl = sumPl.toFixed(2)
			avgPlRate = avgPlRate.toFixed(2)
		}
		return (
			<View style={styles.center}>
        <View style={styles.centerView}>
          <View style={styles.empty}/>
          <Text style={styles.centerText1}>{LS.str("STATISTIC_LATEST_MONTH_INCOME")}</Text>
          <Text style={[styles.centerText2,{color:LogicData.getAccountState()?'#85b1fb':'#1962dd'}]}>{sumPl}</Text>
          <View style={styles.empty}/>
        </View>
        <View style={styles.centerView}>
          <View style={styles.empty}/>
          <Text style={styles.centerText1}>{LS.str("STATISTIC_LATEST_MONTH_CAPITAL")}</Text>
          <Text style={[styles.centerText2,{color:LogicData.getAccountState()?'#85b1fb':'#1962dd'}]}>{sumInvest}</Text>
          <View style={styles.empty}/>
        </View>
        <View style={styles.centerView}>
          <View style={styles.empty}/>
          <Text style={styles.centerText1}>{LS.str("STATISTIC_LATEST_MONTH_INCOME_PERCENT")}</Text>
          <Text style={[styles.centerText2,{color:LogicData.getAccountState()?'#85b1fb':'#1962dd'}]}>{avgPlRate}%</Text>
          <View style={styles.empty}/>
        </View>
			</View>
		)
	}

  renderBars() {
		var bars = this.state.statisticsBarInfo.map(
			(barContent, i) => {
				var investBarFlex = Math.floor(barContent.invest / this.state.maxBarSize * 100)
				var profitBarFlex = Math.floor(barContent.pl / this.state.maxBarSize * 100)
				var profitBarStyle = barContent.pl > 0 ? styles.positiveProfitBar : styles.negtiveProfitBar
				if (barContent.pl < 0) {
					profitBarFlex *= -1
					//investBarFlex -= profitBarFlex
				}else if (barContent.pl == 0){
					profitBarStyle = {flex: 1};
				}
        if(profitBarFlex == 0){
					profitBarFlex = 1;
				}
        return (
					<View key={i} style={{flexDirection:'row', flex:1, justifyContent:'center'}}>
						<View style={[{flex: profitBarFlex}, styles.profitBar, profitBarStyle]} />
						<View style={{flex: 100 - profitBarFlex}} />
					</View>
				)
			}
		)
		return (
			<View style={[styles.barContainer, {flexDirection:'column'}]}>
				{bars}
			</View>
		);
	}

	renderChartHeader() {
    var sumPl = ''
    var proFitStyle = styles.plValueTextZero;
    if(this.state.isPrivate){
      sumPl = "***";
      proFitStyle = styles.chartHeaderText1;
    }else{
      if (LogicData.getAccountState()){
        sumPl = 0;
        if(this.state.statisticsSumInfo.length > 0) {
          sumPl = 0
          for (var i = 0; i < this.state.statisticsSumInfo.length; i++) {
            var barContent = this.state.statisticsSumInfo[i]
            sumPl += barContent.pl
          }

          sumPl = sumPl.toFixed(2)

          if(sumPl>0){
            sumPl = "+" + sumPl;
            proFitStyle = styles.plValueTextPositive;
          }else if(sumPl<0){
            proFitStyle = styles.plValueTextNegative;
          }
        }
      }
    }

		return (
			<View style={styles.chartHeader}>
				<View style={styles.centerView2}>
					<Text style={styles.chartHeaderText1}>{ (LogicData.getAccountState() ? LS.str("STATISTIC_TOTAL_INCOME") : LS.str("STATISTIC_PROFIT_AND_LOSS")) + "："}
            <Text style={proFitStyle}>{sumPl}</Text>
          </Text>
				</View>
				<View style={styles.chartHeaderRightPart}>
					<View style={styles.redSquare}/>
					<Text style={styles.chartHeaderText2}>{LS.str("STATISTIC_PROFIT")}</Text>
					<View style={styles.greenSquare}/>
					<Text style={styles.chartHeaderText2}>{LS.str("STATISTIC_LOSS")}</Text>
				</View>
			</View>
		)
	}

	renderChart() {
    if(this.state.isPrivate){
      return (
      <View style={styles.chart}>
        {this.renderChartHeader()}
        <View style={styles.separator}/>
        <View style={styles.emptyView}>
          <Text style={styles.loadingText}>{LS.str("YHWGKSJ")}</Text>
        </View>
      </View>);
    }else{
  		var hasData = this.state.balanceData!==null

  		var sumInvest = 0
  		for (var i = 0; i < this.state.statisticsSumInfo.length; i++) {
  			var barContent = this.state.statisticsSumInfo[i]
  			sumInvest += barContent.invest
  		}
  		if (hasData && sumInvest > 0) {
  			return (
  				<View style={styles.chart}>
  					{this.renderChartHeader()}
  					<View style={styles.separator}/>
  					{this.renderLineChart()}
  				</View>
  			)
  		}
  		else {
  			return (
          <View style={styles.chart}>
  					{this.renderChartHeader()}
  					<View style={styles.separator}/>
            <View style={styles.emptyView}>
    					<Text style={styles.loadingText}>{LS.str("STATISTIC_NO_DATA")}</Text>
    				</View>
  				</View>
  			)
  		}
    }
	}

	renderLineChart(){
		var barNameText = this.state.statisticsBarInfo.map(
			(barContent, i) =>
				<View key={i} style={{flex: 1, flexDirection:'column', alignItems:'center', justifyContent: 'center'}}>
					<Text style={styles.barNameText}>
						{barContent.name}
					</Text>
				</View>
		)
		var plText = this.state.statisticsBarInfo.map(
			(barContent, i) =>{
				var valueStyle = null;
				var valueText = "";
        if(barContent.invest > 0){
					var pl = barContent.pl;//.toFixed(2);
					if(barContent.displayPL){
						pl = barContent.displayPL;//.toFixed(2);
					}

					if(this.state.maxBarSize >= 100){
						pl = Math.round(pl)
					}else{
						pl = pl.toFixed(2);
					}

					if(pl == 0){
						valueStyle = styles.plValueTextZero;
						valueText = pl;
					}else if(pl > 0){
						valueStyle = styles.plValueTextPositive;
						valueText = "+" + pl;
					}else{
						valueStyle = styles.plValueTextNegative;
						valueText = pl;
					}
				}
				//displayPL
					return (
						<View key={i} style={{flex: 1, flexDirection:'column', alignItems:'flex-end', justifyContent: 'center'}}>
							<Text style={[styles.plValueText, valueStyle]}>
								{valueText}
							</Text>
						</View>
					);
				}
		)
    var viewWidth = Math.round(width/7*4);
		return (
			<View style={{flexDirection:'row', flex: 1, paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20}}>
				<View style={styles.barNamesContainer}>
					{barNameText}
				</View>
				{/* <View style={[styles.verticleSeparator,]}/> */}
				<View style={[{width: viewWidth}]}>
					{this.renderBars()}
				</View>
				<View style={styles.plValue}>
					{plText}
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
  container: {
  },

	center: {
    height: height / 8,
		backgroundColor: '#eff5ff',
		flexDirection: 'row',
	},

  centerView: {
		flex: 1,
		justifyContent: 'space-around',
		alignItems:'center'
	},

	centerView2: {
		flex: 1,
		paddingLeft: 15,
		justifyContent: 'space-around',
	},

  centerText1: {
		fontSize: 10,
		color: '#8a95a5',
	},

  centerText2: {
		fontSize: 22,
		color: '#1962dd',
	},

  separator: {
    height: 0.5,
    backgroundColor: '#f2f2f2',
  },

  verticleSeparator: {
    marginTop: 15,
    marginBottom: 15,
    width: 0.5,
    backgroundColor: '#f2f2f2',
  },

	chart: {
		backgroundColor: 'white',
    height: 216
	},

	chartHeader: {
		height: 39,
		flexDirection: 'row',
	},

	chartHeaderRightPart: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		marginRight: 10,
	},

	chartHeaderText1: {
    fontSize: 15,
    color: '#474747',
  },

	chartHeaderText2: {
		fontSize: 11,
		color: '#adadad',
		marginLeft: 3,
		marginRight: 3,
	},

	emptyView: {
		flex: 2,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'space-around',
	},

	redSquare: {
		width: 10,
		height: 6,
		backgroundColor: '#f16b5f',
	},

	greenSquare: {
		width: 10,
		height: 6,
		backgroundColor: '#5fd959',
	},

	blueSquare: {
		width: 10,
		height: 6,
		backgroundColor: ColorConstants.COLOR_CUSTOM_BLUE,
	},

  plValue:{
    alignItems: 'stretch',
    flex: 1,
  },

  plValueText:{
    fontSize: 16,
  },

  plValueTextZero:{
    color: '#979797',
  },

  plValueTextPositive:{
    color: '#f16b5f',
  },

  plValueTextNegative:{
    color: '#5fd959',
  },

	barNamesContainer: {
		paddingRight: 5,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'stretch',
	},

  barNameText: {
		fontSize: 13,
		color: '#adadad',
	},

	barContainer: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'stretch',
	},

	investBar: {
		backgroundColor: ColorConstants.COLOR_CUSTOM_BLUE,
		height: 16,
	},

  profitBar:{
		borderTopRightRadius:4,
		borderBottomRightRadius:4,
    marginTop:9,
    marginBottom:9,
		alignSelf: 'stretch',
	},

	positiveProfitBar: {
		backgroundColor: '#f16b5f',
	},

	negtiveProfitBar: {
		backgroundColor: '#5fd959',
	},

	loadingText: {
		fontSize: 13,
		color: '#9f9f9f'
	},
});


module.exports = StatisticBarBlock;
