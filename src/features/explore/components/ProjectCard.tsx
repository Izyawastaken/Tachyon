import { memo } from "react";
import { Download, Heart } from "lucide-react";
import { compactNumber, displayTag, type ProjectHit } from "../types";
import { ProjectImage } from "./ProjectImage";

export const ProjectCard = memo(function ProjectCard({ project, onOpen }: { project: ProjectHit; onOpen?: (project: ProjectHit) => void }) {
  return <button type="button" className="project-card" onClick={() => onOpen?.(project)} aria-label={`View ${project.title}`}>
    <span className="project-card-identity">
      <ProjectImage url={project.icon_url} title={project.title} />
      <span className="project-card-title"><strong>{project.title}</strong><span>by {project.author}</span></span>
    </span>
    <span className="project-card-description">{project.description}</span>
    <span className="project-card-tags">{(project.display_categories.length ? project.display_categories : project.categories).slice(0, 2).map(tag => <span key={tag}>{displayTag(tag)}</span>)}</span>
    <span className="project-card-stats"><span><Download size={13} aria-hidden="true" />{compactNumber.format(project.downloads)}</span><span><Heart size={13} aria-hidden="true" />{compactNumber.format(project.follows)}</span></span>
  </button>;
});
