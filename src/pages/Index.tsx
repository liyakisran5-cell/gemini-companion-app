import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import ChatSidebar, { Conversation } from "@/components/chat/ChatSidebar";
import ChatMessage, { Message, Attachment } from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import { streamChat, attachmentsToImages, ChatMessage as ChatMsg } from "@/lib/chat-stream";
import {
  loadConversations,
  createConversation as dbCreateConv,
  deleteConversation as dbDeleteConv,
  loadMessages,
  saveMessage,
  updateMessageContent,
} from "@/lib/chat-db";

const Index = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    const load = async () => {
      try {
        const convs = await loadConversations();
        setConversations(
          convs.map((c) => ({
            id: c.id,
            title: c.title,
            timestamp: new Date(c.updated_at),
          }))
        );
      } catch (e) {
        console.error("Failed to load conversations", e);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId || messagesMap[activeConvId]) return;
    const load = async () => {
      try {
        const msgs = await loadMessages(activeConvId);
        setMessagesMap((prev) => ({ ...prev, [activeConvId]: msgs }));
      } catch (e) {
        console.error("Failed to load messages", e);
      }
    };
    load();
  }, [activeConvId, messagesMap]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesMap, activeConvId, scrollToBottom]);

  const activeMessages = activeConvId ? messagesMap[activeConvId] || [] : [];

  const handleSend = async (text: string, attachments: Attachment[] = []) => {
    if (!user) return;
    setIsLoading(true);

    let convId = activeConvId;

    // Create conversation in DB if needed
    if (!convId) {
      try {
        const title = text.length > 30 ? text.slice(0, 30) + "…" : text;
        const dbConv = await dbCreateConv(user.id, title);
        convId = dbConv.id;
        setConversations((prev) => [
          { id: dbConv.id, title: dbConv.title, timestamp: new Date(dbConv.created_at) },
          ...prev,
        ]);
        setMessagesMap((prev) => ({ ...prev, [convId!]: [] }));
        setActiveConvId(convId);
        setSidebarOpen(false);
      } catch (e) {
        toast.error("Failed to create conversation");
        setIsLoading(false);
        return;
      }
    }

    // Save user message to DB
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] || []), userMsg],
    }));

    try {
      const savedId = await saveMessage(convId, user.id, "user", text, attachments);
      userMsg.id = savedId;
      setMessagesMap((prev) => ({
        ...prev,
        [convId!]: prev[convId!].map((m) =>
          m.id.startsWith("temp-") && m.content === text ? { ...m, id: savedId } : m
        ),
      }));
    } catch (e) {
      console.error("Failed to save user message", e);
    }

    // Build API messages
    const existingMessages = messagesMap[convId!] || [];
    const apiMessages: ChatMsg[] = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
      images: m.attachments ? attachmentsToImages(m.attachments) : undefined,
    }));
    const images = attachmentsToImages(attachments);
    apiMessages.push({
      role: "user",
      content: text,
      images: images.length > 0 ? images : undefined,
    });

    // Create assistant message placeholder
    const assistantTempId = `temp-ai-${Date.now()}`;
    setMessagesMap((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] || []), { id: assistantTempId, role: "assistant", content: "" }],
    }));
    setStreamingId(assistantTempId);

    let assistantSoFar = "";
    const capturedConvId = convId;

    await streamChat({
      messages: apiMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        const captured = assistantSoFar;
        setMessagesMap((prev) => ({
          ...prev,
          [capturedConvId!]: prev[capturedConvId!].map((m) =>
            m.id === assistantTempId ? { ...m, content: captured } : m
          ),
        }));
      },
      onDone: async () => {
        setIsLoading(false);
        setStreamingId(null);
        // Save assistant message to DB
        try {
          const savedId = await saveMessage(capturedConvId!, user.id, "assistant", assistantSoFar);
          setMessagesMap((prev) => ({
            ...prev,
            [capturedConvId!]: prev[capturedConvId!].map((m) =>
              m.id === assistantTempId ? { ...m, id: savedId } : m
            ),
          }));
        } catch (e) {
          console.error("Failed to save assistant message", e);
        }
      },
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
        setStreamingId(null);
        setMessagesMap((prev) => ({
          ...prev,
          [capturedConvId!]: prev[capturedConvId!].filter((m) => m.id !== assistantTempId),
        }));
      },
    });
  };

  const handleRegenerate = async (convId: string) => {
    if (!user || isLoading) return;
    const msgs = messagesMap[convId] || [];
    // Find the last user message
    const lastUserIdx = msgs.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = msgs[lastUserIdx];

    // Remove the last assistant message
    const trimmed = msgs.slice(0, msgs.length - 1);
    setMessagesMap((prev) => ({ ...prev, [convId]: trimmed }));

    // Re-send with existing content
    setIsLoading(true);

    const apiMessages: ChatMsg[] = trimmed.map((m) => ({
      role: m.role,
      content: m.content,
      images: m.attachments ? attachmentsToImages(m.attachments) : undefined,
    }));

    const assistantTempId = `temp-ai-${Date.now()}`;
    setMessagesMap((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), { id: assistantTempId, role: "assistant" as const, content: "" }],
    }));
    setStreamingId(assistantTempId);

    let assistantSoFar = "";

    await streamChat({
      messages: apiMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        const captured = assistantSoFar;
        setMessagesMap((prev) => ({
          ...prev,
          [convId]: prev[convId].map((m) =>
            m.id === assistantTempId ? { ...m, content: captured } : m
          ),
        }));
      },
      onDone: async () => {
        setIsLoading(false);
        setStreamingId(null);
        try {
          const savedId = await saveMessage(convId, user.id, "assistant", assistantSoFar);
          setMessagesMap((prev) => ({
            ...prev,
            [convId]: prev[convId].map((m) =>
              m.id === assistantTempId ? { ...m, id: savedId } : m
            ),
          }));
        } catch (e) {
          console.error("Failed to save regenerated message", e);
        }
      },
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
        setStreamingId(null);
        setMessagesMap((prev) => ({
          ...prev,
          [convId]: prev[convId].filter((m) => m.id !== assistantTempId),
        }));
      },
    });
  };


  const handleNewChat = () => {
    setActiveConvId(null);
    setSidebarOpen(false);
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await dbDeleteConv(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setMessagesMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeConvId === id) setActiveConvId(null);
    } catch (e) {
      toast.error("Failed to delete conversation");
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={(id) => {
          setActiveConvId(id);
          setSidebarOpen(false);
        }}
        onNew={handleNewChat}
        onDelete={handleDeleteConv}
        isOpen={isDesktop || sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
          <div className="flex items-center gap-2 md:hidden" />
          <h3 className="font-display text-sm font-medium text-muted-foreground">
            {activeConvId
              ? conversations.find((c) => c.id === activeConvId)?.title || "Chat"
              : "New Conversation"}
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-[10px] font-semibold text-primary">
              NovaMind v1
            </span>
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeMessages.length === 0 ? (
            <WelcomeScreen onSuggestion={(text) => handleSend(text)} />
          ) : (
            <div className="mx-auto max-w-3xl py-4">
              {activeMessages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={msg.id === streamingId}
                  onRegenerate={
                    msg.role === "assistant" && idx === activeMessages.length - 1 && !isLoading
                      ? () => handleRegenerate(activeConvId!)
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          showSuggestions={activeMessages.length === 0}
        />
      </main>
    </div>
  );
};

export default Index;
