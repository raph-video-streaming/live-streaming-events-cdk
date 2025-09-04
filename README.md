# Live Streaming CDK Project

Multi-channel live streaming infrastructure with MediaConnect, MediaLive, and MediaPackage V2.

## Architecture

- **FoundationStack**: MediaPackage V2 Channel Group + shared resources
- **ChannelStack**: Per-channel resources (2 MediaConnect flows, 1 MediaLive channel, 1 MediaPackage channel)

## Configuration

Edit `lib/config.ts` to configure channels:

```typescript
export const config = {
  channelCount: 2,
  channels: [
    {
      name: 'channel1',
      mediaConnect: {
        mainAZ: 'us-east-1a',
        backupAZ: 'us-east-1b',
        ingestPort: 20101
      },
      mediaLive: {
        inputType: 'SRT_LISTENER',
        encodingProfile: 'HD'
      }
    }
  ]
};
```

## Deployment

```bash
# Build
npm run build

# Deploy foundation first
npx cdk deploy FoundationStack

# Deploy all channels
npx cdk deploy --all

# Or deploy specific channel
npx cdk deploy ChannelStack-channel1
```

## Resources Created

### Per Channel:
- 2 MediaConnect flows (main + backup)
- 1 MediaLive input (using both flows)
- 1 MediaLive channel
- 1 MediaPackage V2 channel

### Shared:
- 1 MediaPackage V2 Channel Group
- IAM roles
- Secrets Manager entries