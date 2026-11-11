export type ContentKind = 'Mods' | 'Resource packs' | 'Shaders';
export interface PodContent {
  id: string; name: string; author: string; description: string; category: string;
  kind: ContentKind; version: string; enabled: boolean; update: boolean;
}
export interface PodFile { path: string; size: string; text: string }
export interface PodWorld { id: string; name: string; mode: string; size: string; played: string; seed: string }
export interface Pod {
  id: string; name: string; description: string; version: string; loader: string;
  hours: number; lastPlayed: string; motif: 'terrain' | 'orbit' | 'forge' | 'arch';
  favorite: boolean; content: PodContent[]; files: PodFile[]; worlds: PodWorld[]; source?: string;
}
export const CATALOG: PodContent[] = [
  { id: 'sodium', name: 'Sodium', author: 'CaffeineMC', description: 'A faster rendering engine. More frames, less waiting, and room to turn the view distance up.', category: 'Performance', kind: 'Mods', version: '0.6.9', enabled: true, update: false },
  { id: 'iris', name: 'Iris Shaders', author: 'IrisShaders', description: 'Bring light, atmosphere, and your favorite shader packs into your worlds.', category: 'Graphics', kind: 'Mods', version: '1.8.8', enabled: true, update: false },
  { id: 'jade', name: 'Jade', author: 'Snownee', description: 'A quiet little window into the block, creature, or machine you are looking at.', category: 'Utility', kind: 'Mods', version: '15.10.0', enabled: true, update: false },
  { id: 'ferrite', name: 'FerriteCore', author: 'malte0811', description: 'Let your worlds breathe with a smaller memory footprint.', category: 'Performance', kind: 'Mods', version: '7.0.2', enabled: true, update: true },
  { id: 'journey', name: 'JourneyMap', author: 'techbrew', description: 'Every expedition leaves a trace. Map your travels and find your way home.', category: 'Adventure', kind: 'Mods', version: '6.0.0', enabled: true, update: false },
  { id: 'appleskin', name: 'AppleSkin', author: 'squeek502', description: 'Know a little more about your next meal with hunger and saturation details.', category: 'Utility', kind: 'Mods', version: '3.0.6', enabled: false, update: false },
  { id: 'lithium', name: 'Lithium', author: 'CaffeineMC', description: 'Smarter game logic for smoother ticks, from the first day to your biggest farm.', category: 'Performance', kind: 'Mods', version: '0.15.0', enabled: true, update: false },
  { id: 'terrallith', name: 'Terralith', author: 'Stardust Labs', description: 'Rediscover the Overworld with dramatic landscapes and places worth getting lost in.', category: 'Adventure', kind: 'Mods', version: '2.5.8', enabled: true, update: false },
  { id: 'fresh', name: 'Fresh Animations', author: 'FreshLX', description: 'A little more life in every creature you meet.', category: 'Graphics', kind: 'Resource packs', version: '1.9.3', enabled: true, update: false },
  { id: 'complementary', name: 'Complementary', author: 'EminGTR', description: 'Soft skies, warm light, and a familiar world seen differently.', category: 'Graphics', kind: 'Shaders', version: '5.4', enabled: true, update: false },
];
const files: PodFile[] = [
  { path: 'config/sodium-options.json', size: '2.4 KB', text: '{\n  "quality": {\n    "weather_quality": "FANCY",\n    "leaves_quality": "FANCY"\n  },\n  "performance": {\n    "use_block_face_culling": true\n  }\n}' },
  { path: 'config/iris.properties', size: '128 B', text: '# Iris configuration\nenableShaders=true\nshaderPack=Complementary.zip' },
  { path: 'logs/latest.log', size: '18 KB', text: '[18:42:01] [main/INFO]: Loading Minecraft\n[18:42:02] [main/INFO]: Loading mods\n[18:42:03] [Render thread/INFO]: Renderer initialized\n[18:42:04] [Render thread/WARN]: Resource pack uses an older format\n[18:42:05] [Server thread/INFO]: Preparing spawn area\n[18:42:08] [Server thread/INFO]: World loaded successfully' },
  { path: 'saves/Meadow/level.dat', size: '3.2 KB', text: 'Binary world data · preview unavailable.' },
  { path: 'saves/Meadow/region/r.0.0.mca', size: '4.6 MB', text: 'Binary region data · preview unavailable.' },
  { path: 'saves/Meadow/playerdata/player.dat', size: '1.8 KB', text: 'Binary player data · preview unavailable.' },
  { path: 'resourcepacks/FreshAnimations.zip', size: '1.4 MB', text: 'Resource pack archive · preview unavailable.' },
  { path: 'options.txt', size: '3.1 KB', text: 'renderDistance:16\nsimulationDistance:10\nfullscreen:false\nfov:0.75\nguiScale:3\nmusic:0.5' },
  { path: 'servers.dat', size: '256 B', text: 'Binary server list · preview unavailable.' },
];
const worlds: PodWorld[] = [
  { id: 'meadow', name: 'Meadow', mode: 'Survival', size: '246 MB', played: 'Today', seed: '648093274' },
  { id: 'workshop', name: 'The workshop', mode: 'Creative', size: '82 MB', played: '3 days ago', seed: '209486712' },
];
export const INITIAL_PODS: Pod[] = [
  { id: 'survival', name: 'A quieter world', description: 'Long walks. Small builds. A place to come back to.', version: '1.21.1', loader: 'Fabric', hours: 128.5, lastPlayed: '2 hours ago', motif: 'terrain', favorite: true, content: CATALOG.filter(x => ['sodium', 'iris', 'jade', 'ferrite', 'appleskin', 'fresh', 'complementary'].includes(x.id)), files, worlds },
  { id: 'create', name: 'Create & Magic', description: 'A workshop for wildly impractical ideas.', version: '1.20.1', loader: 'Forge', hours: 64.2, lastPlayed: 'Yesterday', motif: 'forge', favorite: true, content: CATALOG.filter(x => ['jade', 'journey', 'appleskin'].includes(x.id)), files, worlds: [worlds[1]] },
  { id: 'vanilla', name: 'Vanilla, again', description: 'Just one more world. Just one more beginning.', version: '1.21.4', loader: 'Vanilla', hours: 12.8, lastPlayed: '3 days ago', motif: 'arch', favorite: false, content: [], files: files.filter(x => !x.path.startsWith('config/')), worlds: [] },
  { id: 'night', name: 'After hours', description: 'For the friends who always say one more block.', version: '1.21.1', loader: 'Fabric', hours: 36.4, lastPlayed: '5 days ago', motif: 'orbit', favorite: false, content: CATALOG.filter(x => ['sodium', 'lithium', 'journey'].includes(x.id)), files, worlds: [worlds[0]] },
];
export const CONTENT_KINDS: ContentKind[] = ['Mods', 'Resource packs', 'Shaders'];
export const TABS = ['Content', 'Files', 'Worlds', 'Logs', 'Share', 'Settings'] as const;
export type PodTab = typeof TABS[number];
export const hours = (value: number) => `${Math.floor(value)}h ${Math.round((value % 1) * 60)}m`;
