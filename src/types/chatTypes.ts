// User and authentication types
export interface User {
  name: string;
  email: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface UserData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Conversation types
export interface ConversationMember {
  _id: string;
  name: string;
  email: string;
}

export interface OtherUser {
  id: string;
  name: string;
  email: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  members: ConversationMember[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  otherUser?: OtherUser;
  name?: string;
}

// Message types
export interface MessageSender {
  _id: string;
  name: string;
  email: string;
}

export interface Message {
  _id: string;
  content: string;
  senderId: MessageSender;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// API Response types
export interface ConversationsResponse {
  success: boolean;
  message: string;
  data: Conversation[];
}

export interface MessagesResponse {
  success: boolean;
  message: string;
  data: Message[];
}

export interface UsersResponse {
  success: boolean;
  message: string;
  data: UserData[];
}

// Conversation creation types
export interface CreateConversationDto {
  name?: string;
  members: string[];
  type: 'direct' | 'group';
}

export interface CreateConversationResponse {
  success: boolean;
  message: string;
  data: Conversation;
}
