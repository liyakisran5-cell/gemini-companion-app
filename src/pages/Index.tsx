import { useState, useRef, useEffect, useCallback } from "react";
import ChatSidebar, { Conversation } from "@/components/chat/ChatSidebar";
import ChatMessage, { Message, Attachment } from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import WelcomeScreen from "@/components/chat/WelcomeScreen";

const MOCK_RESPONSES = [
  "That's a great question! Let me break it down for you.\n\n**Key Points:**\n1. First, consider the fundamentals\n2. Then, look at the practical applications\n3. Finally, think about edge cases\n\nWould you like me to elaborate on any of these?",
  "Here's what I think about that:\n\n```typescript\nconst solution = () => {\n  // A clean, elegant approach\n  return 'Hello World';\n};\n```\n\nThis pattern is commonly used in modern development. Let me know if you'd like me to explain further!",
  "Absolutely! Here's a comprehensive overview:\n\n## Overview\nThis is a fascinating topic with many layers.\n\n### Benefits\n- **Efficiency**: Streamlined workflows\n- **Scalability**: Grows with your needs\n- **Flexibility**: Adapts to changes\n\n> \"The best way to predict the future is to create it.\" — Peter Drucker\n\nShall I dive deeper into any specific aspect?",
  "I'd be happy to help with that! 🎯\n\nLet me walk you through the process step by step:\n\n1. **Start with research** — understand the landscape\n2. **Define your goals** — be specific and measurable\n3. **Create a plan** — break it into manageable tasks\n4. **Execute and iterate** — learn from feedback\n\nWhat part would you like to focus on first?",
];

const IMAGE_RESPONSES = [
  "I can see the image you've shared! Here's my analysis:\n\n**What I notice:**\n- The composition is well-balanced\n- Colors are vibrant and eye-catching\n- The subject matter is interesting\n\nWould you like me to provide more specific feedback or help with something related to this image?",
  "Thanks for sharing that image! 📸\n\nHere are some observations:\n\n1. **Quality**: The resolution looks good\n2. **Content**: Very interesting subject\n3. **Suggestions**: Could be enhanced with some adjustments\n\nWhat would you like to do with this image?",
];

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

  const simulateStream = (convId: string, fullText: string) => {
    const assistantId = `msg-${Date.now()}-ai`;
    setMessagesMap((prev) => ({
      ...prev,
      [convId]: [
        ...(prev[convId] || []),
        { id: assistantId, role: "assistant", content: "" },
      ],
    }));
    setStreamingId(assistantId);

    let i = 0;
    const interval = setInterval(() => {
      const chunkSize = Math.floor(Math.random() * 4) + 1;
      i += chunkSize;

      setMessagesMap((prev) => ({
        ...prev,
        [convId]: prev[convId].map((m) =>
          m.id === assistantId
            ? { ...m, content: fullText.slice(0, i) }
            : m
        ),
      }));

      if (i >= fullText.length) {
        clearInterval(interval);
        setIsLoading(false);
        setStreamingId(null);
      }
    }, 20);
  };

  const handleSend = (text: string, attachments: Attachment[] = []) => {
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

    setMessagesMap((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] || []), userMsg],
    }));

    const hasImages = attachments.some((a) => a.type === "image");
    const responses = hasImages ? IMAGE_RESPONSES : MOCK_RESPONSES;
    const responseText = responses[Math.floor(Math.random() * responses.length)];
    setTimeout(() => simulateStream(convId!, responseText), 600);
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
