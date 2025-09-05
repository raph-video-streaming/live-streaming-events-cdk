#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FoundationStack } from '../lib/foundation-stack';
import { ChannelStack } from '../lib/channel-stack';
import { CleanupStack } from '../lib/cleanup-stack';
import { config } from '../config/encoding-profiles/config';

const app = new cdk.App();

// Deploy Foundation Stack first
const foundationStack = new FoundationStack(app, 'SPL-Live-FoundationStack', {
  channelNames: config.channels.map(ch => ch.name),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Deploys the foundation stack for the live streaming solution',
});

// Deploy cleanup stack first to handle removed channels
new CleanupStack(app, 'SPL-Live-CleanupStack', {
  currentChannels: config.channels.map(ch => ch.name),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Deploy Channel Stacks with explicit dependencies
const channelStacks: ChannelStack[] = [];
config.channels.forEach((channelConfig, index) => {
  const channelStack = new ChannelStack(app, `SPL-Live-ChannelStack-${channelConfig.name}`, {
    channelConfig,
    channelGroupMediaPackage: foundationStack.myChannelGroup,
    mediaLiveRoleArn: foundationStack.myMediaLiveRole.roleArn,
    mediaPackageRoleArn: foundationStack.myMediaPackageRole.roleArn,
    cdnSecret: foundationStack.cdnSecret,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    }
  });
  
  // Add explicit dependency
  channelStack.addDependency(foundationStack);
  channelStacks.push(channelStack);
});