import {
  aws_mediaconnect as mediaconnect,
  aws_iam as iam,
  aws_secretsmanager as secretsmanager,
  Aws,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";
import * as cdk from 'aws-cdk-lib';
import * as mediapackagev2 from 'aws-cdk-lib/aws-mediapackagev2';
import { MediaLive } from "./medialive";
import { MediaPackageV2 } from "./mediapackage_v2";
import { MediaConnect } from "./mediaconnect";
import { ChannelConfig } from '../config/encoding-profiles/config';
import { AutoStartMediaLive } from "./custom_ressources/medialive-autostart";
import { AutoStartMediaConnect } from "./custom_ressources/mediaconnect-autostart";

interface ChannelStackProps extends cdk.StackProps {
  channelConfig: ChannelConfig;
  channelGroupMediaPackage: mediapackagev2.CfnChannelGroup;
  mediaLiveRoleArn: string;
  mediaPackageRoleArn: string;
  cdnSecret: secretsmanager.ISecret;
}

export class ChannelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ChannelStackProps) {
    super(scope, id, props);

    const { channelConfig, channelGroupMediaPackage, mediaLiveRoleArn } = props;

    /*
     * First step: Create MediaConnect Flows 👇
     */
    const myMediaConnectFlows = new MediaConnect(
      this,
      "MyMediaConnectFlows",
      {
        channelName: channelConfig.name,
        autoStart: channelConfig.mediaConnect.autoStart,
        mainAZ: channelConfig.mediaConnect.mainAZ,
        backupAZ: channelConfig.mediaConnect.backupAZ,
        mainIngestPort: channelConfig.mediaConnect.mainIngestPort,
        backupIngestPort: channelConfig.mediaConnect.backupIngestPort,
        whitelistCidr: channelConfig.mediaConnect.whitelistCidr,
        decryption: channelConfig.mediaConnect.decryption,
        roleNameDecryption: channelConfig.mediaConnect.roleNameDecryption,
        secretNameDecryption: channelConfig.mediaConnect.secretNameDecryption
      }
    );

    /*
     * Second step: Create MediaPackage Channel in the Channel Group 👇
     */
    const myMediaPackageChannel = new MediaPackageV2(
      this,
      "MyMediaPackageChannel",
      {
        channelName: channelConfig.name,
        channelGroup: props.channelGroupMediaPackage,
        channelConfig: channelConfig.mediaPackage,
        cdnAuthRoleArn: props.mediaPackageRoleArn,
        cdnAuthSecretArn: props.cdnSecret.secretArn

      }
    );
    /*
     * Third step: Create MediaLive Channel 👇
     */
    const myMediaLiveChannel = new MediaLive(
      this,
      "MyMediaLiveChannel",
      {
        channelName: channelConfig.name,
        mediaLiveRoleArn: mediaLiveRoleArn,
        autoStart: channelConfig.mediaLive.autoStart,
        ingestSegmentLentgth: channelConfig.mediaLive.ingestSegmentLentgth,
        channelClass: channelConfig.mediaLive.channelClass,
        inputType: channelConfig.mediaLive.inputType,
        sourceEndBehavior: channelConfig.mediaLive.sourceEndBehavior,
        codec: channelConfig.mediaLive.codec,
        encodingProfile: channelConfig.mediaLive.encodingProfile,
        mediaPackageChannelIngestEndPointMain: myMediaPackageChannel.myChannelIngestEndpoint1,
        mediaPackageChannelIngestEndPointBackup: myMediaPackageChannel.myChannelIngestEndpoint2,
        mediaConnectFlowArnMain: myMediaConnectFlows.mainFlow.attrFlowArn,
        mediaConnectFlowArnBackup: myMediaConnectFlows.backupFlow.attrFlowArn
      }
    );

        //👇Check if AutoStart is enabled in the MediaLive configuration to start MediaLive
    if (props.channelConfig.mediaLive.autoStart) {
      const resource = new AutoStartMediaLive(this, "AutoStartResource", {
        mediaLiveChannel: myMediaLiveChannel.channelLive.attrArn,
      });

      // Enable adding suppressions to child constructs
      NagSuppressions.addResourceSuppressions(
        resource,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Remediated through property override.",
            appliesTo: ["Resource::*"],
          },
        ],
        true,
      );
      NagSuppressions.addResourceSuppressions(
        resource,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Remediated through property override.",
            appliesTo: ["Action::medialive:*"],
          },
        ],
        true,
      );


    }

    //👇Check if AutoStart is enabled in the MediaConnect configuration to start MediaConnect flows
    if (props.channelConfig.mediaConnect.autoStart) {
      const resourceMC = new AutoStartMediaConnect(this, "AutoStartMediaConnectResource", {
        mainFlowArn: myMediaConnectFlows.mainFlow.attrFlowArn,
        backupFlowArn: myMediaConnectFlows.backupFlow.attrFlowArn,
      });

      NagSuppressions.addResourceSuppressions(
        resourceMC,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Remediated through property override.",
            appliesTo: ["Resource::*"],
          },
        ],
        true,
      );
      NagSuppressions.addResourceSuppressions(
        resourceMC,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Remediated through property override.",
            appliesTo: ["Action::mediaconnect:*"],
          },
        ],
        true,
      );


    }
  }
}