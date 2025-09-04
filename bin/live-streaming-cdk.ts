#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FoundationStack } from '../lib/foundation-stack';
import { ChannelStack } from '../lib/channel-stack';
import { config } from '../lib/config';

const app = new cdk.App();

// Deploy Foundation Stack first
const foundationStack = new FoundationStack(app, 'FoundationStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
});

// Deploy Channel Stacks
config.channels.forEach((channelConfig, index) => {
  new ChannelStack(app, `ChannelStack-${channelConfig.name}`, {
    channelConfig,
    channelGroupName: foundationStack.myChannelGroup.channelGroupName!,
    mediaLiveRoleArn: foundationStack.myMediaLiveRole.roleArn,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    }
  });
});