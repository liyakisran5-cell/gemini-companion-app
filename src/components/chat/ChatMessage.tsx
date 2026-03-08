import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

const ChatMessage = ({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 px-4 py-4 md:px-8 ${isUser ? "" : ""}`}
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
