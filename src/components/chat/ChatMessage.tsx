import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, FileText, X } from "lucide-react";

export interface Attachment {
  id: string;
  file: File;
  preview?: string; // data URL for images
  type: "image" | "file";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

const ChatMessage = ({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const attachments = message.attachments || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 px-4 py-4 md:px-8`}
    >
      <div
        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-chat-ai-border bg-chat-ai text-primary"
        }`}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 font-display text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "NovaMind"}
        </p>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) =>
              att.type === "image" && att.preview ? (
                <div
                  key={att.id}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-40 w-auto max-w-[240px] object-cover"
                  />
                </div>
              ) : (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2"
                >
                  <FileText size={14} className="shrink-0 text-primary" />
                  <span className="max-w-[180px] truncate font-display text-xs text-foreground">
                    {att.file.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {(att.file.size / 1024).toFixed(0)}KB
                  </span>
                </div>
              )
            )}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 font-display text-sm leading-relaxed ${
            isUser
              ? "bg-chat-user text-foreground"
              : "bg-transparent text-foreground/90"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-primary prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs prose-code:text-primary prose-pre:bg-secondary prose-pre:border prose-pre:border-border">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="ml-0.5 inline-block h-4 w-1.5 rounded-sm bg-primary"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
