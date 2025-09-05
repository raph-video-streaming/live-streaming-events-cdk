import { CodeCommitSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { codebuild } from "cdk-nag/lib/rules";

export interface ChannelConfig {
  name: string;
  mediaConnect: {
    autoStart: boolean;
    mainAZ: string;
    backupAZ: string;
    mainIngestPort: number;
    backupIngestPort: number;
    whitelistCidr: string;
    decryption: boolean;
    roleNameDecryption: string;
    secretNameDecryption: string
  };
  mediaLive: {
    autoStart: boolean;
    ingestSegmentLentgth: number;
    channelClass: string;
    inputType: string;
    sourceEndBehavior: string;
    codec: string;
    encodingProfile: string;
  };
  mediaPackage: {
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
  };
}

export const config = {
  channels: [
    {
      name: 'CH01',
      mediaConnect: {
        autoStart: false,
        mainAZ: 'me-central-1a',
        backupAZ: 'me-central-1b',
        mainIngestPort: 20100,
        backupIngestPort: 20101,
        whitelistCidr: "0.0.0.0/0",
        decryption: false,
        roleNameDecryption: "dawri-streaming-mediaconnect-role",
        secretNameDecryption: "dawri-streaming-srt-passphrase-v2"
      },
      mediaLive: {
        autoStart: false,
        ingestSegmentLentgth: 1,
        channelClass: "STANDARD",
        inputType: "MEDIACONNECT",
        sourceEndBehavior: "LOOP",
        codec: "AVC",
        encodingProfile: "HD-1080p"
      },
      mediaPackage: {
        ingestType: "CMAF",
        adMarkers: "DATERANGE",
        hlsSegmentDurationSeconds: 4,
        hlsPlaylistWindowSeconds: 60,
        hlsIncludeIframe: true,
        hlsAudioRenditionGroup: true,
        hlsProgramDateInterval: 60,
        hlsStartoverWindowSeconds: 1209600,
        cmafSegmentDurationSeconds: 4,
        cmafIncludeIFrame: true,
        cmafProgramDateInterval: 60,
        cmafPlaylistWindowSeconds: 60,
        cmafStartoverWindowSeconds: 1209600
      }
    }
  ]
};