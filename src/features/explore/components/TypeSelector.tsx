import Blocks from "lucide-react/icons/blocks";
import Package from "lucide-react/icons/package";
import Layers from "lucide-react/icons/layers";
import Sun from "lucide-react/icons/sun";
import FileCode2 from "lucide-react/icons/file-code-2";
import ChevronUp from "lucide-react/icons/chevron-up";
import Pin from "lucide-react/icons/pin";
import { motion, useReducedMotion } from "motion/react";
import { shellSpring } from "@/shell/motion";
import type { useHoverDrawer } from "../hooks/useHoverDrawer";
import { CONTENT_TYPES, type ContentKind } from "../types";

const icons = { modpack: Package, mod: Blocks, shader: Sun, resourcepack: Layers, datapack: FileCode2 };
export function TypeSelector({ drawer, kind, onChange, disabled }: {
  drawer: ReturnType<typeof useHoverDrawer>; kind: ContentKind; onChange: (kind: ContentKind) => void; disabled: boolean;
}) {
  const reduced = useReducedMotion();
  const open = drawer.open && !disabled;
  return <motion.footer className="explore-type-drawer" initial={false} animate={{ height: open ? 100 : 36 }} transition={reduced ? { duration: 0 } : shellSpring} {...drawer.handlers}>
    <div className="explore-type-bar"><button ref={drawer.toggleRef} type="button" onClick={drawer.toggle} disabled={disabled} aria-expanded={open} aria-pressed={drawer.pinned} aria-controls="explore-types" title="Hover to browse content types. Click to keep them open.">
      {CONTENT_TYPES.find(type => type.id === kind)?.label} <span>Browse content</span> {drawer.pinned ? <Pin size={13} /> : <ChevronUp size={13} />}
    </button></div>
    <nav id="explore-types" aria-label="Content type" className="explore-types" inert={!open} aria-hidden={!open}>
      {CONTENT_TYPES.map(type => {
        const Icon = icons[type.id];
        return <button key={type.id} type="button" onClick={() => onChange(type.id)} aria-current={kind === type.id ? "page" : undefined}>
          {kind === type.id && <motion.span className="explore-type-active" layoutId="explore-type" transition={shellSpring} aria-hidden="true" />}
          <Icon size={17} aria-hidden="true" /><span>{type.label}</span>
        </button>;
      })}
    </nav>
  </motion.footer>;
}
