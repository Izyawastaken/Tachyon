export type SettingValue = string | number | boolean;
export type Values = Record<string, SettingValue>;
export type CategoryId = 'general' | 'java' | 'instances' | 'network' | 'storage' | 'cache' | 'sharing' | 'servers' | 'appearance' | 'accounts' | 'privacy' | 'advanced';

export interface Setting {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'text' | 'number' | 'textarea';
  default: SettingValue;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  instance?: boolean;
  when?: [string, SettingValue];
}
export interface Group { title: string; description?: string; fields: Setting[] }
export interface Category { id: CategoryId; label: string; description: string; groups: Group[] }

const toggle = (id: string, label: string, description: string, value: boolean, extra: Partial<Setting> = {}): Setting => ({ id, label, description, type: 'toggle', default: value, ...extra });
const select = (id: string, label: string, description: string, value: string, options: string[], extra: Partial<Setting> = {}): Setting => ({ id, label, description, type: 'select', default: value, options, ...extra });
const text = (id: string, label: string, description: string, value: string, extra: Partial<Setting> = {}): Setting => ({ id, label, description, type: 'text', default: value, ...extra });
const number = (id: string, label: string, description: string, value: number, min: number, max: number, unit: string, extra: Partial<Setting> = {}): Setting => ({ id, label, description, type: 'number', default: value, min, max, unit, ...extra });
const game = { instance: true };

export const CATEGORIES: Category[] = [
  { id: 'general', label: 'General', description: 'The everyday things. Settle in and make Tachyon feel like home.', groups: [
    { title: 'Launcher', fields: [
      select('language', 'Language', 'Choose the language used by the launcher.', 'English', ['English', 'Deutsch', 'Español', 'Français', '日本語', 'हिन्दी']),
      select('onPlay', 'When a game starts', 'What should happen to the launcher while you play?', 'Minimize', ['Close', 'Minimize', 'Keep open']),
      toggle('startup', 'Launch on startup', 'Have Tachyon ready when you sign in to your computer.', false),
    ] },
    { title: 'Updates', fields: [
      select('channel', 'Update channel', 'Stable is tested. Nightly includes the latest experiments.', 'Stable', ['Stable', 'Nightly']),
      toggle('autoUpdate', 'Automatic updates', 'Download launcher updates and apply them on the next restart.', true),
    ] },
    { title: 'A home for your data', description: 'Instances, the shared garden, and caches live together by default.', fields: [
      text('dataDir', 'Data directory', 'Keep the shared store and instances on the same filesystem for hardlinks.', 'C:\\Users\\Admin\\AppData\\Roaming\\Tachyon', { placeholder: 'Choose a directory' }),
    ] },
  ] },
  { id: 'java', label: 'Java & runtime', description: 'The right runtime, without the guesswork. Fine-tune only what you need.', groups: [
    { title: 'Java installation', fields: [
      select('javaMode', 'Java runtime', 'Automatically choose a compatible JDK for each Minecraft version.', 'Auto-managed', ['Auto-managed', 'Custom path'], game),
      select('jdkVendor', 'Preferred distribution', 'Download a compatible runtime on demand in the full launcher.', 'Temurin', ['Temurin', 'Zulu'], { ...game, when: ['javaMode', 'Auto-managed'] }),
      text('javaPath', 'Custom Java path', 'Point to the java executable, rather than its containing folder.', '', { ...game, placeholder: 'C:\\Java\\bin\\java.exe', when: ['javaMode', 'Custom path'] }),
    ] },
    { title: 'Memory', description: 'Leave room for your operating system and everything else you have open.', fields: [
      toggle('autoMemory', 'Allocate memory automatically', 'Sample device: 16 GB RAM → 2 GB minimum, 6 GB maximum.', true, game),
      number('memoryMin', 'Minimum memory', 'Initial memory reserved for Minecraft.', 2, 1, 16, 'GB', { ...game, when: ['autoMemory', false] }),
      number('memoryMax', 'Maximum memory', 'The most memory Minecraft can use. Keep this above the minimum.', 6, 1, 16, 'GB', { ...game, when: ['autoMemory', false] }),
    ] },
    { title: 'Launch environment', fields: [
      select('jvmPreset', 'JVM argument preset', 'Preset examples are editable. Compatibility depends on the selected JDK.', 'Default', ['Default', 'Aikar’s flags', 'GraalVM', 'ZGC', 'Custom'], game),
      text('jvmArgs', 'Default JVM arguments', 'Memory flags are managed by the allocation controls above.', '-XX:+UseG1GC', { ...game, type: 'textarea' }),
      text('envVars', 'Environment variables', 'One KEY=value per line. Never put access tokens here in this preview.', '', { ...game, type: 'textarea', placeholder: 'MESA_GL_VERSION_OVERRIDE=4.6' }),
      text('wrapper', 'Wrapper command', 'Run a command before Java. Useful on Linux for gamemoderun, prime-run, or mangohud.', '', { ...game, placeholder: 'gamemoderun mangohud' }),
    ] },
    { title: 'Lifecycle hooks', description: 'Commands are stored as examples only; this preview never executes them.', fields: [
      text('preLaunch', 'Pre-launch hook', 'Run before starting the game.', '', { ...game, type: 'textarea', placeholder: 'Command to run before launch' }),
      text('postExit', 'Post-exit hook', 'Run after the game has fully exited.', '', { ...game, type: 'textarea', placeholder: 'Command to run after exit' }),
    ] },
  ] },
  { id: 'instances', label: 'Instances', description: 'Start with good defaults. Give each world its own exceptions.', groups: [
    { title: 'Game window', fields: [
      select('resolution', 'Default resolution', 'Window size when Minecraft starts.', '1920 × 1080', ['1280 × 720', '1600 × 900', '1920 × 1080', '2560 × 1440', '3840 × 2160'], game),
      toggle('fullscreen', 'Start in fullscreen', 'Open Minecraft directly in fullscreen mode.', false, game),
      text('windowTitle', 'Window title', 'Use {instance} and {version} as placeholders.', 'Tachyon · {instance}', game),
    ] },
    { title: 'A working pack stays working', fields: [
      text('loaderVersion', 'Pinned mod loader version', 'Example version pin. An empty value follows the recommended version.', '', { ...game, placeholder: 'Recommended' }),
      toggle('lockPack', 'Lock instance updates', 'Prevent game, loader, and mod updates until you unlock the instance.', false, game),
    ] },
  ] },
  { id: 'network', label: 'Downloads & network', description: 'Keep downloads moving, even on a connection with its own ideas.', groups: [
    { title: 'Download engine', fields: [
      number('downloads', 'Concurrent downloads', 'How many files can download at the same time.', 4, 1, 32, 'files'),
      toggle('aria', 'Use aria2c', 'Use an external multi-connection download engine.', false),
      text('ariaPath', 'aria2c binary path', 'Leave empty to find aria2c on PATH.', '', { placeholder: 'Auto-detect on PATH', when: ['aria', true] }),
      number('ariaSplits', 'Splits per file', 'Split large downloads into parallel parts.', 8, 1, 32, 'parts', { when: ['aria', true] }),
      number('ariaConnections', 'Connections per server', 'Maximum simultaneous connections to one host.', 4, 1, 16, 'connections', { when: ['aria', true] }),
      number('speedLimit', 'Download speed limit', 'Use 0 for unlimited download speed.', 0, 0, 1000000, 'KB/s'),
    ] },
    { title: 'Routing & mirrors', fields: [
      select('proxyType', 'Proxy', 'Route launcher requests through an HTTP or SOCKS5 proxy.', 'None', ['None', 'HTTP', 'SOCKS5']),
      text('proxyHost', 'Proxy address', 'Host and port of your proxy. Credentials are not stored in this preview.', '127.0.0.1:1080'),
      text('modrinthMirror', 'Modrinth API mirror', 'Leave empty to use the official API endpoint.', '', { placeholder: 'https://api.modrinth.com' }),
      text('curseMirror', 'CurseForge API mirror', 'Leave empty to use the official API endpoint.', '', { placeholder: 'https://api.curseforge.com' }),
    ] },
    { title: 'Reliability', fields: [
      number('retries', 'Retry attempts', 'Retry failed downloads before showing an error.', 3, 0, 10, 'attempts'),
      select('backoff', 'Retry backoff', 'Wait longer between repeated failures to avoid overwhelming a host.', 'Exponential', ['Exponential', 'Fixed delay']),
      number('retryDelay', 'Initial retry delay', 'Delay before the first retry.', 2, 1, 60, 'seconds'),
      select('hash', 'Hash verification', 'Strict rejects files when a required hash is missing or mismatched.', 'Strict', ['Strict', 'When available', 'Disabled']),
    ] },
  ] },
  { id: 'storage', label: 'Garden & pots', description: 'One shared garden. Many little worlds. A lot less disk space.', groups: [
    { title: 'Shared storage', fields: [
      select('dedup', 'Deduplication mode', 'Hardlinks share file data. Reflinks use copy-on-write when supported.', 'Hardlink', ['Hardlink', 'Reflink', 'Copy']),
      toggle('copyFallback', 'Fall back to copies', 'Keep installs working when the destination cannot share file data.', true),
      text('gardenPath', 'Shared store location', 'Must share a filesystem with instances to create hardlinks.', 'C:\\Users\\Admin\\AppData\\Roaming\\Tachyon\\garden'),
    ] },
  ] },
  { id: 'cache', label: 'Engram & Decker', description: 'A quicker second visit. Control what Tachyon remembers.', groups: [
    { title: 'L1 · In-memory cache', description: 'Moka keeps frequently used entries close at hand.', fields: [
      number('l1Cap', 'L1 size cap', 'Maximum memory reserved for cached responses.', 128, 16, 2048, 'MB'),
      number('l1Ttl', 'L1 time to live', 'How long an entry stays fresh in memory.', 15, 1, 1440, 'minutes'),
    ] },
    { title: 'L2 · Persistent cache', fields: [
      number('l2Cap', 'L2 size cap', 'Maximum disk space used by the persistent cache.', 2048, 64, 65536, 'MB'),
      number('zstd', 'Zstd compression level', 'Higher compression saves space at the cost of CPU time.', 3, 1, 22, 'level'),
      select('wal', 'WAL checkpoints', 'Choose when to fold the write-ahead log into the database.', 'Automatic', ['Automatic', 'On exit', 'Manual']),
    ] },
    { title: 'Freshness & prefetch', fields: [
      number('prefetch', 'Prefetch depth', 'Load the next pages before you reach them. Set to 0 to turn off.', 2, 0, 10, 'pages ahead'),
      toggle('metered', 'Pause prefetch on metered connections', 'Avoid using limited data for pages you might never open.', true),
      select('staleness', 'Staleness policy', 'Choose when cached results should be checked against the remote source.', 'Revalidate on access', ['Revalidate on access', 'Time-based', 'Manual only']),
      number('revalidateInterval', 'Revalidation interval', 'How long to keep results before fetching a fresh copy.', 60, 1, 10080, 'minutes', { when: ['staleness', 'Time-based'] }),
    ] },
    { title: 'Decker snapshot', fields: [
      toggle('deckerRemote', 'Allow remote snapshot refresh', 'Opt in before replacing the bundled offline catalog.', false),
    ] },
  ] },
  { id: 'sharing', label: 'Sharing & Obscura', description: 'Your pack, with a little help from your friends.', groups: [
    { title: 'GitHub', fields: [
      select('githubMethod', 'Connection method', 'Choose device authorization or a personal access token.', 'Device flow', ['Device flow', 'Token']),
      text('namespace', 'Repository namespace', 'User or organization where new modpack repositories belong.', '', { placeholder: 'your-github-name' }),
      select('visibility', 'Default repository visibility', 'Private repositories are visible only to people you invite.', 'Private', ['Private', 'Public']),
    ] },
    { title: 'Sharing permissions', fields: [
      select('shareRights', 'Share code permissions', 'Choose what someone with your code can do.', 'Read-only', ['Read-only', 'Propose changes (PR rights)'], game),
      select('approval', 'Mod request approval', 'Keep control of contributions to a shared instance.', 'Require approval', ['Require approval', 'Auto-merge from trusted friends'], game),
      text('trustedFriends', 'Trusted friends', 'Comma-separated GitHub usernames allowed to auto-merge proposals.', '', { ...game, placeholder: 'friend-one, friend-two', when: ['approval', 'Auto-merge from trusted friends'] }),
    ] },
    { title: 'Snapshots & history', fields: [
      select('commitCadence', 'Auto-commit cadence', 'Save a snapshot when your instance changes, or only when you ask.', 'On instance change', ['On instance change', 'Every 15 minutes', 'Manual snapshots'], game),
      select('retention', 'Rollback retention', 'Preview history removal before reducing the retention window.', '30 days', ['7 days', '30 days', '90 days', 'Forever'], game),
    ] },
  ] },
  { id: 'servers', label: 'Servers', description: 'A place to play together. Sensible defaults for Docker servers.', groups: [
    { title: 'Docker engine', fields: [
      toggle('dockerAuto', 'Auto-detect Docker host', 'Sample host: local Docker Desktop via named pipe.', true),
      text('dockerHost', 'Docker socket or host', 'Override the connection to your Docker engine.', 'npipe:////./pipe/docker_engine', { when: ['dockerAuto', false] }),
      text('dockerImage', 'Default server image', 'Container image used when creating a server.', 'itzg/minecraft-server:java21'),
    ] },
    { title: 'Resources & storage', fields: [
      number('serverCpu', 'CPU limit', 'Maximum CPU cores allocated to a server.', 2, 1, 32, 'cores'),
      number('serverRam', 'RAM limit', 'Maximum server container memory.', 4, 1, 64, 'GB'),
      number('portStart', 'Port range start', 'First port available for new servers.', 25565, 1024, 65535, 'port'),
      number('portEnd', 'Port range end', 'Last port available for new servers.', 25575, 1024, 65535, 'port'),
      text('volume', 'Data volume location', 'Keep worlds outside the container so they survive image updates.', 'C:\\Users\\Admin\\AppData\\Roaming\\Tachyon\\servers'),
    ] },
    { title: 'World protection', fields: [
      select('backup', 'Automatic world backups', 'Create a recoverable copy of your worlds on a schedule.', 'Every 6 hours', ['Off', 'Every hour', 'Every 6 hours', 'Daily']),
      select('restart', 'Restart on crash', 'Choose how Docker recovers an unexpectedly stopped server.', 'On failure', ['Never', 'On failure', 'Unless stopped']),
    ] },
  ] },
  { id: 'appearance', label: 'Appearance', description: 'Find your shade. Give the launcher a little of your personality.', groups: [
    { title: 'Comfort & layout', fields: [
      toggle('reducedMotion', 'Reduced motion', 'Preview quieter transitions on this settings page.', false),
      select('sidebar', 'Default sidebar state', 'Preferred launcher navigation state on your next launch.', 'Rail', ['Rail', 'Expanded']),
      select('density', 'Interface density', 'Preview the spacing of settings controls.', 'Comfortable', ['Comfortable', 'Compact']),
    ] },
  ] },
  { id: 'accounts', label: 'Accounts', description: 'Who you play as, and what follows you between worlds.', groups: [
    { title: 'Offline play', fields: [
      select('offlineMode', 'Offline account policy', 'Offline play uses a previously verified account. Unverified profiles are clearly labeled.', 'Verified accounts only', ['Verified accounts only', 'Allow unverified local profiles']),
      toggle('skinCache', 'Cache account skins', 'Keep skins available when the launcher cannot reach the skin service.', true),
    ] },
  ] },
  { id: 'privacy', label: 'Privacy & diagnostics', description: 'Your launcher, your data. Sharing diagnostics is always your choice.', groups: [
    { title: 'What you share', fields: [
      toggle('telemetry', 'Anonymous telemetry', 'Share launcher usage metrics. Off by default.', false),
      toggle('crashReports', 'Send crash reports', 'Opt in to sharing launcher errors and crash diagnostics.', false),
    ] },
    { title: 'Local diagnostics', fields: [
      select('logLevel', 'Log level', 'More detailed logs use more disk space.', 'Info', ['Error', 'Warn', 'Info', 'Debug', 'Trace']),
    ] },
  ] },
  { id: 'advanced', label: 'Advanced', description: 'A few escape hatches, for when you know exactly what you need.', groups: [
    { title: 'Experimental features', description: 'Preview flags only. These do not enable unfinished backend features.', fields: [
      toggle('flagReflink', 'Experimental reflink engine', 'Try copy-on-write storage on supported filesystems.', false),
      toggle('flagDecker', 'Decker incremental refresh', 'Update only the changed portions of a remote snapshot.', false),
      toggle('flagObscura', 'Obscura collaborative requests', 'Preview pull-request-based modpack collaboration.', false),
    ] },
  ] },
];

export const ALL_FIELDS = CATEGORIES.flatMap(category => category.groups.flatMap(group => group.fields));
export const DEFAULTS: Values = Object.fromEntries(ALL_FIELDS.map(field => [field.id, field.default]));
export const STORAGE_KEY = 'tachyon.settings-preview.v1';
export const INSTANCES = [
  { id: 'vanilla', name: 'Vanilla 1.21.4' },
  { id: 'create', name: 'Create & Magic' },
  { id: 'hardcore', name: 'Hardcore SMP' },
];
export interface PreviewState {
  version: 1;
  global: Values;
  overrides: Record<string, Values>;
  theme: string;
}
export function pairedMemoryOverrides(global: Values, values: Values): Values {
  if (!Object.prototype.hasOwnProperty.call(values, 'memoryMin') && !Object.prototype.hasOwnProperty.call(values, 'memoryMax')) return values;
  return { ...values, memoryMin: values.memoryMin ?? global.memoryMin, memoryMax: values.memoryMax ?? global.memoryMax };
}
export const THEMES = [
  { id: 'beni', name: 'Dark Beni', background: '#150e11', border: '#28171e', surface: '#3c222c', secondary: '#69404b', primary: '#a16776', text: '#f4e8ed' },
  { id: 'crimson', name: 'Dusk Crimson', background: '#160c0e', border: '#30191d', surface: '#482329', secondary: '#743b43', primary: '#b36a70', text: '#f7e9e7' },
  { id: 'plum', name: 'Deep Plum', background: '#130f19', border: '#251e30', surface: '#392d47', secondary: '#5d496f', primary: '#9e83b1', text: '#eee8f5' },
  { id: 'pink', name: 'Pink', background: '#25171f', border: '#3c2633', surface: '#563548', secondary: '#80536e', primary: '#d29ab9', text: '#fff0f8' },
];
export const freshState = (): PreviewState => ({ version: 1, global: { ...DEFAULTS }, overrides: {}, theme: 'current' });

// Only known keys and valid values enter the prototype, including after import.
function validValue(field: Setting, value: unknown): value is SettingValue {
  if (field.type === 'toggle') return typeof value === 'boolean';
  if (field.type === 'number') return typeof value === 'number' && Number.isFinite(value) && value >= field.min! && value <= field.max! && Number.isInteger(value);
  return typeof value === 'string' && value.length <= 12000 && (!field.options || field.options.includes(value));
}
export function parseState(value: unknown): PreviewState {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('global' in value) || !value.global || typeof value.global !== 'object') throw new Error('Choose a Tachyon settings preview export (version 1).');
  const source = value as PreviewState;
  const result = freshState();
  for (const field of ALL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source.global, field.id)) {
      if (!validValue(field, source.global[field.id])) throw new Error(`Invalid value for ${field.label}.`);
      result.global[field.id] = source.global[field.id];
    }
  }
  if (source.overrides && typeof source.overrides === 'object') {
    for (const instance of INSTANCES) {
      const values = source.overrides[instance.id];
      if (!values || typeof values !== 'object') continue;
      result.overrides[instance.id] = {};
      for (const field of ALL_FIELDS.filter(item => item.instance)) {
        if (Object.prototype.hasOwnProperty.call(values, field.id)) {
          if (!validValue(field, values[field.id])) throw new Error(`Invalid override for ${field.label}.`);
          result.overrides[instance.id][field.id] = values[field.id];
        }
      }
      result.overrides[instance.id] = pairedMemoryOverrides(result.global, result.overrides[instance.id]);
    }
  }
  result.theme = source.theme === 'current' || THEMES.some(theme => theme.id === source.theme) ? source.theme : 'current';
  for (const values of [result.global, ...INSTANCES.map(instance => ({ ...result.global, ...result.overrides[instance.id] }))]) {
    if (Number(values.memoryMin) > Number(values.memoryMax)) throw new Error('Minimum memory cannot exceed maximum memory.');
  }
  if (Number(result.global.portStart) > Number(result.global.portEnd)) throw new Error('Port range start cannot exceed its end.');
  return result;
}
export function loadState(): PreviewState {
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? parseState(JSON.parse(saved)) : freshState(); }
  catch { return freshState(); }
}

export const JVM_PRESETS: Record<string, string> = {
  Default: '-XX:+UseG1GC',
  'Aikar’s flags': '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1',
  GraalVM: '-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:+EnableJVMCI',
  ZGC: '-XX:+UseZGC',
};

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const rgb = hex.replace('#', '').match(/.{2}/g)!.map(channel => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
