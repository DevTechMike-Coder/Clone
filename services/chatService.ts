import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { notificationService } from "./notificationService";

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

export type ConversationItem = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  otherUser?: {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  lastMessage?: ChatMessage | null;
  unreadCount: number;
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
        .order("created_at", { ascending: false }),
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
        const otherProfile = Array.isArray(otherParticipant?.profiles)
          ? otherParticipant?.profiles[0]
          : otherParticipant?.profiles;

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
          otherUser: otherProfile
            ? {
                id: otherProfile.id,
                username: otherProfile.username,
                full_name: otherProfile.full_name,
                avatar_url: otherProfile.avatar_url,
              }
            : undefined,
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

    // 1. Check if direct conversation already exists
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map((c) => c.conversation_id);

      const { data: commonConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", myConvIds);

      if (commonConvs && commonConvs.length > 0) {
        // Check if this common conversation is 1-on-1 (is_group = false)
        const { data: directConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("id", commonConvs[0].conversation_id)
          .eq("is_group", false)
          .maybeSingle();

        if (directConv) {
          return directConv.id;
        }
      }
    }

    // 2. Create new direct conversation
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert([{ is_group: false }])
      .select()
      .single();

    if (convError) throw convError;

    // 3. Add both participants
    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: otherUserId },
      ]);

    if (partError) throw partError;

    return newConv.id;
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

    return (data || []).map((item: any) => {
      const sender = Array.isArray(item.sender) ? item.sender[0] : item.sender;
      return {
        ...item,
        sender,
      };
    }) as ChatMessage[];
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
    return {
      ...data,
      sender,
    } as ChatMessage;
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
    const fileName = `chat/${userId}/${Date.now()}.jpg`;

    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("posts")
      .upload(fileName, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Supabase chat media upload error:", error);
      throw new Error(`Media upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("posts").getPublicUrl(fileName);

    return publicUrl;
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

          onMessage({
            ...payload.new,
            sender: data || undefined,
          } as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
