import { supabase } from "@/integrations/supabase/client";
import type { Message, Attachment } from "@/components/chat/ChatMessage";

export interface DbConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export async function loadConversations(): Promise<DbConversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createConversation(userId: string, title: string): Promise<DbConversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) {
    console.error("createConversation error:", JSON.stringify(error));
    throw error;
  }
  return data;
}

export async function updateConversationTitle(id: string, title: string) {
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function loadMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    attachments: m.attachments as unknown as Attachment[] | undefined,
  }));
}

export async function saveMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  attachments?: Attachment[]
): Promise<string> {
  // Serialize attachments - strip File objects (not serializable), keep previews
  const serializedAttachments = attachments?.map((a) => ({
    id: a.id,
    type: a.type,
    preview: a.preview,
    fileName: a.file?.name,
    fileSize: a.file?.size,
  }));

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      attachments: serializedAttachments ? JSON.parse(JSON.stringify(serializedAttachments)) : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateMessageContent(id: string, content: string) {
  const { error } = await supabase
    .from("messages")
    .update({ content })
    .eq("id", id);
  if (error) throw error;
}
