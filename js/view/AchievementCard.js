'use strict'

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';

var LogicData = require('../LogicData');
var {height, width} = Dimensions.get('window');
var WaitingRing = require('./component/WaitingRing');

export default class AchievementCard extends Component {
  static propTypes = {
    showReward: PropTypes.bool,
    card: PropTypes.object,
    width: PropTypes.number,
  }

  static defaultProps = {
    showReward: true,
    cardInfo: null,
    width: width - 20
  }

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
    }
  }

  onLoad(){
    this.setState({
      loading: false,
    })
  }

  // renderReward(){
  //   if(this.props.showReward && this.props.card.reward){
  //     var rewardImage ;
  //     switch(this.props.card.reward){
  //       case 1:
  //       rewardImage = require('../../images/achievement_income_1.png');
  //       break;
  //       case 2:
  //       rewardImage = require('../../images/achievement_income_2.png');
  //       break;
  //       case 3:
  //       rewardImage = require('../../images/achievement_income_3.png');
  //       break;
  //     }
  //
  //     return(
  //       <View style={styles.rewardBar}>
  //         <Image style={styles.rewardImage}
  //           source={rewardImage}></Image>
  //       </View>
  //    )
  //  }else{
  //    return null;
  //  }
  // }

  renderWaitingRing(){
    if(this.state.loading){
      return(
        <View style={{position:'absolute', top:0, bottom:0, left:0, right: 0, alignItems: 'center', justifyContent:'center'}}>
          <WaitingRing color="white"/>
        </View>
      )
    }else{
      return(
        <View></View>
      )
    }
  }

  render() {
    var imageHeight = this.props.width / 530 * 496;

    /* {this.renderReward()} */
    if(this.props.card){
      var source = null;
      source = {uri: this.props.card.imgUrlBig}

      // if(LogicData.getDebugStatus()){
      //   //Use Temp image for now.
      //   if(this.props.card.imgUrlBig.contains("blue_big.jpg")){
      //     source = require('../../images/card_content.gif')
      //   }
      //   else if(this.props.card.imgUrlBig.contains("brozne_large_20170306.png")){
      //     source = require('../../images/card_content_2.gif')
      //   }
      //   else if(this.props.card.imgUrlBig.contains("silver_big_20170306.png")){
      //     source = require('../../images/card_content_4.gif')
      //   }
      // }
      //source = require('../../images/blue_big.jpg');
      var imgStyle = [styles.cardImage, {width: this.props.width, height: imageHeight,}];
      return (
        <View style={[styles.container, this.props.style]}>
          <Image style={imgStyle} source={source} onLoad={()=>this.onLoad()} />
          {this.renderWaitingRing()}
        </View>
      );
    }else{
      return (<View/>)
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardImage:{
    padding: 0,
//    borderTopLeftRadius: 4,
//    borderTopRightRadius: 4,
    borderWidth: 0,
    resizeMode: "stretch",
  },

  rewardImage: {
    height: 23,
    width: 163
  },

  rewardBar: {
    position: 'absolute',
    bottom: 20,
    left:0,
    right: 0,
    alignItems:'center',
  },
});

module.exports = AchievementCard;
