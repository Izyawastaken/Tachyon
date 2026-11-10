import { motion } from "motion/react";
import { shellSpring } from "@/shell/motion";
import { memo } from "react";
import { Download, Heart } from "lucide-react";
import { compactNumber, displayTag, type ProjectHit } from "../types";
import { ProjectImage } from "./ProjectImage";

interface Props {
  project: ProjectHit;
  quick: boolean;
  onOpen: (project: ProjectHit, origin: HTMLButtonElement) => void;
  onHover: (id: string | null) => void;
  onCancel: () => void;
}
export const ProjectCard = memo(function ProjectCard({ project, quick, onOpen, onHover, onCancel }: Props) {
  return <motion.button type="button" layout layoutId={`project-${project.project_id}`}
    transition={quick ? { type: "spring", stiffness: 170, damping: 26, mass: 0.9 } : shellSpring}
    className={`project-card${quick ? " project-card-quick" : ""}`}
    data-project-card={project.project_id}
    onPointerEnter={() => onHover(project.project_id)} onPointerLeave={() => onHover(null)}
    onFocus={() => onHover(project.project_id)} onBlur={() => { onHover(null); onCancel(); }}
    onClick={event => onOpen(project, event.currentTarget)} aria-label={`View ${project.title}`} aria-keyshortcuts="Space" aria-expanded={quick}>
    <motion.span layout="position" className="project-card-identity">
      <motion.span layoutId={`project-icon-${project.project_id}`}><ProjectImage url={project.icon_url} title={project.title} /></motion.span>
      <span className="project-card-title"><strong>{project.title}</strong><span>by {project.author}</span></span>
    </motion.span>
    <motion.span layout="position" className="project-card-description">{project.description}</motion.span>
    <motion.span layout="position" className="project-card-tags">{(project.display_categories.length ? project.display_categories : project.categories).slice(0, quick ? 6 : 2).map(tag => <span key={tag}>{displayTag(tag)}</span>)}</motion.span>
    {quick && <motion.span className="project-quick-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      <span className="project-quick-label">Quick Look</span><strong>Minecraft compatibility</strong>
      <span>Supports Minecraft {project.versions.slice(-5).reverse().join(", ")}</span>
      <span>Release Space to return. Click to open the full project.</span>
    </motion.span>}
    <motion.span layout="position" className="project-card-stats"><span><Download size={13} aria-hidden="true" />{compactNumber.format(project.downloads)}</span><span><Heart size={13} aria-hidden="true" />{compactNumber.format(project.follows)}</span></motion.span>
  </motion.button>;
});
