import React,{Component,PropTypes} from 'react'
import {StyleSheet,Text,View,Image,Dimensions,} from 'react-native'

var ColorConstants = require('../ColorConstants')

var {height, width} = Dimensions.get('window');


export default class Reward extends Component{

  static propTypes = {
    divideInLine: PropTypes.number,
    type:PropTypes.number,
    isNew:PropTypes.bool,
    card:PropTypes.object,
  }

  static defaultProps = {
    divideInLine: 3,
    type:1,
    isNew:false,
    card:undefined,
  }

  constructor(props){
    super(props);
  }

  getHeight(){
    return (width/this.props.divideInLine) * 1.13
  }

  getWidth(){
    return (width/this.props.divideInLine) - 11
  }

  renderBottom(){
    percentChange = this.props.card.plRate;
    percentChange = percentChange.toFixed(2)
    var color = ColorConstants.stock_color(percentChange)
    var startMark = percentChange > 0 ? "+" : null


    if(this.props.type === 1){//显示在首页的
      return(
        <View style={styles.bottom}>
        <View style={styles.lineScore}>
          <Text style = {[styles.textScore,{color:color}]}>
            {startMark} {percentChange} %
          </Text>
        </View>
        <View style={styles.lineUser}>
          <View style={styles.lineBottom1}>
            <Image
            style={styles.imgUserHead}
            // source={{uri: 'https://facebook.github.io/react/img/logo_og.png'}}>
            source={{uri:this.props.card.imgUrlSmall}}>
            </Image>
            <Text numberOfLines={1} style = {styles.textName}>
              {this.props.card.userName}
            </Text>
          </View>
          <View style={styles.lineBottom2}>
            <Image
            style={styles.imgLove}
            source={require('../../images/like_small.png') }>
            </Image>
            <Text style = {styles.textCounter}>
            {this.props.card.likes}
            </Text>
          </View>
        </View>
      </View>);
    }else if(this.props.type === 2){//显示在我的卡片

      return(
        <View style={styles.bottom}>
          <View style={styles.lineScore}>
            <Text style = {[styles.textScore,{color:color}]}>
              {startMark} {percentChange} %
            </Text>
          </View>
          <View style={styles.lineView}>
             <Text style={styles.textKind}>
               {this.props.card.stockName}
             </Text>
          </View>
      </View>);
    }
  }

  render(){
    return(
      <View style = {[styles.container,{borderWidth:this.props.card.isNew?0.5:0}]}>
        <Image
        resizeMode={'stretch'}
        style={[styles.imgReward,{width:this.getWidth(),height:this.getHeight()}]}
        // source={require('../../images/card_ag.png')}
        source={{uri: this.props.card.imgUrlMiddle}}
        >
        </Image>
        {this.renderBottom()}

      </View>
    );
  }

}


const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:'#faf8f8',
		borderWidth:1,
		borderRadius:5,
		borderColor:'#699fff'
  },

  imgReward:{
    height:120,
    // borderRadius:5,
  },

  imgUserHead:{
    width:24,
    height:24,
    borderRadius:12,
    marginLeft:5,
    borderWidth:1.5,
    borderColor:'#f3e3d3',
  },

  imgLove:{
    width:10,
    height:10,
  },

  lineScore:{
    flexDirection:'row',
    marginTop:2,
    marginBottom:2,
    alignItems:'center',
    justifyContent:'center',
  },

  lineUser:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between'
  },

  lineBottom1:{
    flex:2,
     flexDirection:'row',
     alignItems:'center',
     justifyContent:'flex-start',

  },

  lineBottom2:{
    flex:1,
     flexDirection:'row',
     alignItems:'center',
     justifyContent:'flex-end',
     marginRight:10,
  },

  textScore:{
    fontSize:14,
    color:'#fd5e3b',
    alignItems:'center',
  },

  textCounter:{
    fontSize:10,
    marginLeft:2,
    color:'#cfcfd6',
  },

  textName:{
    flex:1,
    fontSize:12,
    marginLeft:2,
    color:'#cccccc',
  },

  bottom:{
    flex:1,
    justifyContent:'center',

  },

  lineView:{
    flex:1,
    alignItems:'center',
  },

  textKind:{
    color:'#cccccc',
    marginTop:-2,
  }
});


module.exports = Reward;
