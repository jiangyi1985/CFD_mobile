'use strict'

var React = require('react-native');
var Swiper = require('react-native-swiper')

var {
	StyleSheet,
	View,
	Image,
	Text,
	TouchableHighlight,
	Alert,
	ViewPagerAndroid,
	ScrollView,
	Dimensions,
	Platform,
} = React;

var NativeSceneModule = require('../module/NativeSceneModule')
var NativeDataModule = require('../module/NativeDataModule')
var LogicData = require('../LogicData')
var StockListPage = require('./StockListPage')
var NetworkModule = require('../module/NetworkModule')
var WebSocketModule = require('../module/WebSocketModule')
var ColorConstants = require('../ColorConstants')
var NetConstants = require('../NetConstants')
var NavBar = require('../view/NavBar')
var AppNavigator = require('../../AppNavigator')


var tabNames = ['自选', '美股', '指数', '外汇', '期货']
var urls = [
	NetConstants.GET_USER_BOOKMARK_LIST_API,
	NetConstants.GET_US_STOCK_TOP_GAIN_API,
	NetConstants.GET_INDEX_LIST_API,
	NetConstants.GET_FX_LIST_API,
	NetConstants.GET_FUTURE_LIST_API
]

var didFocusSubscription = null;

var StockListViewPager = React.createClass({

	getInitialState: function() {
		return {
			currentSelectedTab : 0,
			skipOnScrollEvent: false,
		}
	},

	componentWillMount: function() {
		WebSocketModule.start()

		this.didFocusSubscription = this.props.navigator.navigationContext.addListener('didfocus', (event) => this.onDidFocus(event));
	},

	componentWillUnmount: function() {
		this.didFocusSubscription.remove();
	},

	onDidFocus: function(event) {
        if (AppNavigator.STOCK_LIST_VIEW_PAGER_ROUTE === event.data.route.name) {
            WebSocketModule.registerCallbacks((stockInfo) => {
				this.refs['page' + this.state.currentSelectedTab].handleStockInfo(stockInfo)
			})
        }
	},

	tabClicked: function(index) {		
		if (Platform.OS === 'ios') {
			var {height, width} = Dimensions.get('window');
			this.refs.viewPages && this.refs.viewPages.scrollTo({x: index * width, y: 0, animated: true})
		} else {
			this.refs.viewPages && this.refs.viewPages.setPageWithoutAnimation(index)
		}
		if (index !== this.state.currentSelectedTab) {
			this.setState({
				currentSelectedTab: index,
				skipOnScrollEvent: true,
			})
			this.registerInterestedStock()
		}
	},

	editButtonClicked: function() {
		NativeDataModule.passDataToNative('myList', LogicData.getOwnStocksData())
		NativeSceneModule.launchNativeScene('StockEditFragment')
	},

	searchButtonClicked: function() {
		this.props.navigator.push({
			name: AppNavigator.STOCK_SEARCH_ROUTE,
		});
	},

	viewPageScrolled: function(event) {

		var targetTabPosition = event.nativeEvent.position
		if (event.nativeEvent.offset > 0.5) {
			targetTabPosition ++
		}    

		if (targetTabPosition !== this.state.currentSelectedTab) {
			this.setState({
				currentSelectedTab: targetTabPosition
			})
			this.registerInterestedStock()
		}
	},

	onScroll: function(event) {
		var {height, width} = Dimensions.get('window');
		var offsetX = event.nativeEvent.contentOffset.x
		var targetTabPosition = Math.round(offsetX / width)

		if (this.state.skipOnScrollEvent) {
			if (targetTabPosition == this.state.currentSelectedTab) {
				this.setState({
					skipOnScrollEvent: false,
				})
			}
		} else if (targetTabPosition !== this.state.currentSelectedTab){
			this.setState({
				currentSelectedTab: targetTabPosition,
			})
			this.registerInterestedStock()
		}
	},

	registerInterestedStock: function() {
		WebSocketModule.registerInterestedStocks(this.refs['page' + this.state.currentSelectedTab].getShownStocks())
	},

	renderTabs: function() {
		var {height, width} = Dimensions.get('window');

		var tabs = tabNames.map(
			(tabName, i) =>
			<TouchableHighlight style={[styles.tabItemContainer, {width: width / tabNames.length}]} key={i}
					underlayColor={ColorConstants.TITLE_BLUE}
					onPress={() => this.tabClicked(i)}>

				<Text style={this.state.currentSelectedTab == i ? styles.tabItemTextSelected : styles.tabItemTextUnSelected}>
					{tabName}
				</Text>

			</TouchableHighlight>
		)

		return (
			<ScrollView horizontal={true} style={styles.tabs}
					contentContainerStyle={{height: 25}}>
				{tabs}
			</ScrollView>
		);
	},

	renderViewPagers: function() {
		var {height, width} = Dimensions.get('window');

		var viewPages = tabNames.map(
			(tabName, i) =>
			<View style={styles.slide} key={i}>
				<StockListPage dataURL={urls[i]} ref={'page' + i} showHeaderBar={i==1} isOwnStockPage={i==0} navigator={this.props.navigator}/>
			</View>
		)
		if (Platform.OS === 'ios') {
			return (
				<ScrollView style={styles.viewPage} ref='viewPages'
						contentContainerStyle={{width: width * tabNames.length, height: height - 120}}
						pagingEnabled={true}
						horizontal={true}
						onScroll={this.onScroll}
						scrollEventThrottle={10}
						directionalLockEnabled={true} >
					{viewPages}
				</ScrollView>
			);
		} else {
			return (
				<ViewPagerAndroid style={[styles.viewPage, {height: height}]} ref='viewPages'
						onPageScroll={this.viewPageScrolled}>
					{viewPages}
				</ViewPagerAndroid>
			);
		}
	},

	renderSeperate: function() {
		var {height, width} = Dimensions.get('window');

		var offsetX = -width / tabNames.length * (tabNames.length - this.state.currentSelectedTab)

		return (
			<View style={styles.lineContainer}>

				<View style={[styles.line, {width: width}]}/>
				
				<View style={[styles.tabItemContainer, {width: width / tabNames.length, marginLeft: offsetX}]}>
					<Image 
						style={styles.indicator} 
						source={require('../../images/triangle.png')}/>	
				</View>

			</View>
		);
	},

	renderNavBar: function() {
		return (
			<NavBar title="行情" 
				textOnLeft={this.state.currentSelectedTab==0 ? '编辑' : null}
				leftTextOnClick={this.editButtonClicked}
				imageOnRight={require('../../images/search.png')}
				rightImageOnClick={this.searchButtonClicked}/>
		)
	},

	render: function() {
		var {height, width} = Dimensions.get('window');
		
		return (
			<View style={[styles.wrapper, {width: width}]}>
				{this.renderNavBar()}

				{this.renderTabs()}

				{this.renderSeperate()}

				{this.renderViewPagers()}

			</View>
		)
	}
})

var styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		alignItems: 'stretch',
		alignSelf: 'stretch',
		justifyContent: 'space-around',
		backgroundColor: ColorConstants.BACKGROUND_GREY,
	},

	navBarButtonContainer: {
		height: 50,
		backgroundColor: ColorConstants.TITLE_BLUE,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: (Platform.OS === 'ios') ? 15 : 0,
	},

	leftContainer: {
		flex: 1,
		alignItems: 'flex-start',
		paddingLeft: 15,
	},
	centerContainer: {
		flex: 2,
	},
	rightContainer: {
		flex: 1,
		alignItems: 'flex-end',
	},
	textOnNavBar: {
		fontSize: 14,
		textAlign: 'center',
		color: '#ffffff',
		marginRight: 10,
	},

	title: {
		fontSize: 18,
		textAlign: 'center',
		color: '#ffffff',
	},

	searchButton: {
		width: 21,
		height: 21,
		marginRight: 15,
		resizeMode: Image.resizeMode.contain,
	},
	
	tabs: {
		flex: 1,
		alignSelf: 'stretch',
		backgroundColor: ColorConstants.TITLE_BLUE,
	},

	tabItemContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},

	tabItemTextSelected: {
		textAlign: 'center',
		color: '#ffffff',
		fontSize: 16,
		fontWeight: 'bold',
	},

	tabItemTextUnSelected: {
		textAlign: 'center',
		color: '#00b2fe',
		fontSize: 14,
	},

	viewPage: {
		flex: 20,
	},

	slide: {
		alignItems: 'stretch',
	},

	indicator: {
		width: 10,
		height: 5,
		marginTop: -4,
	},

	lineContainer: {
		alignSelf: 'stretch',
		flexDirection: 'row',
	},

	line: {
		alignSelf: 'stretch',
		height: 1,
		borderWidth: 0.5,
		borderColor: '#0f4fba'
	},
})

module.exports = StockListViewPager;