# Live Streaming CDK Project

Multi-channel live streaming infrastructure with MediaConnect, MediaLive, and MediaPackage V2.

## Architecture

- **FoundationStack**: MediaPackage V2 Channel Group + shared IAM roles + Secrets Manager
- **ChannelStack**: Per-channel resources (2 MediaConnect flows, 1 MediaLive channel, 1 MediaPackage V2 channel + endpoints)

## Configuration

Edit `config/encoding-profiles/config.ts` to configure channels:

```typescript
export const config = {
  channelCount: 2,
  channels: [
    {
      name: 'CH01',
      mediaConnect: {
        autoStart: true,
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
        autoStart: true,
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
```

## Deployment

```bash
# Install dependencies
npm install

# Build
npm run build

# Deploy foundation first (required)
npx cdk deploy FoundationStack

# Deploy all channels
npx cdk deploy --all

# Or deploy specific channel
npx cdk deploy ChannelStack-CH01
```

## Resources Created

### Foundation Stack (Shared):
- 1 MediaPackage V2 Channel Group (`DAWRI-STREAMING-GROUP-CDK`)
- MediaLive IAM role with MediaConnect permissions
- MediaPackage V2 IAM role for CDN authentication
- Secrets Manager secret for CDN authentication
- CloudWatch log group (optional)

### Per Channel Stack:
- **MediaConnect**: 2 SRT listener flows (main + backup in different AZs)
- **MediaLive**: 1 input (using both flows) + 1 channel with HD encoding
- **MediaPackage V2**: 1 channel + CMAF origin endpoint with CDN auth
- **Custom Resources**: Lambda function to extract ingest endpoints to SSM parameters
- **Outputs**: Channel URLs, ingest endpoints, ARNs

## Key Features

- **Multi-AZ redundancy**: MediaConnect flows in different availability zones
- **SRT ingest**: Secure Reliable Transport protocol for low-latency streaming
- **CMAF packaging**: Common Media Application Format for adaptive streaming
- **CDN authentication**: Secure content delivery with secret-based auth
- **Auto-cleanup**: Proper resource cleanup on stack deletion
- **Cross-stack dependencies**: Foundation resources shared across channels

## Monitoring

- CloudWatch logs for Lambda functions
- MediaLive channel metrics
- MediaPackage access logs (configurable)

## Security

- IAM roles with least-privilege permissions
- Secrets Manager for sensitive data
- CDN authentication for content protection
- VPC-based networking (MediaConnect)