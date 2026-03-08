import { useState } from "react";
import { Plus, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchPromptInputProps {
  onGenerate: (prompts: string[]) => void;
  isGenerating: boolean;
}

const BatchPromptInput = ({ onGenerate, isGenerating }: BatchPromptInputProps) => {
  const [prompts, setPrompts] = useState<string[]>([""]);

  const addPrompt = () => setPrompts((prev) => [...prev, ""]);

  const removePrompt = (idx: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePrompt = (idx: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const handleGenerate = () => {
    const valid = prompts.filter((p) => p.trim().length > 0);
    if (valid.length === 0) return;
    onGenerate(valid);
  };

  const handlePaste = (e: React.ClipboardEvent, idx: number) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      const before = prompts.slice(0, idx);
      const after = prompts.slice(idx + 1);
      setPrompts([...before, ...lines, ...after]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Prompts ({prompts.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={addPrompt}
          disabled={isGenerating}
          className="gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
        {prompts.map((prompt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
              {idx + 1}
            </span>
            <input
              type="text"
              value={prompt}
              onChange={(e) => updatePrompt(idx, e.target.value)}
              onPaste={(e) => handlePaste(e, idx)}
              placeholder="Describe the image..."
              disabled={isGenerating}
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            {prompts.length > 1 && (
              <button
                onClick={() => removePrompt(idx)}
                disabled={isGenerating}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        💡 Tip: Multiple lines paste hone par automatically alag prompts ban jayenge
      </p>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || prompts.every((p) => !p.trim())}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generate {prompts.filter((p) => p.trim()).length} Image{prompts.filter((p) => p.trim()).length !== 1 ? "s" : ""}
          </>
        )}
      </Button>
    </div>
  );
};

export default BatchPromptInput;
