export interface ChannelConfig {
  name: string;
  mediaConnect: {
    mainAZ: string;
    backupAZ: string;
    ingestPort: number;
  };
  mediaLive: {
    inputType: 'SRT_LISTENER';
    encodingProfile: 'SD' | 'HD' | 'UHD';
  };
}

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
        inputType: 'SRT_LISTENER' as const,
        encodingProfile: 'HD' as const
      }
    },
    {
      name: 'channel2',
      mediaConnect: {
        mainAZ: 'us-east-1a',
        backupAZ: 'us-east-1b',
        ingestPort: 20102
      },
      mediaLive: {
        inputType: 'SRT_LISTENER' as const,
        encodingProfile: 'HD' as const
      }
    }
  ]
};