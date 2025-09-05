import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackCleanup } from './custom_ressources/stack-cleanup';

interface CleanupStackProps extends cdk.StackProps {
  currentChannels: string[];
}

export class CleanupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CleanupStackProps) {
    super(scope, id, props);

    new StackCleanup(this, 'StackCleanup', {
      currentChannels: props.currentChannels,
    });
  }
}