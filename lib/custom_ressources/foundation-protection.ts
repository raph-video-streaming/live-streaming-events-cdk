import {
  custom_resources,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  RemovalPolicy,
  Aws,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface FoundationProtectionProps {
  channelNames: string[];
}

export class FoundationProtection extends Construct {
  constructor(scope: Construct, id: string, props: FoundationProtectionProps) {
    super(scope, id);

    const logGroup = new logs.LogGroup(this, "ProtectionLogGroup", {
      logGroupName: `/aws/lambda/${Aws.STACK_NAME}_FoundationProtection`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const protectionLambda = new lambda.Function(this, "ProtectionLambda", {
      functionName: Aws.STACK_NAME + "_FoundationProtection",
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset("lib/lambda/foundation_protection_function"),
      handler: "index.lambda_handler",
      logGroup: logGroup,
    });

    protectionLambda.role?.attachInlinePolicy(
      new iam.Policy(this, "ProtectionPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "cloudformation:ListStacks",
              "cloudformation:DescribeStacks",
            ],
            resources: ["*"],
          }),
        ],
      })
    );

    new custom_resources.AwsCustomResource(this, "ProtectionResource", {
      onDelete: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: protectionLambda.functionName,
          Payload: JSON.stringify({
            channelNames: props.channelNames,
            action: "check_deletion",
          }),
        },
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [protectionLambda.functionArn],
        }),
      ]),
    });
  }
}