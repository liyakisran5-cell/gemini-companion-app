import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { LogOut, Sun, Moon, Images, Shield, MessageCircleQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import ChatSidebar, { Conversation } from "@/components/chat/ChatSidebar";
import ChatMessage, { Message, Attachment } from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import WelcomeScreen, { extractDisplayName } from "@/components/chat/WelcomeScreen";
import VideoSettingsPanel, { VideoSettings } from "@/components/chat/VideoSettingsPanel";
import GenerationModeSelector, { GenerationMode } from "@/components/chat/GenerationModeSelector";
import { streamChat, editImage, attachmentsToImages, ChatMessage as ChatMsg, ImageGenerationResult } from "@/lib/chat-stream";
import { getUserCredits, useImageCredit, useVideoCredit, hasDailyFreeRemaining, getDailyFreeRemaining } from "@/lib/referral-db";
import { hasFreeAccess, isAdmin as checkIsAdmin } from "@/lib/admin-db";
import {
  loadConversations,
  createConversation as dbCreateConv,
  deleteConversation as dbDeleteConv,
  loadMessages,
  saveMessage,
  updateMessageContent,
} from "@/lib/chat-db";

// Keywords to detect video generation requests — broad matching
const VIDEO_KEYWORDS = [
  "generate a video", "generate video", "create a video", "create video",
  "make a video", "make video", "make me a video",
  "generate a clip", "create a clip", "make a clip", "make me a clip",
  "video of", "video about", "video for", "video showing",
  "animate a", "animate this", "animate the",
  "record a video", "film a", "shoot a video",
  "cinematic video", "short video", "video generation",
  "generate me a video", "create me a video",
  "i want a video", "i need a video",
  "can you make a video", "can you create a video", "can you generate a video",
  "please make a video", "please create a video", "please generate a video",
  // Urdu
  "ویڈیو بنائیں", "ویڈیو بناؤ", "ویڈیو بنا دو", "ویڈیو بنا",
  // Hindi
  "वीडियो बनाओ", "वीडियो बनाएं", "वीडियो बना दो",
];

// Sample mock video URLs for demo
const MOCK_VIDEOS = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
];

const Index = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    model: "sora-2",
    resolution: "1080p",
    duration: 8,
    aspectRatio: "16:9",
  });
  const [videoSettingsOpen, setVideoSettingsOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("image");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userHasFreeAccess, setUserHasFreeAccess] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check free access / admin status
  useEffect(() => {
    if (!user) {
      setUserHasFreeAccess(false);
      setUserIsAdmin(false);
      return;
    }
    const checkAccess = async () => {
      try {
        const [freeAccess, admin] = await Promise.all([
          hasFreeAccess(user.id),
          checkIsAdmin(user.id),
        ]);
        console.log("Admin check for", user.email, ":", admin, "Free access:", freeAccess);
        setUserHasFreeAccess(freeAccess);
        setUserIsAdmin(admin);
      } catch (e) {
        console.error("Access check failed", e);
      }
    };
    checkAccess();
  }, [user]);

  // Load conversations on mount
  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }
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
  }, [user]);

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

  const isVideoRequest = (text: string) => {
    const lower = text.toLowerCase();
    // Only treat as video if it explicitly mentions "video", "clip", or "animate" + action intent
    const hasVideoWord = /\b(video|clip|animate|animation|movie|film)\b/.test(lower);
    const hasActionWord = /\b(make|create|generate|produce|build|render|show|give|want|need|get|record|shoot)\b/.test(lower);
    if (hasVideoWord && hasActionWord) return true;
    return VIDEO_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  };

  const simulateVideoGeneration = async (
    convId: string,
    msgId: string,
    prompt: string,
    settings: VideoSettings
  ) => {
    // Simulate progress over ~6 seconds
    for (let progress = 0; progress <= 100; progress += 5) {
      await new Promise((r) => setTimeout(r, 300));
      setMessagesMap((prev) => ({
        ...prev,
        [convId]: prev[convId].map((m) =>
          m.id === msgId ? { ...m, videoProgress: progress } : m
        ),
      }));
    }

    // Pick a mock video
    const mockUrl = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];

    setMessagesMap((prev) => ({
      ...prev,
      [convId]: prev[convId].map((m) =>
        m.id === msgId
          ? {
              ...m,
              videoProgress: 100,
              generatedVideo: {
                url: mockUrl,
                model: settings.model,
                resolution: settings.resolution,
                duration: settings.duration,
                aspectRatio: settings.aspectRatio,
              },
            }
          : m
      ),
    }));
  };

  const handleSend = async (text: string, attachments: Attachment[] = []) => {
    if (!user) return;

    // Check credits before proceeding (skip for admin/free access)
    const isVideo = isVideoRequest(text);
    if (!userHasFreeAccess && !userIsAdmin) {
      try {
        const credits = await getUserCredits(user.id);
        if (isVideo && credits.video_credits <= 0) {
          toast.error("No video credits! Invite friends to earn credits 🎁");
          return;
        }
        if (!isVideo) {
          // Check daily free + paid credits
          const hasDaily = hasDailyFreeRemaining(credits);
          const hasPaid = credits.image_credits > 0;
          if (!hasDaily && !hasPaid) {
            const remaining = getDailyFreeRemaining(credits);
            toast.error(`Daily free limit reached (${remaining}/10)! Come back tomorrow or invite friends 🎁`);
            return;
          }
        }
      } catch (e) {
        console.error("Credit check failed", e);
      }
    }

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

    // Check if this is a video generation request
    if (isVideoRequest(text)) {
      const assistantTempId = `temp-ai-${Date.now()}`;
      const modelName = videoSettings.model === "sora-2" ? "Sora 2" : "Veo 3.1";
      const content = `🎬 Generating video with **${modelName}**\n\n**Prompt:** ${text}\n**Settings:** ${videoSettings.resolution} · ${videoSettings.duration}s · ${videoSettings.aspectRatio}`;

      setMessagesMap((prev) => ({
        ...prev,
        [convId!]: [
          ...(prev[convId!] || []),
          { id: assistantTempId, role: "assistant" as const, content, videoProgress: 0 },
        ],
      }));

      const capturedConvId = convId!;
      // Deduct video credit (skip for admin/free access)
      if (!userHasFreeAccess && !userIsAdmin) {
        await useVideoCredit(user.id);
      }
      simulateVideoGeneration(capturedConvId, assistantTempId, text, videoSettings).then(async () => {
        setIsLoading(false);
        try {
          await saveMessage(capturedConvId, user.id, "assistant", content);
        } catch (e) {
          console.error("Failed to save video message", e);
        }
      });
      return;
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
      onImageGenerated: async (result) => {
        assistantSoFar = result.content;
        setMessagesMap((prev) => ({
          ...prev,
          [capturedConvId!]: prev[capturedConvId!].map((m) =>
            m.id === assistantTempId
              ? { ...m, content: result.content, generatedImages: result.images }
              : m
          ),
        }));
      },
      onDone: async () => {
        setIsLoading(false);
        setStreamingId(null);
        // Deduct image credit on successful generation (skip for admin/free access)
        if (!userHasFreeAccess && !userIsAdmin) {
          await useImageCredit(user.id);
        }
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
      onImageGenerated: async (result) => {
        assistantSoFar = result.content;
        setMessagesMap((prev) => ({
          ...prev,
          [convId]: prev[convId].map((m) =>
            m.id === assistantTempId
              ? { ...m, content: result.content, generatedImages: result.images }
              : m
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
        onSignOut={signOut}
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
            {userIsAdmin && (
              <button
                onClick={() => navigate("/admin")}
                title="Admin Panel"
                className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
              >
                <Shield size={16} />
              </button>
            )}
            <button
              onClick={() => navigate("/gallery")}
              title="Batch Gallery"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Images size={16} />
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://wa.me/923134499704"
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp Help"
              className="rounded-lg p-1.5 text-green-500 transition-colors hover:bg-green-500/10"
            >
              <MessageCircleQuestion size={16} />
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeMessages.length === 0 ? (
            <WelcomeScreen
              onSuggestion={(text) => handleSend(text)}
              userName={extractDisplayName(user)}
              isReturningUser={conversations.length > 0}
            />
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
                  onImageEdited={(result) => {
                    // Add edited image as a new assistant message
                    const editedMsgId = `edited-${Date.now()}`;
                    setMessagesMap((prev) => ({
                      ...prev,
                      [activeConvId!]: [
                        ...(prev[activeConvId!] || []),
                        {
                          id: editedMsgId,
                          role: "assistant" as const,
                          content: result.content,
                          generatedImages: result.images,
                        },
                      ],
                    }));
                    if (user) {
                      saveMessage(activeConvId!, user.id, "assistant", result.content).catch(console.error);
                    }
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 md:px-0">
          <div className="mb-3 flex items-center gap-3">
            <GenerationModeSelector mode={generationMode} onChange={setGenerationMode} />
          </div>
          {generationMode === "video" && (
            <VideoSettingsPanel
              settings={videoSettings}
              onChange={setVideoSettings}
              isOpen={videoSettingsOpen}
              onToggle={() => setVideoSettingsOpen(!videoSettingsOpen)}
            />
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          showSuggestions={activeMessages.length === 0}
          placeholder={generationMode === "video" ? "Describe the video you want..." : "Describe the image you want..."}
        />
      </main>
    </div>
  );
};

export default Index;
