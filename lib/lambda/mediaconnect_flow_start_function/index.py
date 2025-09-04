import boto3 as aws
import json

def lambda_handler(event, context):

    print("main flow arn", event["mainFlowArn"])
    print("backup flow arn", event["backupFlowArn"])

    _main_flow_arn = event["mainFlowArn"]
    _backup_flow_arn = event["backupFlowArn"]
    my_emc = aws.client('mediaconnect')
    
    try:
        # Start main flow
        emc_response_main = my_emc.start_flow(FlowArn=_main_flow_arn)
        print("---------------------------\n",
        "emc response start main flow\n",
        json.loads(json.dumps(emc_response_main, indent=2)))
        
        # Start backup flow
        emc_response_backup = my_emc.start_flow(FlowArn=_backup_flow_arn)
        print("---------------------------\n",
        "emc response start backup flow\n",
        json.loads(json.dumps(emc_response_backup, indent=2)))

    except Exception as e:
        print("Error Command - emc start flows failed")
        print(e)