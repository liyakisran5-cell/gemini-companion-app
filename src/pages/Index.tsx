import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import ChatSidebar, { Conversation } from "@/components/chat/ChatSidebar";
import ChatMessage, { Message, Attachment } from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import { streamChat, attachmentsToImages, ChatMessage as ChatMsg } from "@/lib/chat-stream";

let convCounter = 0;

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesMap, activeConvId, scrollToBottom]);

  const activeMessages = activeConvId ? messagesMap[activeConvId] || [] : [];

  const createConversation = (firstMessage: string): string => {
    const id = `conv-${++convCounter}`;
    const title = firstMessage.length > 30 ? firstMessage.slice(0, 30) + "…" : firstMessage;
    setConversations((prev) => [{ id, title, timestamp: new Date() }, ...prev]);
    setMessagesMap((prev) => ({ ...prev, [id]: [] }));
    setActiveConvId(id);
    setSidebarOpen(false);
    return id;
  };

  const handleSend = async (text: string, attachments: Attachment[] = []) => {
    setIsLoading(true);
    let convId = activeConvId;

    if (!convId) {
      convId = createConversation(text);
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Get existing messages for context
    const existingMessages = messagesMap[convId] || [];

    setMessagesMap((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] || []), userMsg],
    }));

    // Build API messages from conversation history
    const apiMessages: ChatMsg[] = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
      images: m.attachments ? attachmentsToImages(m.attachments) : undefined,
    }));

    // Add current user message
    const images = attachmentsToImages(attachments);
    apiMessages.push({
      role: "user",
      content: text,
      images: images.length > 0 ? images : undefined,
    });

    // Create assistant message placeholder
    const assistantId = `msg-${Date.now()}-ai`;
    setMessagesMap((prev) => ({
      ...prev,
      [convId!]: [
        ...(prev[convId!] || []),
        { id: assistantId, role: "assistant", content: "" },
      ],
    }));
    setStreamingId(assistantId);

    let assistantSoFar = "";

    await streamChat({
      messages: apiMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        const captured = assistantSoFar;
        setMessagesMap((prev) => ({
          ...prev,
          [convId!]: prev[convId!].map((m) =>
            m.id === assistantId ? { ...m, content: captured } : m
          ),
        }));
      },
      onDone: () => {
        setIsLoading(false);
        setStreamingId(null);
      },
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
        setStreamingId(null);
        // Remove empty assistant message on error
        setMessagesMap((prev) => ({
          ...prev,
          [convId!]: prev[convId!].filter((m) => m.id !== assistantId),
        }));
      },
    });
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setSidebarOpen(false);
  };

  const handleDeleteConv = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setMessagesMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeConvId === id) setActiveConvId(null);
  };

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
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeMessages.length === 0 ? (
            <WelcomeScreen onSuggestion={(text) => handleSend(text)} />
          ) : (
            <div className="mx-auto max-w-3xl py-4">
              {activeMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={msg.id === streamingId}
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
