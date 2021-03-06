//
//  NativeData.h
//  TH_CFD
//
//  Created by william on 16/3/17.
//  Copyright © 2016年 Facebook. All rights reserved.
//

//#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface NativeData : RCTEventEmitter<RCTBridgeModule>

- (void)receiveDataFromRN:(NSString *)dataName data:(NSString *)jsonData;
- (void)sendDataToRN:(NSString *)dataName data:(NSString *)jsonData;
@end
