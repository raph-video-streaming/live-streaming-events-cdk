import {
  aws_medialive as medialive,
  aws_iam as iam,
  Aws,
  CfnOutput,
  Fn,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

interface MediaLiveParameterReaderProps {
    channelName: string;
    mediaLiveRoleArn:string;
    autoStart: boolean;
    ingestSegmentLentgth: number;
    channelClass: string;
    inputType: string;
    sourceEndBehavior: string;
    codec: string;
    encodingProfile: string;
    mediaPackageChannelIngestEndPointMain: string;
    mediaPackageChannelIngestEndPointBackup: string;
    mediaConnectFlowArnMain: string;
    mediaConnectFlowArnBackup: string;
    
}

export class MediaLive extends Construct {
  public readonly channelLive: medialive.CfnChannel;
  public readonly channelInput: medialive.CfnInput;
  public readonly roleArn: string;

    constructor(scope: Construct, id: string, props: MediaLiveParameterReaderProps) {
      super(scope, id);

    const myMediaLiveChannelName = props.channelName + "_SPL_LIVE";

    var destinationValue = [];
    var inputSettingsValue = {};

    /*
     * First step: Create MediaLive Policy & Role 👇
     */




  
    /*
     * Third step: Create Input and specific info based on the input types 👇
     */
    //👇 1. Create a MediaLive input
    const inputName = props.channelName + "_INPUT";
    var cfnInputProps: medialive.CfnInputProps = {
      name: "",
      roleArn: "",
      type: "",
      inputSecurityGroups: [],
      destinations: [
        {
          streamName: "",
        },
      ],
      inputDevices: [
        {
          id: "",
        },
      ],
      mediaConnectFlows: [
        {
          flowArn: "",
        },
      ],
      sources: [
        {
          passwordParam: "passwordParam",
          url: "url",
          username: "username",
        },
      ],
      vpc: {
        securityGroupIds: [""],
        subnetIds: [""],
      },
    };

    //👇1.1 Testing the Input Type
    switch (props.inputType) {
      case "MEDIACONNECT":
        //👇 Validating if STANDARD or SINGLE_PIPELINE Channel to provide 1 or 2 URL
        if (props.channelClass == "STANDARD") {
          destinationValue = [{ flowArn: props?.mediaConnectFlowArnMain }, { flowArn: props?.mediaConnectFlowArnBackup, }]
        } else {
          destinationValue = [{ flowArn: props?.mediaConnectFlowArnMain, }]
        }
        cfnInputProps = {
          name: inputName,
          type: props.inputType,
          roleArn: props.mediaLiveRoleArn,
          mediaConnectFlows: destinationValue,
        };
        inputSettingsValue = {
          audioSelectors: [
            {
              name: "audio_selector_arabic",
              selectorSettings: {
                audioPidSelection: {
                  pid: 102
                }
              }
            },
            {
              name: "audio_selector_english",
              selectorSettings: {
                audioPidSelection: {
                  pid: 103
                }
              }
            },
            {
              name: "audio_selector_original",
              selectorSettings: {
                audioPidSelection: {
                  pid: 104
                }
              }
            },
            {
              name: "audio_selector_arabic2",
              selectorSettings: {
                audioPidSelection: {
                  pid: 105
                }
              }
            }
          ]
        };
        break;
    }

    const mediaLiveInput = new medialive.CfnInput(
      this,
      "MediaInputChannel",
      cfnInputProps,
    );

    //2. Create Channel
    var params = {
      resolution: "",
      maximumBitrate: "",
    };
    var encoderSettings = null;

    switch (props.encodingProfile) {
      case "HD-1080p":
        params.resolution = "HD";
        params.maximumBitrate = "MAX_50_MBPS";
        encoderSettings = require("../config/encoding-profiles/hd-1080p-50fps_TC_BURNT");
        break;
      case "HD-720p":
        params.resolution = "HD";
        params.maximumBitrate = "MAX_20_MBPS";
        encoderSettings = require("../config/encoding-profiles/hd-720p-25fps");
        break;
      case "SD-540p":
        params.resolution = "SD";
        params.maximumBitrate = "MAX_10_MBPS";
        encoderSettings = require("../config/encoding-profiles/sd-540p-30fps");
        break;
      default:
        throw new Error(
          `EncodingProfile is invalid or undefined: ${props.encodingProfile}`,
        );
    }

    // Determine if MediaLive will use a MediaPackage or HLS output group
    // If hlsIngestEndpoint1 and hlsIngestEndpoint2 are specified a HLS output
    // group will be configured in the MediaLive channel.
    // Otherwise a MediaPackage output group will be configured in the MediaLive channel.
    const outputGroupType =
      props.mediaPackageChannelIngestEndPointMain && props.mediaPackageChannelIngestEndPointBackup
        ? "CMAF_OUTPUT_GROUP"
        : "MEDIAPACKAGE_OUTPUT_GROUP";
    var mediaLiveDestination = null;
    if (outputGroupType == "CMAF_OUTPUT_GROUP") {
      // CMAF Output Group
      mediaLiveDestination = {
        id: "media-destination",
        settings: [
          {
            url: props.mediaPackageChannelIngestEndPointMain,
          },
          {
            url: props.mediaPackageChannelIngestEndPointBackup,
          },
        ],
      };

      // Configure output group settings
      encoderSettings.outputGroups[0].name = "CMAF Ingest";
      encoderSettings.outputGroups[0].outputGroupSettings = {
        cmafIngestGroupSettings: {
          destination: {
            destinationRefId: "media-destination",
          },
          segmentLength: props.ingestSegmentLentgth,
          segmentLengthUnits: "SECONDS",
          id3Behavior: "ENABLED",
          scte35Type: "SCTE_35_WITHOUT_SEGMENTATION",
          timedMetadataId3Frame: "PRIV",
          timedMetadataId3Period: 10,
          timedMetadataPassthrough: "ENABLED",

        },
      };
      // Set output settings for each output in the output group with unique name modifiers
      for (let i = 0; i < encoderSettings.outputGroups[0].outputs.length; i++) {
        encoderSettings.outputGroups[0].outputs[i].outputSettings = {
          cmafIngestOutputSettings: {
            nameModifier: `_${i + 1}`,
          },
        };
      }
    } 

    const channelLive = new medialive.CfnChannel(this, "MediaLiveChannel", {
      channelClass: props.channelClass,
      destinations: [
        mediaLiveDestination as medialive.CfnChannel.OutputDestinationProperty,
      ],
      inputSpecification: {
        codec: props.codec,
        resolution: params.resolution,
        maximumBitrate: params.maximumBitrate,
      },
      logLevel: "WARNING",
      name: myMediaLiveChannelName,
      roleArn: props.mediaLiveRoleArn,
      inputAttachments: [
        {
          inputId: mediaLiveInput.ref,
          inputAttachmentName: inputName,
          inputSettings: inputSettingsValue,
        },
      ],
      encoderSettings:
        encoderSettings as medialive.CfnChannel.EncoderSettingsProperty,
    });

    this.channelLive = channelLive;
    this.channelInput = mediaLiveInput;
    /*
     * Final step: Exporting Varibales for Cfn Outputs 👇
     */
    new CfnOutput(this, "MyMediaLiveChannelArn", {
      value: this.channelLive.attrArn,
      exportName: Aws.STACK_NAME + "mediaLiveChannelArn",
      description: "The Arn of the MediaLive Channel",
    });
    new CfnOutput(this, "MyMediaLiveChannelInputName", {
      value: inputName,
      exportName: Aws.STACK_NAME + "mediaLiveChannelInputName",
      description: "The Input Name of the MediaLive Channel",
    });
    if (
      ["UDP_PUSH", "RTP_PUSH", "RTMP_PUSH"].includes(props.inputType)
    ) {
      if (props.channelClass == "STANDARD") {
        new CfnOutput(this, "MyMediaLiveChannelDestPri", {
          value: Fn.join("", [
            Fn.select(0, this.channelInput.attrDestinations),
          ]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestPri",
          description: "Primary MediaLive input Url",
        });
        new CfnOutput(this, "MyMediaLiveChannelDestSec", {
          value: Fn.join("", [
            Fn.select(1, this.channelInput.attrDestinations),
          ]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestSec",
          description: "Seconday MediaLive input Url",
        });
      } else {
        new CfnOutput(this, "MyMediaLiveChannelDestPri", {
          value: Fn.join("", [
            Fn.select(0, this.channelInput.attrDestinations),
          ]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestPri",
          description: "Primary MediaLive input Url",
        });
      }
    }

  }
}
