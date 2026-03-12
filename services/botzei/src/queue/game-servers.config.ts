export interface GameServerConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
}

// Hardcoded game server list — edit these with your actual server IPs
export const GAME_SERVERS: GameServerConfig[] = [
  { id: 'server-1', name: 'US East 1', ip: '0.0.0.0', port: 27016 },
  { id: 'server-2', name: 'US East 2', ip: '0.0.0.0', port: 27017 },
];
