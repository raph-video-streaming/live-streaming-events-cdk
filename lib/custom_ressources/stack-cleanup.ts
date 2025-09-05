import {
  custom_resources,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  RemovalPolicy,
  Aws,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface StackCleanupProps {
  currentChannels: string[];
}

export class StackCleanup extends Construct {
  constructor(scope: Construct, id: string, props: StackCleanupProps) {
    super(scope, id);

    const logGroup = new logs.LogGroup(this, "StackCleanupLogGroup", {
      logGroupName: `/aws/lambda/${Aws.STACK_NAME}_StackCleanup`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const cleanupLambda = new lambda.Function(this, "StackCleanupLambda", {
      functionName: Aws.STACK_NAME + "_StackCleanup",
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset("lib/lambda/stack_cleanup_function"),
      handler: "index.lambda_handler",
      logGroup: logGroup,
    });

    cleanupLambda.role?.attachInlinePolicy(
      new iam.Policy(this, "StackCleanupPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "cloudformation:ListStacks",
              "cloudformation:DeleteStack",
              "cloudformation:DescribeStacks",
              "ssm:GetParameter",
              "ssm:PutParameter",
            ],
            resources: ["*"],
          }),
        ],
      })
    );

    new custom_resources.AwsCustomResource(this, "StackCleanupResource", {
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: cleanupLambda.functionName,
          Payload: JSON.stringify({
            currentChannels: props.currentChannels,
            action: "cleanup",
          }),
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of("stack-cleanup"),
      },
      onUpdate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: cleanupLambda.functionName,
          Payload: JSON.stringify({
            currentChannels: props.currentChannels,
            action: "cleanup",
          }),
        },
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [cleanupLambda.functionArn],
        }),
      ]),
    });
  }
}