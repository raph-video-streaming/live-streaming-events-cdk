import {
  custom_resources,
  Aws,
  aws_iam as iam,
  Fn,
  aws_lambda as lambda,
} from "aws-cdk-lib";

import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export interface IConfigProps {
  mainFlowArn: string;
  backupFlowArn: string;
  autoStart: boolean;
}

export class AutoStartMediaConnect extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    //extracting the MediaConnect flow IDs from the ARNs
    const mainFlowId = Fn.select(6, Fn.split(":", props.mainFlowArn));
    const backupFlowId = Fn.select(6, Fn.split(":", props.backupFlowArn));

    // 👇 Create the Lambda to start MediaConnect flows
    const createLambdaMediaConnect = new lambda.Function(
      this,
      "autostartEMCLambda",
      {
        functionName: Aws.STACK_NAME + "_EMC_AutoStart",
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          "lib/lambda/mediaconnect_flow_start_function",
        ),
        handler: "index.lambda_handler",
      },
    );
    // add the policy to the Function's role
    const mediaConnectLambdaPolicy = new iam.PolicyStatement({
      actions: ["mediaconnect:*"],
      resources: ["*"],
    });
    createLambdaMediaConnect.role?.attachInlinePolicy(
      new iam.Policy(this, "mediaConnectAccess", {
        statements: [mediaConnectLambdaPolicy],
      }),
    );
    const action = props.autoStart ? "start_flows" : "stop_flows";
    
    new custom_resources.AwsCustomResource(this, "autostartEMC", {
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: Aws.STACK_NAME + "_EMC_AutoStart",
          Payload: `{"action":"${action}","mainFlowArn":"${props.mainFlowArn}","backupFlowArn":"${props.backupFlowArn}"}`,
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(
          "autostartEMCResourceId",
        ),
      },
      onUpdate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: Aws.STACK_NAME + "_EMC_AutoStart",
          Payload: `{"action":"${action}","mainFlowArn":"${props.mainFlowArn}","backupFlowArn":"${props.backupFlowArn}"}`,
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(
          "autostartEMCResourceId",
        ),
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [createLambdaMediaConnect.functionArn],
        }),
      ]),
    });

    NagSuppressions.addResourceSuppressions(createLambdaMediaConnect, [
      {
        id: "AwsSolutions-L1",
        reason:
          "This is a false alarm caused by a bug in the nag library. Lambda is running latest available Python 3.11.",
      },
    ]);
  }
}