export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  channelId?: string;
}

export interface Channel {
  id: string;
  name: string;
  username: string;
  avatar: string;
  description?: string;
  subscriberCount: number;
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  hlsPath: string;
  views: number;
  likes: number;
  dislikes: number;
  uploadedAt: string;
  uploadedBy: Channel;
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted';
}

export interface LiveStream {
  _id: string;
  title: string;
  description: string;
  hostedBy: Channel;
  isLive: boolean;
  viewers: number;
  streamKey: string;
  playbackUrl: string;
  startedAt: string;
}

export interface ChatMessage {
  _id: string;
  streamId: string;
  user: User;
  message: string;
  type: 'regular' | 'superchat' | 'system';
  superChatAmount?: number;
  superChatColor?: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  videoId: string;
  user: User;
  content: string;
  edited: boolean;
  createdAt: string;
}