import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { notificationService } from "./notificationService";

const CHAT_BUCKET = "chat";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  read_at: string | null;
  created_at: string;
  sender?: {
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
};

const isRemoteUrl = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://");

const resolveChatMediaUrl = async (
  mediaUrl: string | null | undefined
): Promise<string | null> => {
  if (!mediaUrl) return null;
  if (isRemoteUrl(mediaUrl)) return mediaUrl;

  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(mediaUrl, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("Could not sign chat media URL:", error);
    return null;
  }

  return data.signedUrl;
};

const withSignedMedia = async (message: ChatMessage): Promise<ChatMessage> => ({
  ...message,
  media_url: await resolveChatMediaUrl(message.media_url),
});

export type ConversationParticipant = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type ConversationItem = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  otherUser?: ConversationParticipant;
  /** All OTHER participants (groups) — for avatar stacks and subtitles. */
  otherParticipants?: ConversationParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount: number;
};

export type ConversationDetails = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  participants: ConversationParticipant[];
};

export const chatService = {
  async getConversations(): Promise<ConversationItem[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all conversation IDs the user is participating in
    const { data: myParticipations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (partError) {
      console.error("Error fetching user participations:", partError);
      throw partError;
    }

    if (!myParticipations || myParticipations.length === 0) {
      return [];
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);

    // Fetch conversation details with all participants and recent messages
    const [convsRes, participantsRes, messagesRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_participants")
        .select(
          `
          conversation_id,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `
        )
        .in("conversation_id", conversationIds),
      supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        // The inbox only needs the latest message per conversation for its
        // preview. Cap the query (server default max is ~1000 anyway) so a
        // user with many conversations and lots of history never reads the
        // entire messages table into memory at once.
        .limit(1000),
    ]);

    if (convsRes.error) throw convsRes.error;

    const participantsByConv = new Map<string, any[]>();
    (participantsRes.data || []).forEach((p: any) => {
      if (!participantsByConv.has(p.conversation_id)) {
        participantsByConv.set(p.conversation_id, []);
      }
      participantsByConv.get(p.conversation_id)!.push(p);
    });

    const messagesByConv = new Map<string, any[]>();
    (messagesRes.data || []).forEach((m: any) => {
      if (!messagesByConv.has(m.conversation_id)) {
        messagesByConv.set(m.conversation_id, []);
      }
      messagesByConv.get(m.conversation_id)!.push(m);
    });

    const conversations: ConversationItem[] = (convsRes.data || []).map(
      (conv: any) => {
        const parts = participantsByConv.get(conv.id) || [];
        const otherParticipant = parts.find((p) => p.user_id !== user.id);

        const toParticipant = (p: any): ConversationParticipant | null => {
          const profile = Array.isArray(p?.profiles) ? p.profiles[0] : p?.profiles;
          return profile
            ? {
                id: profile.id,
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              }
            : null;
        };

        const otherProfile = toParticipant(otherParticipant);
        const otherParticipants = conv.is_group
          ? parts
              .filter((p) => p.user_id !== user.id)
              .map(toParticipant)
              .filter((p): p is ConversationParticipant => p !== null)
          : undefined;

        const convMessages = messagesByConv.get(conv.id) || [];
        const lastMsg = convMessages[0] || null;

        const unreadCount = convMessages.filter(
          (m) => m.sender_id !== user.id && !m.read_at
        ).length;

        return {
          id: conv.id,
          is_group: conv.is_group,
          name: conv.name,
          created_at: conv.created_at,
          otherUser: otherProfile ?? undefined,
          otherParticipants,
          lastMessage: lastMsg,
          unreadCount,
        };
      }
    );

    // Sort conversations by last message timestamp or creation timestamp
    return conversations.sort((a, b) => {
      const timeA = new Date(
        a.lastMessage?.created_at || a.created_at
      ).getTime();
      const timeB = new Date(
        b.lastMessage?.created_at || b.created_at
      ).getTime();
      return timeB - timeA;
    });
  },

  async getOrCreateDirectConversation(otherUserId: string): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to chat");
    if (user.id === otherUserId) throw new Error("Cannot chat with yourself");

    const { data, error } = await supabase.rpc("create_direct_conversation", {
      other_user_id: otherUserId,
    });

    if (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }

    return data as string;
  },

  async createGroupConversation(
    name: string,
    memberIds: string[]
  ): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to create a group");

    const { data, error } = await supabase.rpc("create_group_conversation", {
      group_name: name,
      member_ids: memberIds,
    });

    if (error) {
      console.error("Error creating group conversation:", error);
      throw error;
    }

    return data as string;
  },

  /** Conversation metadata + other participants (group headers, member lists). */
  async getConversationDetails(
    conversationId: string
  ): Promise<ConversationDetails | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [convRes, partsRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, is_group, name, created_at")
        .eq("id", conversationId)
        .maybeSingle(),
      supabase
        .from("conversation_participants")
        .select(
          `
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `
        )
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id),
    ]);

    if (convRes.error) throw convRes.error;
    if (!convRes.data) return null;

    const participants: ConversationParticipant[] = (partsRes.data || [])
      .map((p: any): ConversationParticipant | null => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return profile
          ? {
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          : null;
      })
      .filter((p): p is ConversationParticipant => p !== null);

    return { ...(convRes.data as any), participants };
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:sender_id (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }

    const mapped = (data || []).map((item: any) => {
      const sender = Array.isArray(item.sender) ? item.sender[0] : item.sender;
      return {
        ...item,
        sender,
      } as ChatMessage;
    });

    return Promise.all(mapped.map(withSignedMedia));
  },

  async sendMessage(
    conversationId: string,
    content: string,
    mediaUrl?: string
  ): Promise<ChatMessage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to send messages");

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim() || null,
          media_url: mediaUrl || null,
        },
      ])
      .select(
        `
        *,
        sender:sender_id (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }

    // Notify other participants in the conversation
    try {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);

      if (participants && participants.length > 0) {
        for (const p of participants) {
          await notificationService.createNotification({
            userId: p.user_id,
            type: "message",
          });
        }
      }
    } catch (notifErr) {
      console.warn("Could not notify recipient:", notifErr);
    }

    const sender = Array.isArray(data.sender) ? data.sender[0] : data.sender;
    return withSignedMedia({
      ...data,
      sender,
    } as ChatMessage);
  },

  async markMessagesAsRead(conversationId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  },

  async uploadChatMedia(uri: string, userId: string): Promise<string> {
    const fileName = `${userId}/${Date.now()}.jpg`;

    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(CHAT_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase chat media upload error:", error);
      throw new Error(`Media upload failed: ${error.message}`);
    }

    // Store the private object path. Recipients receive a short-lived signed URL on read.
    return fileName;
  },

  subscribeToMessages(
    conversationId: string,
    onMessage: (msg: ChatMessage) => void
  ) {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender profile details for the incoming message
          const { data } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          onMessage(
            await withSignedMedia({
              ...payload.new,
              sender: data || undefined,
            } as ChatMessage)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
