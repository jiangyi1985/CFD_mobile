'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
	StyleSheet,
	View,
	TouchableOpacity,
	Image,
	Text,
	Dimensions,
	Alert,
	InteractionManager,
	TextInput,
	ScrollView,
	Keyboard,
	ListView,
} from 'react-native';

var ImagePicker = require('react-native-image-picker');

var LogicData = require('../../LogicData')
var Button = require('../component/Button')
var MainPage = require('../MainPage')
var ColorConstants = require('../../ColorConstants')
var NetConstants = require('../../NetConstants');
var NetworkModule = require('../../module/NetworkModule')
var OpenAccountRoutes = require('./OpenAccountRoutes')
var ErrorBar = require('../component/ErrorBar')
var OpenAccountHintBlock = require('./OpenAccountHintBlock')
var UIConstants = require('../../UIConstants')
var TalkingdataModule = require('../../module/TalkingdataModule')
var LS = require('../../LS');

// var OpenAccountUtils = require('./OpenAccountUtils')
var {height, width} = Dimensions.get('window')

const imageWidth = Math.round(width * 0.85)
const imageHeight = Math.round(height * 0.3)

var SCROLL_VIEW = "scrollView";
// const GZT_Ayondo_Key_Mappings = [
// 	{"GZTKey": "real_name", "AyondoKey": "realName"},
// 	{"GZTKey": "gender", "AyondoKey": "gender"},
// 	{"GZTKey": "ethnic", "AyondoKey": "ethnic"},
// 	{"GZTKey": "id_code", "AyondoKey": "idCode"},
// 	{"GZTKey": "addr", "AyondoKey": "addr"},
// 	{"GZTKey": "issue_authority", "AyondoKey": "issueAuth"},
// 	{"GZTKey": "valid_period", "AyondoKey": "validPeriod"},
// ];

var ADDRESS_FILE_TYPE_PICKER_HEIGHT = 55;
var TOP_HINT_BAR_HEIGHT = 36;

var PhotoTypeMapping = [
	{"value": 'HuKou', "displayText": "OPEN_ACCOUNT_HUKOU", "imageHint": ["OPEN_ACCOUNT_HUKOU_HINT_1", "OPEN_ACCOUNT_HUKOU_HINT_2"]},
	{"value": 'JuZhuZheng', "displayText": "OPEN_ACCOUNT_JUZHUZHENG", "imageHint": ["OPEN_ACCOUNT_JUZHUZHENG_HINT"]},
	{"value": 'House', "displayText": "OPEN_ACCOUNT_DEED", "imageHint": ["OPEN_ACCOUNT_DEED_HINT"]},
	{"value": 'DriveLincense', "displayText": "OPEN_ACCOUNT_DRIVE_LICENSE", "imageHint": ["OPEN_ACCOUNT_DRIVE_LICENSE_HINT"]},
	{"value": 'Internet', "displayText": "OPEN_ACCOUNT_BROADBAND", "imageHint": ["OPEN_ACCOUNT_BROADBAND_HINT"]},
	{"value": 'LivingFair', "displayText": "OPEN_ACCOUNT_BILLS", "imageHint": ["OPEN_ACCOUNT_BILLS_HINT"]},
	{"value": 'Phone', "displayText": "OPEN_ACCOUNT_TEL_BILLS", "imageHint": ["OPEN_ACCOUNT_TEL_BILLS_HINT"]},
	{"value": 'Bank', "displayText": "OPEN_ACCOUNT_BANK_BILLS", "imageHint": ["OPEN_ACCOUNT_BANK_BILLS_HINT"]},
];

var defaultRawData = [
	{"key":"imageType", "title":"OPEN_ACCOUNT_PROOF_OF_ADDRESS", "defaultValue":"HuKou", "value":"", "type":"choice", "choices":PhotoTypeMapping},
];

var options = {
	title: null, // specify null or empty string to remove the title

	cameraType: 'back', // 'front' or 'back'
	mediaType: 'photo', // 'photo' or 'video'
	maxWidth: imageWidth * 3, // photos only
	maxHeight: imageHeight * 3, // photos only
	aspectX: 3, // android only - aspectX:aspectY, the cropping image's ratio of width to height
	aspectY: 2, // android only - aspectX:aspectY, the cropping image's ratio of width to height
	quality: 1, // 0 to 1, photos only
	angle: 0, // android only, photos only
	allowsEditing: false, // Built in functionality to resize/reposition the image after selection
	noData: false, // photos only - disables the base64 `data` field from being generated (greatly improves performance on large photos)
	storageOptions: { // if this key is provided, the image will get saved in the documents directory on ios, and the pictures directory on android (rather than a temporary directory)
		skipBackup: true, // ios only - image will NOT be backed up to icloud
		path: 'images' // ios only - will save image at /Documents/images rather than the root
	},
	scrollEnabled: true,
};

var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

class OAAddressPhotoPage extends React.Component {
    static propTypes = {
		data: PropTypes.object,
		onPop: PropTypes.func,
	};

    static defaultProps = {
        data: null,
        onPop: ()=>{},
    };

    constructor(props) {
        super(props);
        var addressText = "";
        var uploadData = null;
        if(props.data){

			if(props.data.values){
				for(var i = 0; i < props.data.values.length; i++ ){
					if(props.data.values[i].key === "addr"){
						addressText = props.data.values[i].value;
					}
				}
			}

			if(props.data.uploadData){
				uploadData = props.data.uploadData;
			}
		}

        var rowData = defaultRawData[0];

        if(!uploadData){
			uploadData = {}
			uploadData.type = rowData.value;
			if (!uploadData.type){
				uploadData.type = rowData.defaultValue;
			}
		}
        var selectedAddressType = uploadData.type;

        this.state = {
			addressText: addressText,
			error: null,
			validateInProgress: false,
			isProcessing: false,
			showAddressFileTypeList: false,
		  rowData: rowData,
			dataSourceAddressTypeList: ds.cloneWithRows(rowData.choices),
			selectedAddressType: selectedAddressType,
			uploadData: uploadData,
		};
    }

    componentWillMount() {
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
	}

    componentWillUnmount() {
		this.keyboardDidHideListener.remove();
	}

    _keyboardDidHide = () => {
		//this.refs[SCROLL_VIEW] && this.refs[SCROLL_VIEW].scrollTo({y:0})
	};

    pressAddImage = (imageIndex, rowData) => {

		options.cancelButtonTitle = LS.str("QX")
		options.takePhotoButtonTitle = LS.str("OPEN_ACCOUNT_TAKE_PICTURE")
		options.chooseFromLibraryButtonTitle = LS.str("OPEN_ACCOUNT_LIBRARY")

		ImagePicker.showImagePicker(options, (response) => {
			console.log('Response = ', response);

			if (response.didCancel) {
				console.log('User cancelled image picker');
			}
			else if (response.error) {
				console.log('ImagePicker Error: ', response.error);
			}
			else {
				// You can display the image using either data:

				var imageList = this.state.uploadData.imageList;
				var addressText = this.state.addressText;
				if(this.state.uploadData.type != this.state.selectedAddressType){
					this.state.uploadData.type = this.state.selectedAddressType;
					imageList = [];
					addressText = "";
				}
				if (!imageList){
					imageList = [];
				}

				//Initialize the image list
				if (imageList.length == 0){
					var listLength = 1;
					for(var i = 0; i < rowData.choices.length; i++){
						if(rowData.choices[i].value === this.state.uploadData.type){
							 listLength = rowData.choices[i].imageHint.length;
							 break;
						}
					}

					for(var i = 0; i < listLength; i++) {
						imageList.push(null);
					}
				}
				imageList[imageIndex] = response.data
				this.state.uploadData.imageList = imageList;

				this.setState({
					uploadData: this.state.uploadData,
					addressText: addressText,
				});
			}
		});
	};

    gotoNext = () => {
		this.setState({
			isProcessing: true,
			validateInProgress: true,
			error: null,
		})

		//OpenAccountRoutes.goToNextRoute(this.props.navigator, this.getData(), this.props.onPop);

		if(this.hasImageData()){

			InteractionManager.runAfterInteractions(() => {
				if (this.state.uploadData != null && this.state.uploadData.imageList && this.state.uploadData.imageList.length > 0) {
					var userData = LogicData.getUserData();

					var body = {
						imageBase64: this.state.uploadData.imageList[0],
						type: this.state.selectedAddressType,
						text: 'jpg',
					};
					if(this.state.uploadData.imageList.length > 1){
						body.imageBase64II = this.state.uploadData.imageList[1]
					}

					NetworkModule.fetchTHUrl(
						NetConstants.CFD_API.UPLOAD_ADDRESS_PHOTO,
						{
							method: 'POST',
							body: JSON.stringify(body),
							headers: {
								'Authorization': 'Basic ' + userData.userId + '_' + userData.token,
								'Content-Type': 'application/json; charset=utf-8',
							},
							showLoading: true,
						},
						(responseJson) => {
							this.setState({
								isProcessing: false,
								validateInProgress: false,
							})

							if (responseJson.success) {
								// var dataList = OpenAccountUtils.getAyondoValuesFromGZTValue(responseJson);
								var trackingData = {};
								for(var i = 0; i < PhotoTypeMapping.length; i++){
									if(PhotoTypeMapping[i].value === this.state.selectedAddressType){
										trackingData[TalkingdataModule.KEY_ADDRESS_TYPE] = LS.str(PhotoTypeMapping[i].displayText);
										break;
									}
								}

								TalkingdataModule.trackEvent(TalkingdataModule.LIVE_OPEN_ACCOUNT_STEP4, TalkingdataModule.LABEL_OPEN_ACCOUNT, trackingData);
								OpenAccountRoutes.goToNextRoute(this.props.navigator, this.getData(), this.props.onPop);
							} else {
								console.log("upload address photo failed. error: " + JSON.stringify(decodeURIComponent(responseJson.message)))
								this.setState({
									error: LS.str("OPEN_ACCOUNT_UPLOAD_IMAGE_FAILED")
								});
							}
						},
						(result) => {
							this.setState({
								isProcessing: false,
								validateInProgress: false,
								error: result.errorMessage
							});
						}
					)
				} else {
					OpenAccountRoutes.goToNextRoute(this.props.navigator, this.getData(), this.props.onPop);
				}
			});
		}
	};

    getData = () => {
		var addressText = null;
		var uploadData = null;

		if(this.state.addressText !== ""){
			addressText = this.state.addressText;
		}

		if(this.hasImageData()){
			uploadData = this.state.uploadData;
		}
		console.log("uploadData: " + JSON.stringify(uploadData))
		return {
			values: [{"key":"addr","value":addressText}],
			uploadData: uploadData,
		};
	};

    textInputChange = (text) => {
		this.setState({
			addressText: text,
		})
	};

    dismissKB = () => {
		Keyboard.dismiss();
	};

    selectAddressFileType = (rowData) => {
		console.log("this.state.showAddressFileTypeList - " + this.state.showAddressFileTypeList)
		var showAddressFileTypeList = !this.state.showAddressFileTypeList;
		if (showAddressFileTypeList){
			this.refs[SCROLL_VIEW] && this.refs[SCROLL_VIEW].scrollTo({y:0})
		}
		this.setState({
			showAddressFileTypeList: showAddressFileTypeList,
			scrollEnabled: !showAddressFileTypeList,
		})
	};

    onAddressTypeSelected = (rowData) => {
		this.setState({
			showAddressFileTypeList: false,
			scrollEnabled: true,
			selectedAddressType: rowData.value,
		})
	};

    renderImagePicker = (rowData) => {
		var title = LS.str(rowData.title);
		var value = this.state.selectedAddressType;

		var imageHint = [];
		for(var i = 0; i < rowData.choices.length; i++){
			if(rowData.choices[i].value === value){
				imageHint = LS.str(rowData.choices[i].imageHint)
			}
		}

		var imageView = imageHint.map((data, i)=>{
			var view = null;
			if (this.state.uploadData.type === value && this.state.uploadData.imageList && this.state.uploadData.imageList[i]){
				var image = {uri: 'data:image/jpeg;base64,' + this.state.uploadData.imageList[i]};
				view = (<View style={styles.addImageContainer} >
					<Image style={styles.addImage} source={image}/>
				</View>)
			}else{
				var image = require('../../../images/add_photo_background.png');
				view = (<View style={styles.addImageContainer} >
					<Image style={styles.addImage} source={image}/>
					<Text style={styles.addImageText}>{imageHint[i]}</Text>
				</View>);
			}

			return(
				<TouchableOpacity key={i} style={styles.imageArea} onPress={() => this.pressAddImage(i, rowData)}>
					{view}
				</TouchableOpacity>
			);
		})
		return (
			<View style={{backgroundColor:'white', paddingBottom: 16, paddingTop: 6}}>
				{imageView}
			</View>);
	};

    renderAddressTypePicker = (rowData) => {
		var imageArrow = this.state.showAddressFileTypeList ? require('../../../images/more_up.png'):require('../../../images/more_down.png')

		var title = LS.str(rowData.title);
		var value = this.state.selectedAddressType;

		var selectedText = "";
		for(var i = 0; i < rowData.choices.length; i++){
			if(rowData.choices[i].value === value){
				selectedText = LS.str(rowData.choices[i].displayText);
			}
		}

		return (
			<View >
				<View style={styles.rowWrapper}>
					<Text style={styles.rowTitle}>{LS.str(rowData.title)}</Text>
					<TouchableOpacity activeOpacity={0.5} onPress={()=>this.selectAddressFileType()}>
						<View style = {{flexDirection:'row',alignItems:'center'}}>
							<Text style = {styles.addressTypeText}>{selectedText}</Text>
							<Image style = {styles.arrow} source={imageArrow}></Image>
						</View>
					</TouchableOpacity>
				</View>
				{this.renderSeparator()}
			</View>
		)
	};

    renderSeparator = () => {
		return (
			<View style={styles.line}>
				<View style={[styles.separator, {marginLeft: 15}]}/>
			</View>);
	};

    renderAddressTypeRow = (rowData, sectionID, rowID) => {
		return (
			<TouchableOpacity style={{width:width/5, height:30}} onPress={()=>this.onAddressTypeSelected(rowData)}>
				<Text key={rowID} style={styles.addressTypeText}>{LS.str(rowData.displayText)}</Text>
			</TouchableOpacity>)
	};

    renderAddressTypeList = () => {
		if (this.state.showAddressFileTypeList){
			return (
				<View style={{position: 'absolute', left: 0, right:0, top: TOP_HINT_BAR_HEIGHT + ADDRESS_FILE_TYPE_PICKER_HEIGHT, bottom:0,}}>
					{this.renderSeparator()}
					<View style={{backgroundColor: 'white'}}>
						<ListView
							style={styles.list}
							contentContainerStyle={styles.listAddressType}
							dataSource={this.state.dataSourceAddressTypeList}
							enableEmptySections={true}
							removeClippedSubviews={false}
							initialListSize={16}
							renderRow={(rowData, sectionID, rowID)=>this.renderAddressTypeRow(rowData, sectionID, rowID)}
							scrollEnabled={false}/>
						{/* <Text style={styles.addressTypeHint}>注意: 宽带/水电煤/固话账单/银行账单(近3月内)</Text> */}
					</View>
					{this.renderSeparator()}
					<TouchableOpacity style={{flex: 1, backgroundColor:'rgba(0,0,0,0.5)'}} onPress={this.selectAddressFileType}>

					</TouchableOpacity>
				</View>);
		}
		return null;
	};

    hasImageData = () => {
		var imageDataComplete = true;
		if (!this.state.uploadData){
			imageDataComplete = false
		}else if (this.state.uploadData.type != this.state.selectedAddressType){
			imageDataComplete = false;
		}else if(!this.state.uploadData.imageList){
			imageDataComplete = false;
		}else{
			for(var i=0; i < this.state.uploadData.imageList.length; i++){
				if(!this.state.uploadData.imageList[i]){
					imageDataComplete = false;
					break;
				}
			}
		}
		return imageDataComplete;
	};

    render() {
		var nextEnabled = this.hasImageData() && this.state.addressText!= null && this.state.addressText != "";

		var rowData = this.state.rowData;

		return (
			<View style={styles.wrapper}>
				<ErrorBar error={this.state.error}/>
				<ScrollView style={{flex:1}} ref={SCROLL_VIEW}
					scrollEnabled={this.state.scrollEnabled}>
					<View style={styles.hintBar}>
						<Text style={styles.hintText}>{LS.str("OPEN_ACCOUNT_UPLOAD_IMAGE_HINT_1")}</Text>
					</View>
					{this.renderAddressTypePicker(rowData)}
					{this.renderImagePicker(rowData)}
					<View style={styles.container}>
						<Text style={styles.hintText}>{LS.str("OPEN_ACCOUNT_UPLOAD_IMAGE_HINT_2")}</Text>
						<TextInput style={styles.inputText}
							autoCapitalize="none"
							autoCorrect={false}
							defaultValue={this.state.addressText}
							multiline={false}
							numberOfLines={3}
							maxLength={50}
							selectionColor={ColorConstants.INOUT_TEXT_SELECTION_COLOR}
							underlineColorAndroid='transparent'
							placeholder={LS.str("OPEN_ACCOUNT_IMAGE_ADDRESS_PLACEHOLDER")}
							onChangeText={(text)=>this.textInputChange(text)}
							/>
					</View>
					<OpenAccountHintBlock />
				</ScrollView>
				<View style={styles.bottomArea}>
					<Button style={styles.buttonArea}
						enabled={nextEnabled && !this.state.isProcessing}
						onPress={this.gotoNext}
						textContainerStyle={styles.buttonView}
						textStyle={styles.buttonText}
						text={this.state.validateInProgress? LS.str("VALIDATE_IN_PROGRESS"): LS.str("NEXT")} />
				</View>
				{this.renderAddressTypeList()}
			</View>);

	}
}

var styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		alignItems: 'stretch',
		backgroundColor:'#edf0f5',
	},

	container: {
		marginTop: 26,
    marginLeft: width*0.09,
    marginRight: width*0.09,
		flex: 1,
	},

	imageArea: {
		alignSelf: 'center',
		alignItems: 'center',
		marginTop: 10,
	},
	addImageContainer: {
		width: imageWidth,
		height: imageHeight,
		alignItems:'center',
	},
	addImage: {
		width: imageWidth,
		height: imageHeight,
		resizeMode: 'contain',
	},
	addImageText:{
		fontSize: 13,
		backgroundColor: 'transparent',
		color: '#bbbbbb',
		position: 'absolute',
		top: imageHeight / 380 * 290,
		left: 0,
		right: 0,
		textAlign: 'center'
	},
	reminderText: {
		textAlign: 'left',
		fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
	},

  highlight: {
    fontSize: 16,
		color: ColorConstants.TITLE_BLUE_LIVE,
	},

	reminderArea:{
    paddingTop: 10,
    marginBottom: 10,
		justifyContent: 'center',
		//alignItems: 'center',
		flex:3,
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
	errorText:{
		marginTop: 10,
		fontSize: 14,
		color: 'red',
		textAlign: 'center',
	},
	hintText:{
		fontSize: 12,
		color: "#6c6c6c",
	},
	hintBar:{
		flex: 1,
		backgroundColor:'#edf0f5',
		height: TOP_HINT_BAR_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 15,
		paddingRight: 15,
	},
	inputText:{
		textAlign: 'left',
		marginTop: 10,
		borderRadius:3,
		height: 49,
		fontSize: 15,
		backgroundColor:'white',
	},

	rowWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'white',
		paddingLeft: 15,
		paddingRight: 15,
		height: ADDRESS_FILE_TYPE_PICKER_HEIGHT,
	},
	rowTitle:{
		flex:1,
	},
	titleIntro:{
    flex:1,
    fontSize:13,
    marginLeft:15,
    color:ColorConstants.TITLE_DARK_BLUE,
    alignItems:'flex-end',
    textAlign:'right',
  },
	separator: {
		height: 0.5,
		backgroundColor: ColorConstants.SEPARATOR_GRAY,
	},
	listAddressType:{
		marginLeft:15,
		marginTop:5,
		marginRight:15,
		flexDirection:'row',
		justifyContent: 'space-between',
		flexWrap:'wrap',
	},
	addressTypeText:{
		fontSize: 15,
		color: '#3f6dbd',
	},
	addressTypeHint:{
		fontSize: 12,
		color: '#999999',
		alignSelf:'center',
		marginBottom: 12,
	},
	arrow:{
		height: 6,
		width: 12,
		marginLeft: 30
	},
	list:{
		marginTop:12,
		marginBottom:12,
	}
});


module.exports = OAAddressPhotoPage;
