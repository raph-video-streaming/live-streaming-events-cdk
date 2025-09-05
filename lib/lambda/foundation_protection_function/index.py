import boto3
import json

def lambda_handler(event, context):
    channel_names = event.get('channelNames', [])
    
    cf_client = boto3.client('cloudformation')
    
    try:
        # Check if any channel stacks still exist
        existing_stacks = []
        for channel in channel_names:
            stack_name = f"SPL-Live-ChannelStack-{channel}"
            try:
                response = cf_client.describe_stacks(StackName=stack_name)
                stack_status = response['Stacks'][0]['StackStatus']
                if 'DELETE' not in stack_status:
                    existing_stacks.append(stack_name)
            except cf_client.exceptions.ClientError:
                # Stack doesn't exist, which is fine
                pass
        
        if existing_stacks:
            error_msg = f"Cannot delete foundation stack. Channel stacks still exist: {existing_stacks}"
            print(error_msg)
            raise Exception(error_msg)
        
        print("All channel stacks deleted. Foundation stack can be deleted.")
        return {'statusCode': 200, 'body': 'Deletion allowed'}
        
    except Exception as e:
        print(f"Error in foundation protection: {str(e)}")
        raise e