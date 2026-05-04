export interface MessengerMessageEvent {
  type: string;
  senderID: string;
  threadID: string;
  messageID: string;
  body: string;
  args: string[];
  attachments: string[];
  mentions: Record<string, string>;
  timestamp: string;
  isGroup: boolean;
  participantIDs: string[];
  isUnread: boolean;
}

export interface ThreadEvent {
  type: "event";
  threadID: string;
  logMessageType: string;
  logMessageData: {
    // log:subscribe
    addedParticipants?: {
      userFbId: string;
      fullName: string;
      firstName: string;
      fanoutPolicy?: string;
      groupJoinStatus?: string;
      initialFolder?: string;
      isMessengerUser?: boolean;
    }[];

    // log:unsubscribe
    leftParticipantFbId?: string;

    // log:thread-name
    name?: string;
  };

  logMessageBody: string;
  author: string;
  participantIDs: string[];
}
