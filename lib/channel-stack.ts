import * as cdk from 'aws-cdk-lib';
import * as mediaconnect from 'aws-cdk-lib/aws-mediaconnect';
import * as medialive from 'aws-cdk-lib/aws-medialive';
import * as mediapackagev2 from 'aws-cdk-lib/aws-mediapackagev2';
import { Construct } from 'constructs';
import { ChannelConfig } from './config';

interface ChannelStackProps extends cdk.StackProps {
  channelConfig: ChannelConfig;
  channelGroupName: string;
  mediaLiveRoleArn: string;
}

export class ChannelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ChannelStackProps) {
    super(scope, id, props);

    const { channelConfig, channelGroupName, mediaLiveRoleArn } = props;

    // MediaConnect Flows
    const mainFlow = new mediaconnect.CfnFlow(this, 'MainFlow', {
      name: `${channelConfig.name}-main-flow`,
      availabilityZone: channelConfig.mediaConnect.mainAZ,
      source: {
        name: 'MAIN-SOURCE',
        protocol: 'srt-listener',
        ingestPort: channelConfig.mediaConnect.ingestPort,
        whitelistCidr: '0.0.0.0/0'
      }
    });

    const backupFlow = new mediaconnect.CfnFlow(this, 'BackupFlow', {
      name: `${channelConfig.name}-backup-flow`,
      availabilityZone: channelConfig.mediaConnect.backupAZ,
      source: {
        name: 'BACKUP-SOURCE',
        protocol: 'srt-listener',
        ingestPort: channelConfig.mediaConnect.ingestPort,
        whitelistCidr: '0.0.0.0/0'
      }
    });

    // MediaLive Input
    const mediaLiveInput = new medialive.CfnInput(this, 'Input', {
      name: `${channelConfig.name}-input`,
      type: 'MEDIACONNECT',
      mediaConnectFlows: [
        { flowArn: mainFlow.attrFlowArn },
        { flowArn: backupFlow.attrFlowArn }
      ]
    });

    // MediaPackage V2 Channel
    const mediaPackageChannel = new mediapackagev2.CfnChannel(this, 'Channel', {
      channelGroupName: channelGroupName,
      channelName: `${channelConfig.name}-channel`
    });

    // MediaLive Channel
    const mediaLiveChannel = new medialive.CfnChannel(this, 'MediaLiveChannel', {
      name: `${channelConfig.name}-medialive`,
      channelClass: 'SINGLE_PIPELINE',
      roleArn: mediaLiveRoleArn,
      inputSpecification: {
        codec: 'AVC',
        maximumBitrate: 'MAX_20_MBPS',
        resolution: 'HD'
      },
      inputAttachments: [{
        inputId: mediaLiveInput.ref,
        inputAttachmentName: 'input1'
      }],
      destinations: [{
        id: 'destination1',
        mediaPackageSettings: [{
          channelId: mediaPackageChannel.channelName!
        }]
      }],
      encoderSettings: {
        timecodeConfig: { source: 'EMBEDDED' },
        audioDescriptions: [{
          audioSelectorName: 'Default',
          name: 'audio_1',
          codecSettings: {
            aacSettings: {
              bitrate: 192000,
              codingMode: 'CODING_MODE_2_0',
              inputType: 'NORMAL',
              profile: 'LC',
              rateControlMode: 'CBR',
              rawFormat: 'NONE',
              sampleRate: 48000,
              spec: 'MPEG4'
            }
          }
        }],
        videoDescriptions: [{
          name: 'video_1',
          codecSettings: {
            h264Settings: {
              adaptiveQuantization: 'HIGH',
              bitrate: 5000000,
              entropyEncoding: 'CABAC',
              framerateControl: 'SPECIFIED',
              framerateNumerator: 30,
              framerateDenominator: 1,
              gopBReference: 'DISABLED',
              gopClosedCadence: 1,
              gopSize: 90,
              gopSizeUnits: 'FRAMES',
              level: 'H264_LEVEL_4_1',
              lookAheadRateControl: 'HIGH',
              numRefFrames: 3,
              parControl: 'SPECIFIED',
              profile: 'HIGH',
              rateControlMode: 'CBR',
              syntax: 'DEFAULT'
            }
          },
          height: 1080,
          width: 1920
        }],
        outputGroups: [{
          name: 'MediaPackage',
          outputGroupSettings: {
            mediaPackageGroupSettings: {
              destination: { destinationRefId: 'destination1' }
            }
          },
          outputs: [{
            outputName: 'output_1',
            outputSettings: {
              mediaPackageOutputSettings: {}
            },
            audioDescriptionNames: ['audio_1'],
            videoDescriptionName: 'video_1'
          }]
        }]
      }
    });

    // Outputs
    new cdk.CfnOutput(this, 'MainFlowArn', {
      value: mainFlow.attrFlowArn,
      description: `Main MediaConnect Flow ARN for ${channelConfig.name}`
    });

    new cdk.CfnOutput(this, 'BackupFlowArn', {
      value: backupFlow.attrFlowArn,
      description: `Backup MediaConnect Flow ARN for ${channelConfig.name}`
    });

    new cdk.CfnOutput(this, 'MediaLiveChannelId', {
      value: mediaLiveChannel.ref,
      description: `MediaLive Channel ID for ${channelConfig.name}`
    });

    new cdk.CfnOutput(this, 'MediaPackageChannelName', {
      value: mediaPackageChannel.channelName!,
      description: `MediaPackage Channel Name for ${channelConfig.name}`
    });
  }
}