import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSidebar = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onToggle,
}: ChatSidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-border bg-sidebar md:relative md:z-0"
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="text-gradient-gold font-display text-lg font-bold tracking-tight">
            NovaMind
          </h2>
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={onNew}
          className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 font-display text-sm font-medium text-secondary-foreground transition-all hover:border-primary/40 hover:bg-secondary/80 glow-border"
        >
          <Plus size={16} className="text-primary" />
          New Chat
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all ${
                activeId === conv.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare size={14} className="shrink-0 text-primary/60" />
              <span className="flex-1 truncate font-display">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.aside>

      {/* Mobile toggle */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-3 top-3 z-40 rounded-xl border border-border bg-card p-2 text-muted-foreground shadow-lg transition-colors hover:text-foreground md:hidden"
        >
          <Menu size={20} />
        </button>
      )}
    </>
  );
};

export default ChatSidebar;
