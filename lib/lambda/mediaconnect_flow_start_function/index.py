import boto3 as aws
import json

def lambda_handler(event, context):
    action = event.get("action", "start_flows")
    _main_flow_arn = event["mainFlowArn"]
    _backup_flow_arn = event["backupFlowArn"]
    
    print(f"Action: {action}")
    print(f"Main flow ARN: {_main_flow_arn}")
    print(f"Backup flow ARN: {_backup_flow_arn}")
    
    my_emc = aws.client('mediaconnect')
    
    try:
        if action == "start_flows":
            # Start main flow
            emc_response_main = my_emc.start_flow(FlowArn=_main_flow_arn)
            print(f"Started main flow: {emc_response_main['Status']}")
            
            # Start backup flow
            emc_response_backup = my_emc.start_flow(FlowArn=_backup_flow_arn)
            print(f"Started backup flow: {emc_response_backup['Status']}")
            
        elif action == "stop_flows":
            # Stop main flow
            emc_response_main = my_emc.stop_flow(FlowArn=_main_flow_arn)
            print(f"Stopped main flow: {emc_response_main['Status']}")
            
            # Stop backup flow
            emc_response_backup = my_emc.stop_flow(FlowArn=_backup_flow_arn)
            print(f"Stopped backup flow: {emc_response_backup['Status']}")
            
        return {"statusCode": 200, "body": f"Successfully executed {action}"}
        
    except Exception as e:
        print(f"Error executing {action}: {str(e)}")
        return {"statusCode": 500, "body": f"Failed to execute {action}: {str(e)}"}