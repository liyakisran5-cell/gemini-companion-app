import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ChevronDown, Settings2 } from "lucide-react";

export interface VideoSettings {
  model: "sora-2" | "veo-3.1";
  resolution: "480p" | "720p" | "1080p" | "4K" | "8K";
  duration: 1 | 2 | 4 | 8;
  aspectRatio: "16:9" | "9:16" | "1:1";
}

interface VideoSettingsPanelProps {
  settings: VideoSettings;
  onChange: (settings: VideoSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const models = [
  { value: "sora-2" as const, label: "Sora 2", desc: "OpenAI" },
  { value: "veo-3.1" as const, label: "Veo 3.1", desc: "Google" },
];

const resolutions = ["480p", "720p", "1080p", "4K", "8K"] as const;
const durations = [1, 2, 4, 8] as const;
const aspectRatios = ["16:9", "9:16", "1:1"] as const;

const VideoSettingsPanel = ({ settings, onChange, isOpen, onToggle }: VideoSettingsPanelProps) => {
  const update = <K extends keyof VideoSettings>(key: K, val: VideoSettings[K]) =>
    onChange({ ...settings, [key]: val });

  return (
    <div className="w-full">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 font-display text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
      >
        <Video size={14} className="text-primary" />
        <span>Video Generation</span>
        <Settings2 size={12} />
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
              {/* Model */}
              <div className="col-span-2 md:col-span-1">
                <label className="mb-1.5 block font-display text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Model
                </label>
                <div className="flex gap-1.5">
                  {models.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => update("model", m.value)}
                      className={`flex-1 rounded-lg px-2 py-2 font-display text-[11px] transition-all ${
                        settings.model === m.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="block font-semibold">{m.label}</span>
                      <span className="block text-[9px] opacity-70">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="mb-1.5 block font-display text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Resolution
                </label>
                <div className="flex flex-wrap gap-1">
                  {resolutions.map((r) => (
                    <button
                      key={r}
                      onClick={() => update("resolution", r)}
                      className={`rounded-md px-2 py-1 font-display text-[10px] font-medium transition-all ${
                        settings.resolution === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-muted"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1.5 block font-display text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Duration
                </label>
                <div className="flex flex-wrap gap-1">
                  {durations.map((d) => (
                    <button
                      key={d}
                      onClick={() => update("duration", d)}
                      className={`rounded-md px-2 py-1 font-display text-[10px] font-medium transition-all ${
                        settings.duration === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-muted"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="mb-1.5 block font-display text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Aspect Ratio
                </label>
                <div className="flex gap-1">
                  {aspectRatios.map((a) => (
                    <button
                      key={a}
                      onClick={() => update("aspectRatio", a)}
                      className={`rounded-md px-2 py-1 font-display text-[10px] font-medium transition-all ${
                        settings.aspectRatio === a
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-muted"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoSettingsPanel;
