import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  Aws,
  CfnOutput,
  aws_secretsmanager as secretsmanager,
  aws_mediapackagev2 as mediapackagev2,
  aws_logs as logs,
  Duration
} from "aws-cdk-lib";
import { SecretValue } from 'aws-cdk-lib';
import { v4 as uuidv4 } from 'uuid';
import { NagSuppressions } from 'cdk-nag';
import { FoundationProtection } from './custom_ressources/foundation-protection';


interface FoundationStackProps extends cdk.StackProps {
  channelNames?: string[];
}

export class FoundationStack extends cdk.Stack {
  public readonly myChannelGroup: mediapackagev2.CfnChannelGroup;
  public readonly myMediaLiveRole: iam.Role;
  public readonly myMediaPackageRole: iam.Role;
  public readonly cdnSecret: secretsmanager.Secret;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props?: FoundationStackProps) {
    super(scope, id, props);

    const myChannelGroupName = 'DAWRI-STREAMING-GROUP-CDK';
    const myChannelGroupNameDescription = 'Main channel group for all dawri-streaming streaming channels';

    /*
     * 1. Creating the Secret for CDN auth on MediaPackage  👇
    */
    this.cdnSecret = new secretsmanager.Secret(this, "CdnSecret", {
      secretName: "MediaPackageV2/CDN-Auth-SPL-Live",
      description: "Secret for MediaPackageV2 CDN auth",
      secretStringValue: SecretValue.unsafePlainText(JSON.stringify({
        MediaPackageV2CDNIdentifier: uuidv4()
      })),
    });

    NagSuppressions.addResourceSuppressions(this.cdnSecret, [
      {
        id: 'AwsSolutions-SMG4',
        reason: 'Remediated through property override.',
      },
    ]);


    /*
     * 2. Creating the Role for MediaPackage to retrieve the secret  👇
    */

    this.myMediaPackageRole = new iam.Role(this, "MyMediaPackagev2Role", {
      description: "A role to be assumed by MediaPackagev2",
      assumedBy: new iam.ServicePrincipal('mediapackagev2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite')
      ],
      maxSessionDuration: Duration.hours(1),
    });

    NagSuppressions.addResourceSuppressions(this.myMediaPackageRole, [
      {
        id: "AwsSolutions-IAM4",
        reason: "AWS managed policy required for MediaPackage V2 CDN auth",
      },
    ]);


    /*
     * 3. Creating CloudWatch Log Group for MediaPackage  👇

    this.logGroup = new logs.LogGroup(this, 'MediaPackageLogGroup', {
      logGroupName: `/aws/mediapackage/${myChannelGroupName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

        new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      exportName: Aws.STACK_NAME + "LogGroupName",
      description: 'CloudWatch Log Group for MediaPackage access logs'
    });

    */


    /*
     * 4. Creating MediaPackage Channel Group with logging  👇
    */
    this.myChannelGroup = new mediapackagev2.CfnChannelGroup(
      this,
      "MyCdkChannelGroup",
      {
        channelGroupName: myChannelGroupName,
        description: myChannelGroupNameDescription
      },
    );



    /*
     * 4. Creating a shared role for all the MediaLiveChannels  👇
    */
    //👇Generate Policy for MediaLive to access MediaPackage, MediaConnect, S3, MediaStore...
    const customPolicyMediaLive = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ["*"],
          actions: [
            "s3:ListBucket",
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject",
            "mediastore:ListContainers",
            "mediastore:PutObject",
            "mediastore:GetObject",
            "mediastore:DeleteObject",
            "mediastore:DescribeObject",
            "mediaconnect:ManagedDescribeFlow",
            "mediaconnect:ManagedAddOutput",
            "mediaconnect:ManagedRemoveOutput",
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:DescribeLogStreams",
            "logs:DescribeLogGroups",
            "mediaconnect:ManagedDescribeFlow",
            "mediaconnect:ManagedAddOutput",
            "mediaconnect:ManagedRemoveOutput",
            "mediaconnect:DescribeFlow",
            "mediaconnect:AddFlowOutputs",
            "mediaconnect:RemoveFlowOutput",
            "mediaconnect:UpdateFlow",
            "mediaconnect:UpdateFlowOutput",

            "ec2:describeSubnets",
            "ec2:describeNetworkInterfaces",
            "ec2:createNetworkInterface",
            "ec2:createNetworkInterfacePermission",
            "ec2:deleteNetworkInterface",
            "ec2:deleteNetworkInterfacePermission",
            "ec2:describeSecurityGroups",
            "mediapackage:DescribeChannel",
            "mediapackagev2:PutObject",
          ],
        }),
      ],
    });

    //👇Generate a Role for MediaLive to access MediaPackage and S3. You can modify the role to restrict to specific S3 buckets
    const role = new iam.Role(this, "MediaLiveAccessRole", {
      inlinePolicies: {
        policy: customPolicyMediaLive,
      },
      assumedBy: new iam.ServicePrincipal("medialive.amazonaws.com"),
    });
    this.myMediaLiveRole = role;




    // Outputs
    new CfnOutput(this, "cdnSecret", {
      value: this.cdnSecret.secretName,
      exportName: Aws.STACK_NAME + "cdnSecret",
      description: "The name of the cdnSecret for CDN auth",
    });

    new cdk.CfnOutput(this, 'MediaPackageRoleArn', {
      value: this.myMediaPackageRole.roleArn,
      exportName: Aws.STACK_NAME + "MediaPackageRoleArn",
      description: 'Shared MediaPackageRoleArn accross all channels for CDN auth'
    });

    new cdk.CfnOutput(this, 'ChannelGroupName', {
      value: this.myChannelGroup.channelGroupName!,
      exportName: Aws.STACK_NAME + "ChannelGroupName",
      description: 'Shared MediaPackage ChannelGroupName'
    });

    new cdk.CfnOutput(this, 'MediaLiveRoleArn', {
      value: this.myMediaLiveRole.roleArn,
      exportName: Aws.STACK_NAME + "MediaLiveRoleArn",
      description: 'Shared MediaLiveRoleArn accross all channels'
    });

    // Add foundation protection if channel names are provided
    if (props?.channelNames && props.channelNames.length > 0) {
      new FoundationProtection(this, 'FoundationProtection', {
        channelNames: props.channelNames,
      });
    }
  }
}