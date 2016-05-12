'use strict'

var RCTDeviceEventEmitter = require('RCTDeviceEventEmitter');

export let STATE_ACTIVE = 'active'
export let STATE_INACTIVE = 'inactive'
export let STATE_BACKGROUND = 'background'

var appState = STATE_ACTIVE
var turnToActiveListeners = []
RCTDeviceEventEmitter.addListener(
	'appStateDidChange',
	(stateData) => {
		if (appState !== STATE_ACTIVE && stateData.app_state === STATE_ACTIVE) {
			for (var i = 0; i < turnToActiveListeners.length; i++) {
				turnToActiveListeners[i]()
			}
		}

		appState = stateData.app_state
	}
)

export function getAppState() {
	return appState
}

export function registerTurnToActiveListener(listener) {
	turnToActiveListeners.push(listener)
}
