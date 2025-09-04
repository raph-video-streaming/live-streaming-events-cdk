# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import boto3 as aws
import json

def lambda_handler(event, context):

    print("channel id", event["mediaLiveChannelId"])
    print("action", event.get("action", "start"))

    _channel_id = event["mediaLiveChannelId"]
    _action = event.get("action", "start")
    my_eml = aws.client('medialive')
    
    try:
        if _action == "start":
            eml_response = my_eml.start_channel(ChannelId=_channel_id)
            print("---------------------------\n",
            "eml response start channel\n",
            json.loads(json.dumps(eml_response, indent=2)))
        elif _action == "stop":
            eml_response = my_eml.stop_channel(ChannelId=_channel_id)
            print("---------------------------\n",
            "eml response stop channel\n",
            json.loads(json.dumps(eml_response, indent=2)))
        else:
            print(f"Unknown action: {_action}")
            return {"statusCode": 400, "body": f"Unknown action: {_action}"}
            
        return {"statusCode": 200, "body": f"Channel {_action} successful"}

    except Exception as e:
        print(f"Error Command - eml {_action} channel " + _channel_id + "failed")
        print(e)
        return {"statusCode": 500, "body": str(e)}

def get_channel_status(channel,medialive):
	" 'State': 'CREATING'|'CREATE_FAILED'|'IDLE'|'STARTING'|'RUNNING'|'RECOVERING'|'STOPPING'|'DELETING'|'DELETED'|'UPDATING'|'UPDATE_FAILED',        "
	info_channel = medialive.describe_channel(
		ChannelId=channel
		)
	return info_channel["State"]