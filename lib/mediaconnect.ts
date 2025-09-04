import * as cdk from 'aws-cdk-lib';
import {
  aws_mediaconnect as mediaconnect,
  aws_iam as iam,
  aws_secretsmanager as secretsmanager,
  Aws,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";


interface MediaConnectProps {
  channelName: string;
  autoStart: boolean;
  mainAZ: string;
  backupAZ: string;
  mainIngestPort: number;
  backupIngestPort: number;
  whitelistCidr: string;
  decryption: boolean;
  roleNameDecryption: string;
  secretNameDecryption: string
}

export class MediaConnect extends Construct {
  public readonly mainFlow: mediaconnect.CfnFlow;
  public readonly backupFlow: mediaconnect.CfnFlow;

  constructor(scope: Construct, id: string, props: MediaConnectProps) {
    super(scope, id);

    // Get existing role and secret by name if decryption is enabled
    let decryptionConfig = undefined;
    if (props.decryption && props.roleNameDecryption && props.secretNameDecryption) {
      const role = iam.Role.fromRoleName(this, "MediaConnectRole", props.roleNameDecryption);
      const secret = secretsmanager.Secret.fromSecretNameV2(this, "MediaConnectSecret", props.secretNameDecryption);
      decryptionConfig = {
        roleArn: role.roleArn,
        secretArn: secret.secretArn,
      };
    }

    // Main MediaConnect Flow
    this.mainFlow = new mediaconnect.CfnFlow(this, 'MainFlow', {
      name: `${props.channelName}-main-flow_SPL-LIVE`,
      availabilityZone: props.mainAZ,
      source: {
        name: 'MAIN-SOURCE',
        protocol: 'srt-listener',
        ingestPort: props.mainIngestPort,
        whitelistCidr: props.whitelistCidr || "0.0.0.0/0",
        ...(decryptionConfig && { decryption: decryptionConfig }),
      },
      sourceMonitoringConfig: {
        thumbnailState: "ENABLED",
        audioMonitoringSettings: [{
          silentAudio: {
            state: "ENABLED",
            thresholdSeconds: 30,
          },
        }],
        videoMonitoringSettings: [{
          blackFrames: {
            state: "ENABLED",
            thresholdSeconds: 30,
          },
          frozenFrames: {
            state: "ENABLED",
            thresholdSeconds: 30,
          },
        }],
      },

    });
    // Backup MediaConnect Flow
    this.backupFlow = new mediaconnect.CfnFlow(this, 'BackupFlow', {
      name: `${props.channelName}-backup-flow_SPL-LIVE`,
      availabilityZone: props.backupAZ,
      source: {
        name: 'BACKUP-SOURCE',
        protocol: 'srt-listener',
        ingestPort: props.backupIngestPort,
        whitelistCidr: props.whitelistCidr || "0.0.0.0/0",
        ...(decryptionConfig && { decryption: decryptionConfig }),
      },
      sourceMonitoringConfig: {
        thumbnailState: "ENABLED",
        audioMonitoringSettings: [{
          silentAudio: {
            state: "ENABLED",
            thresholdSeconds: 30,
          },
        }],
        videoMonitoringSettings: [{
          blackFrames: {
            state: "ENABLED",
            thresholdSeconds: 30,
          },
          frozenFrames: {
            state: "ENABLED",
            thresholdSeconds: 30,
          },
        }],
      },

    });

    // Outputs
    new CfnOutput(this, 'MainFlowArn', {
      value: this.mainFlow.attrFlowArn,
      description: `Main MediaConnect Flow ARN for ${props.channelName}`,
      exportName: `${Aws.STACK_NAME}-${props.channelName}-MainFlowArn`,
    });

    new CfnOutput(this, 'BackupFlowArn', {
      value: this.backupFlow.attrFlowArn,
      description: `Backup MediaConnect Flow ARN for ${props.channelName}`,
      exportName: `${Aws.STACK_NAME}-${props.channelName}-BackupFlowArn`,
    });
  }
}