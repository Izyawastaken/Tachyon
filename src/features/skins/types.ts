export type SkinModel = "classic" | "slim";
export interface Skin {
  id: string;
  name: string;
  model: SkinModel;
  origin: "builtin" | "upload" | "player" | "texture";
  favorite: boolean;
  width: number;
  height: number;
  texture: string;
  slim_texture: string;
  thumbnail: string;
  player: string | null;
}
export interface SkinLibrary { active_id: string; skins: Skin[]; can_undo: boolean; notice: string | null }
export interface ImportResult { library: SkinLibrary; selected_id: string | null; errors: string[] }
