import boto3
import json

def lambda_handler(event, context):
    current_channels = event.get('currentChannels', [])
    
    cf_client = boto3.client('cloudformation')
    ssm_client = boto3.client('ssm')
    
    parameter_name = '/live-streaming/deployed-channels'
    
    try:
        # Get previously deployed channels
        try:
            response = ssm_client.get_parameter(Name=parameter_name)
            previous_channels = json.loads(response['Parameter']['Value'])
        except ssm_client.exceptions.ParameterNotFound:
            previous_channels = []
        
        # Find channels to remove
        channels_to_remove = [ch for ch in previous_channels if ch not in current_channels]
        
        # Delete stacks for removed channels and wait for completion
        for channel in channels_to_remove:
            stack_name = f"SPL-Live-ChannelStack-{channel}"
            try:
                # Check if stack exists
                cf_client.describe_stacks(StackName=stack_name)
                
                # Delete the stack
                cf_client.delete_stack(StackName=stack_name)
                print(f"Initiated deletion of stack: {stack_name}")
                
                # Wait for deletion to complete
                waiter = cf_client.get_waiter('stack_delete_complete')
                waiter.wait(
                    StackName=stack_name,
                    WaiterConfig={'Delay': 30, 'MaxAttempts': 60}
                )
                print(f"Successfully deleted stack: {stack_name}")
                
            except cf_client.exceptions.ClientError as e:
                if 'does not exist' in str(e):
                    print(f"Stack {stack_name} already deleted")
                else:
                    print(f"Failed to delete stack {stack_name}: {str(e)}")
            except Exception as e:
                print(f"Failed to delete stack {stack_name}: {str(e)}")
        
        # Update parameter with current channels (always update to track state)
        ssm_client.put_parameter(
            Name=parameter_name,
            Value=json.dumps(current_channels),
            Type='String',
            Overwrite=True
        )
        
        print(f"Previous channels: {previous_channels}")
        print(f"Current channels: {current_channels}")
        print(f"Channels to remove: {channels_to_remove}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'previous_channels': previous_channels,
                'current_channels': current_channels,
                'removed_channels': channels_to_remove
            })
        }
        
    except Exception as e:
        print(f"Error in stack cleanup: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Error: {str(e)}'
        }