//
//  NativeData.m
//  TH_CFD
//
//  Created by william on 16/3/17.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#import "NativeData.h"
#import "TH_CFD-Swift.h"

@implementation NativeData

RCT_EXPORT_MODULE();
@synthesize bridge = _bridge;

- (NSArray<NSString *> *)supportedEvents
{
	return @[@"nativeSendDataToRN", @"nativeSendDataToRN"];
}

- (void)receiveDataFromRN:(NSString *)dataName data:(NSString *)jsonData
{
	AppDelegate *delegate = (AppDelegate *)[[UIApplication sharedApplication] delegate];
	delegate.nativeData = self;
	StockDataManager *manager = [StockDataManager sharedInstance];
	
	if([dataName isEqualToString:@"myList"]) {
		[manager loadOwnStocksData:jsonData];
	}
    else if([dataName isEqualToString:@"Lang"]){
        if ([jsonData isEqualToString:@"\"cn\""]) {
            [[NSUserDefaults standardUserDefaults] setObject:@"zh-Hans" forKey:@"appLanguage"];
        }
        else {
            [[NSUserDefaults standardUserDefaults] setObject:@"en" forKey:@"appLanguage"];
        }
    }
	else if([dataName isEqualToString:@"myAlertList"]) {
		// depreciated
		[manager loadOwnAlertData:jsonData];
	}
	else if([dataName isEqualToString:@"getui"]) {
		if (delegate.getuiID) {
			[self sendDataToRN:@"deviceToken" data: delegate.getuiID];
		}
        [self sendDataToRN:@"local_snk" data: @"_M7h4R0!"];
		[[NotificationManager sharedInstance] showCurrentNotification];
	}
	else if([dataName isEqualToString:@"playSound"]) {
		[[SoundManager sharedInstance] playSound:jsonData];
	}
    else if([dataName isEqualToString:@"toast"]){
		dispatch_queue_t queue = dispatch_get_main_queue();
		dispatch_async(queue, ^{
			[SwiftNotice showToastNotice:jsonData];
		});
    }
    else if([dataName isEqualToString:@"getVersionCode"]) {
        // should send version code to RN.
        // like android, we need to convert the 1.2.3(4) to 1000000+20000+300+4
        NSString *ver = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"];
        NSString *build = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleVersion"];
        NSArray *vers = [ver componentsSeparatedByString:@"."];
        int versionCode = build.intValue;
        for(int i=0; i<vers.count; i++) {
            versionCode += pow(10, 2*(vers.count - i)) * [vers[i] intValue];
        }
        [self sendDataToRN:@"versionCode" data: [NSString stringWithFormat:@"%d", versionCode]];
    }
    else if([dataName isEqualToString:@"getIpAddress"]) {
        NSError *error;
        NSURL *ipURL = [NSURL URLWithString:@"http://ipof.in/txt"];
        NSString *ip = [NSString stringWithContentsOfURL:ipURL encoding:NSUTF8StringEncoding error:&error];
        if (error != nil) {
            ipURL = [NSURL URLWithString:@"http://ifconfig.me/ip"];
            ip = [NSString stringWithContentsOfURL:ipURL encoding:NSUTF8StringEncoding error:&error];
            if (error != nil) {
                ip = @"127.0.0.1";
            }
        }
        [self sendDataToRN:@"ipAddress" data: ip];
    }
}

- (void)receiveRawDataFromRN:(NSString *)dataName data:(id)data
{
	AppDelegate *delegate = (AppDelegate *)[[UIApplication sharedApplication] delegate];
	delegate.nativeData = self;
	StockDataManager *manager = [StockDataManager sharedInstance];
	
	if([dataName isEqualToString:@"myLogo"]) {
		[manager loadUserLogo:(NSString *)data];
	}
	else if([dataName isEqualToString:@"accountState"])	{
		[manager setIsLive:[(NSString *)data isEqualToString:@"true"]];
	}
    else if([dataName isEqualToString:@"toast"]){
        dispatch_queue_t queue = dispatch_get_main_queue();
        dispatch_async(queue, ^{
            [SwiftNotice showToastNotice:(NSString *)data];
        });
    }
}

- (void)sendDataToRN:(NSString *)dataName data:(NSString *)jsonData
{
	// use RCTEventEmitter to replace
    if (jsonData != nil) {
        [self sendEventWithName:@"nativeSendDataToRN" body:@[dataName, jsonData]];
    }
    else {
        [self sendEventWithName:@"nativeSendDataToRN" body:@[dataName]];
    }
}

#pragma mark RCT_EXPORT
RCT_EXPORT_METHOD(passDataToNative:(NSString *)dataName data:(NSString *)jsonData) {
	[self receiveDataFromRN:dataName data:jsonData];
}

RCT_EXPORT_METHOD(passRawDataToNative:(NSString *)dataName data:(id)data) {
	[self receiveRawDataFromRN:dataName data:data];
}

@end
