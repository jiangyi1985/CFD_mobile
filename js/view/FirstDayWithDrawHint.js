/* @flow */

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
	StyleSheet,
	View,
	Text,
	ScrollView,
	Dimensions,
	Image,
	Animated,
	TouchableOpacity,
  Modal,
} from 'react-native';

var {height, width} = Dimensions.get('window');
var ColorConstants = require("../ColorConstants")
var NetConstants = require("../NetConstants")
var TalkingdataModule = require("../module/TalkingdataModule")
var NetworkModule = require("../module/NetworkModule")
var top_image = require("../../images/register_success.png")
var MainPage = require("./MainPage")
var DIALOG_WIDTH = width - 30;
var DIALOG_HEIGHT = DIALOG_WIDTH / 1.5;
var HEADER_IMAGE_WIDTH = DIALOG_WIDTH;
var HEADER_IMAGE_HEIGHT = HEADER_IMAGE_WIDTH / 1.5;
var DIALOG_OFFSET = HEADER_IMAGE_HEIGHT / 2;

var LogicData = require('../LogicData')

class FirstDayWithDrawHint extends React.Component {
  static propTypes = {
      getNavigator: PropTypes.func,
  };

  static defaultProps = {
      getNavigator: ()=>{},
  };

  state = {
    dialogVisible: false,
    fadeAnim: new Animated.Value(1),
          modalVisible: false,
  };

  show = () => {
    this.setState({
      dialogVisible: true,
    })

		Animated.timing(       // Uses easing functions
			this.state.fadeAnim, // The value to drive
			{
				toValue: 1,        // Target
				duration: 200,    // Configuration
			},
		).start();

		this._setModalVisible(true)
  };

  hide = () => {
		console.log("hide");
		LogicData.setFirstDayWithDraw('2');
    var callbackId = this.state.fadeAnim.addListener(function(){
      if(this.state.fadeAnim._value == 0){
        this.state.fadeAnim.removeListener(callbackId)
        this.setState({
          dialogVisible: false,
					modalVisible: false,
        })
      }
    }.bind(this))
		Animated.timing(       // Uses easing functions
			this.state.fadeAnim, // The value to drive
			{
				toValue: 0,        // Target
				duration: 200,    // Configuration
			},
		).start();
		// this._setModalVisible(false);
  };

  gotoCheck = () => {
		console.log("gotocheck");
		var navigator = this.props.getNavigator();
		navigator.push({
			name: MainPage.MY_INCOME_ROUTE,
		})

  };

  _setModalVisible = (visible) => {
    this.setState({modalVisible: visible});
  };

  render() {
		console.log(this.state.dialogVisible);
		if(this.state.dialogVisible){
      //
      //style={{height: height, width: width, backgroundColor: '#fff'}}
      return (
        <Animated.View
          style={[styles.outsideContainer, {opacity: this.state.fadeAnim}]}
          >
          <TouchableOpacity style={styles.greyBackground}
            activeOpacity={1}
            onPress={() => {
              this.hide();
            }}>
            <TouchableOpacity
							style={styles.dialogContainer}
              activeOpacity={1}
              onPress={() => {
              }}>
							<View style={styles.container}>
								<View style={styles.textContainer}>
		              <Text style={styles.titleText}>
										首日入金赠金
		              </Text>
									<Text style={styles.descriptionText}>
										赠金已转入您的交易金账户
									</Text>
								</View>
	              <View style={styles.buttonContainer}>
	                <TouchableOpacity style={styles.greyButton}
	                  onPress={() => {
	                    this.hide();
	                  }}>
	                  <Text style={styles.buttonText}>
	                    知道了
	                  </Text>
	                </TouchableOpacity>
	                <TouchableOpacity style={styles.blueButton}
	                  onPress={() => {
	                    this.hide();
	                    this.gotoCheck();
	                  }}>
	                  <Text style={styles.buttonText}>
	                    立即查看
	                  </Text>
	                </TouchableOpacity>
	              </View>
							</View>
							<Image resizeMode="contain" source={top_image} style={styles.image}/>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      );
    }else{
      return (<View/>)
    }

  }
}

/*
var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  innerContainer: {
    borderRadius: 10,
    alignItems: 'center',
  },
  row: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginBottom: 20,
  },
  rowTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 5,
    flex: 1,
    height: 44,
    alignSelf: 'stretch',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: 18,
    margin: 5,
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 10,
  },
});
*/

const styles = StyleSheet.create({
  outsideContainer:{
    position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
  },
  greyBackground:{
    flex:1,
    width: width,
    height: height,
		backgroundColor: '#0000007f',
		alignItems: 'center',
		justifyContent: 'center'
  },
	dialogContainer:{
		height: DIALOG_HEIGHT + DIALOG_OFFSET,
	},
  container: {
		top: DIALOG_OFFSET,
    height: DIALOG_HEIGHT,
		width: DIALOG_WIDTH,
		borderRadius: 10,
    backgroundColor: 'white',
  },
	image:{
		position:'absolute',
		top:0,
		alignSelf:'stretch',
		height: HEADER_IMAGE_HEIGHT,
		width: HEADER_IMAGE_WIDTH,
	},
	textContainer:{
		flex: 1,
		alignItems: 'center',
		marginTop: HEADER_IMAGE_HEIGHT * 0.35,
	},
	titleText:{
		fontWeight: 'bold',
		fontSize: 20,
		color: ColorConstants.TITLE_BLUE,
	},
	descriptionText:{
		marginTop: 12,
		fontSize: 18,
	},
  buttonContainer:{
    margin: 12,
    height: 43,
    alignItems: 'stretch',
    flexDirection: 'row',
		alignSelf: 'stretch',
		justifyContent: 'space-around',
  },
  greyButton: {
    flex:1,
    backgroundColor: ColorConstants.STOCK_UNCHANGED_GRAY,
    alignItems: 'center',
		borderRadius: 5,
		justifyContent: 'center',
		//width: 151,
  },
  blueButton: {
    flex:1,
    backgroundColor: ColorConstants.TITLE_BLUE,
    marginLeft:12,
    alignItems: 'center',
  	borderRadius: 5,
		justifyContent: 'center',
		//width: 151,
  },
	buttonText: {
		color: 'white'
	}
});

module.exports = FirstDayWithDrawHint;
