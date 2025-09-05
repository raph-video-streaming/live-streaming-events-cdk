import {
  aws_iam as iam,
  Fn,
  aws_mediapackagev2 as mediapackagev2,
  CfnOutput
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { ExtraAttributes } from "./custom_ressources/mediapackage-extra-attributes";



interface MediaPackageConfig {
  ingestType: string;
  adMarkers: string;
  hlsSegmentDurationSeconds: number;
  hlsPlaylistWindowSeconds: number;
  hlsIncludeIframe: boolean;
  hlsAudioRenditionGroup: boolean;
  hlsProgramDateInterval: number;
  hlsStartoverWindowSeconds: number;
  cmafSegmentDurationSeconds: number;
  cmafIncludeIFrame: boolean;
  cmafProgramDateInterval: number;
  cmafPlaylistWindowSeconds: number;
  cmafStartoverWindowSeconds: number;
}

interface MediaPackageProps {
  channelName: string;
  channelGroup: mediapackagev2.CfnChannelGroup;
  channelConfig: MediaPackageConfig;
  cdnAuthRoleArn: string;
  cdnAuthSecretArn: string;
}

export class MediaPackageV2 extends Construct {
  public readonly myChannel: mediapackagev2.CfnChannel;
  public readonly myChannelEndpointHls: mediapackagev2.CfnOriginEndpoint;
  public readonly myChannelEndpointCmaf: mediapackagev2.CfnOriginEndpoint;
  public readonly myChannelEndpointHlsUrl: string;
  public readonly myChannelEndpointCmafUrl: string;
  public readonly myChannelEndpointLlHlsUrl: string;
  public readonly myChannelEndpointLlCmafUrl: string;
  public readonly myChannelIngestEndpoint1: string;
  public readonly myChannelIngestEndpoint2: string;
  public readonly myChannelGroupName: string;
  public readonly myChannelName: string;



  constructor(scope: Construct, id: string, props: MediaPackageProps) {
    super(scope, id);


    props.channelName = props.channelName
    const hlsOriginEndpointName = "ts";
    const cmafOriginEndpointName = "cmaf";
    const multiVariantManifestName = "index";
    const lowLatencyMultiVariantManifestName = "ll-index";
    const variantManifestName = "variant";
    const lowLatencyVariantManifestName = "ll-variant";
    const segmentName = "segment";

    const cdnHostname = 'alibaba.servers8.com'
    const adTrigger = [
      "SPLICE_INSERT",
      "PROGRAM",
      "BREAK",
      "DISTRIBUTOR_ADVERTISEMENT",
      "DISTRIBUTOR_OVERLAY_PLACEMENT_OPPORTUNITY",
      "DISTRIBUTOR_PLACEMENT_OPPORTUNITY",
      "PROVIDER_ADVERTISEMENT",
      "PROVIDER_OVERLAY_PLACEMENT_OPPORTUNITY",
      "PROVIDER_PLACEMENT_OPPORTUNITY",
      "SPLICE_INSERT",
    ];



    /*
     * 1. Create MediaPackage Channel and Endpoints 👇
     */
    //👇 Creating MediaPackage channel
    this.myChannel = new mediapackagev2.CfnChannel(this, "MyCfnChannel", {
      channelName: props.channelName,
      channelGroupName: props.channelGroup.channelGroupName,
      description: `Channel ${props.channelName}-with CMAF ingest`,
      inputType: props.channelConfig.ingestType,
      outputHeaderConfiguration: {
        publishMqcs: true,
      },
    });
    this.myChannel.addDependency(props.channelGroup);


    // Create CMAF origin endpoint
    const cmafEndpoint = new mediapackagev2.CfnOriginEndpoint(
      this,
      "OriginEndpointCmaf",
      {
        originEndpointName: cmafOriginEndpointName,
        channelGroupName: props.channelGroup.channelGroupName,
        channelName: props.channelName,
        containerType: "CMAF",
        description: "CMAF Origin Endpoint description",
        hlsManifests: [
          {
            manifestName: multiVariantManifestName,
            childManifestName: variantManifestName,
            manifestWindowSeconds:
              props.channelConfig.cmafPlaylistWindowSeconds,
            programDateTimeIntervalSeconds:
              props.channelConfig.cmafProgramDateInterval,
            scteHls: {
              adMarkerHls: props.channelConfig.adMarkers,
            },
          },
        ],
        lowLatencyHlsManifests: [
          {
            manifestName: lowLatencyMultiVariantManifestName,
            childManifestName: lowLatencyVariantManifestName,
            manifestWindowSeconds:
              props.channelConfig.cmafPlaylistWindowSeconds,
            programDateTimeIntervalSeconds:
              props.channelConfig.cmafProgramDateInterval,
            scteHls: {
              adMarkerHls: props.channelConfig.adMarkers,
            },
          },
        ],
        segment: {
          includeIframeOnlyStreams: props.channelConfig.cmafIncludeIFrame,
          scte: {
            scteFilter: adTrigger,
          },
          segmentDurationSeconds:
            props.channelConfig.cmafSegmentDurationSeconds,
          segmentName: segmentName,
          tsIncludeDvbSubtitles: false,
          tsUseAudioRenditionGroup: false,
        },
        startoverWindowSeconds: props.channelConfig.cmafStartoverWindowSeconds,
      },
    );
    cmafEndpoint.addDependency(this.myChannel);


    const cmafOriginEndpointPolicy = new mediapackagev2.CfnOriginEndpointPolicy(
      this,
      "CmafOriginEndpointPolicy",
      {
        channelName: props.channelName,
        channelGroupName: props.channelGroup.channelGroupName,
        originEndpointName: cmafOriginEndpointName,
        policy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: "AllowUser",
              effect: iam.Effect.ALLOW,
              actions: ["mediapackagev2:GetObject"],
              principals: [new iam.AnyPrincipal()],
              resources: [cmafEndpoint.attrArn],
              conditions: {
                Bool: {
                  "mediapackagev2:RequestHasMatchingCdnAuthHeader": "true"
                }
              }
            }),
          ],
        }),
      },
    );

    //Adding CDN Auth
    cmafOriginEndpointPolicy.addPropertyOverride("CdnAuthConfiguration", {
      CdnIdentifierSecretArns: [props.cdnAuthSecretArn],
      SecretsRoleArn: props.cdnAuthRoleArn,
    });
    cmafOriginEndpointPolicy.addDependency(cmafEndpoint);

    /*
     * Final step: Export Varibales  👇
     */
    this.myChannelEndpointCmaf = cmafEndpoint;

    const extraAttributes = new ExtraAttributes(this, "ExtraAttributes", {
      channelGroupName: props.channelGroup.channelGroupName,
      channelName: props.channelName,
    });
    extraAttributes.node.addDependency(this.myChannel);
    this.myChannelIngestEndpoint1 = extraAttributes.channelIngestEndpoint1;
    this.myChannelIngestEndpoint2 = extraAttributes.channelIngestEndpoint2;

    // HLS Output
    const hlsManifestName = Fn.join("", [multiVariantManifestName, ".m3u8"]);
    this.myChannelEndpointHlsUrl = Fn.join("/", [
      "https:/",
      props.channelGroup.attrEgressDomain,
      "out/v1",
      props.channelGroup.channelGroupName,
      props.channelName,
      hlsOriginEndpointName,
      hlsManifestName,
    ]);

    // Low Latency HLS Output
    const llHlsManifestName = Fn.join("", [
      lowLatencyMultiVariantManifestName,
      ".m3u8",
    ]);
    this.myChannelEndpointLlHlsUrl = Fn.join("/", [
      "https:/",
      props.channelGroup.attrEgressDomain,
      "out/v1",
      props.channelGroup.channelGroupName,
      props.channelName,
      hlsOriginEndpointName,
      llHlsManifestName,
    ]);

    // CMAF Output
    const cmafManifestName = Fn.join("", [multiVariantManifestName, ".m3u8"]);
    this.myChannelEndpointCmafUrl = Fn.join("/", [
      "https:/",
      props.channelGroup.attrEgressDomain,
      "out/v1",
      props.channelGroup.channelGroupName,
      props.channelName,
      cmafOriginEndpointName,
      cmafManifestName,
    ]);

    // Low Latency CMAF Output
    const llCmafManifestName = Fn.join("", [
      lowLatencyMultiVariantManifestName,
      ".m3u8",
    ]);
    this.myChannelEndpointLlCmafUrl = Fn.join("/", [
      "https:/",
      props.channelGroup.attrEgressDomain,
      "out/v1",
      props.channelGroup.channelGroupName,
      props.channelName,
      cmafOriginEndpointName,
      llCmafManifestName,
    ]);


    /*
        // Output MediaPackage URLs
        new CfnOutput(this, 'CmafPlaybackUrl', {
          value: this.myChannelEndpointCmafUrl,
          description: `CMAF playback URL for ${props.channelName}`,
          exportName: `${props.channelName}-CmafUrl`
        });
    
        new CfnOutput(this, 'LowLatencyCmafPlaybackUrl', {
          value: this.myChannelEndpointLlCmafUrl,
          description: `Low Latency CMAF playback URL for ${props.channelName}`,
          exportName: `${props.channelName}-LlCmafUrl`
        });
    */

    const llCmafPathEMP = Fn.select(
      1,
      Fn.split("/out/", this.myChannelEndpointLlCmafUrl),
    );
    new CfnOutput(this, 'LowLatencyCmafPlaybackUrl', {
      value:
        "https://" +
        cdnHostname +
        "/out/" +
        llCmafPathEMP,
      description: `Low Latency CMAF playback URL for ${props.channelName}`,
      exportName: `${props.channelName}-LlCmafUrl`
    });

    const cmafPathEMP = Fn.select(
      1,
      Fn.split("/out/", this.myChannelEndpointCmafUrl),
    );
    new CfnOutput(this, 'CmafPlaybackUrl', {
      value:
        "https://" +
        cdnHostname +
        "/out/" +
        cmafPathEMP,
      description: `CMAF playback URL for ${props.channelName}`,
      exportName: `${props.channelName}-CmafUrl`
    });

    new CfnOutput(this, 'IngestEndpoint1', {
      value: this.myChannelIngestEndpoint1,
      description: `MediaPackage ingest endpoint 1 for ${props.channelName}`
    });

    new CfnOutput(this, 'IngestEndpoint2', {
      value: this.myChannelIngestEndpoint2,
      description: `MediaPackage ingest endpoint 2 for ${props.channelName}`
    });

  }
}
