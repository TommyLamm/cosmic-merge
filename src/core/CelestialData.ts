export interface ICelestialConfig {
  tier: number;              // 1 ~ 11, 12 為黑洞
  id: string;                // 'asteroid', 'earth', 'sun', etc.
  name: string;              // 天體中文名稱
  radius: number;            // 物理與幾何半徑 (px)
  density: number;           // 質量密度係數
  restitution: number;       // 碰撞彈性係數
  score: number;             // 合成基礎加分
  spawnWeight: number;       // 發射槽抽取權重 (0 代表僅能合成)
  primaryColor: string;      // 核心主色調
  accentColor: string;       // 表面斑塊/紋理色
  glowColor: string;         // 大氣外散發光色
  diameterKm: string;        // 真實宇宙直徑
  scienceFact: string;       // 圖鑑天文科普小百科
}

export interface IMergeTask {
  bodyA: any;
  bodyB: any;
  nextTier: number;
  position: { x: number; y: number };
}

export interface IGameSaveData {
  highScore: number;
  unlockedTiers: number[];
  totalMerges: number;
  soundEnabled: boolean;
  schemaVersion: number;
}

export const CELESTIAL_CONFIGS: ICelestialConfig[] = [
  {
    tier: 1,
    id: 'asteroid',
    name: '微型小行星',
    radius: 16,
    density: 0.0010,
    restitution: 0.20,
    score: 1,
    spawnWeight: 40,
    primaryColor: '#8c827a',
    accentColor: '#5c544d',
    glowColor: 'rgba(160, 150, 140, 0.4)',
    diameterKm: '約 10 ~ 100 km',
    scienceFact: '太陽系初期星子碰撞遺留的岩石碎塊，主要分佈於火星與木星之間的小行星帶。'
  },
  {
    tier: 2,
    id: 'pluto',
    name: '矮行星·冥王星',
    radius: 24,
    density: 0.0012,
    restitution: 0.20,
    score: 3,
    spawnWeight: 30,
    primaryColor: '#b5c7d3',
    accentColor: '#8ca3b8',
    glowColor: 'rgba(126, 232, 250, 0.45)',
    diameterKm: '約 2,376 km',
    scienceFact: '柯伊伯帶中最大天體，曾被列為第九大行星，2006 年被國際天文聯合會重新劃分為矮行星。'
  },
  {
    tier: 3,
    id: 'mercury',
    name: '水星',
    radius: 32,
    density: 0.0015,
    restitution: 0.18,
    score: 6,
    spawnWeight: 20,
    primaryColor: '#9e9e9e',
    accentColor: '#616161',
    glowColor: 'rgba(144, 202, 249, 0.45)',
    diameterKm: '約 4,879 km',
    scienceFact: '離太陽最近的行星，幾乎沒有大氣層保溫，晝夜溫差可高達攝氏 600 度！'
  },
  {
    tier: 4,
    id: 'mars',
    name: '火星',
    radius: 42,
    density: 0.0018,
    restitution: 0.18,
    score: 10,
    spawnWeight: 10,
    primaryColor: '#e64a19',
    accentColor: '#bf360c',
    glowColor: 'rgba(255, 138, 101, 0.5)',
    diameterKm: '約 6,779 km',
    scienceFact: '紅色星球！地表覆蓋大量氧化鐵（鐵鏽），擁有太陽系最高的火山——奧林帕斯山。'
  },
  {
    tier: 5,
    id: 'venus',
    name: '金星',
    radius: 54,
    density: 0.0022,
    restitution: 0.16,
    score: 15,
    spawnWeight: 0,
    primaryColor: '#fbc02d',
    accentColor: '#f57f17',
    glowColor: 'rgba(255, 245, 157, 0.6)',
    diameterKm: '約 12,104 km',
    scienceFact: '擁有極度濃密的二氧化碳大氣與濃硫酸雲，失控溫室效應使其成為太陽系最熱的行星。'
  },
  {
    tier: 6,
    id: 'earth',
    name: '地球',
    radius: 68,
    density: 0.0026,
    restitution: 0.15,
    score: 21,
    spawnWeight: 0,
    primaryColor: '#1976d2',
    accentColor: '#388e3c',
    glowColor: 'rgba(100, 181, 246, 0.65)',
    diameterKm: '約 12,742 km',
    scienceFact: '目前已知唯一孕育生命的藍色奇蹟星球，地表約 71% 被液態水海洋所覆蓋。'
  },
  {
    tier: 7,
    id: 'neptune',
    name: '海王星',
    radius: 84,
    density: 0.0030,
    restitution: 0.14,
    score: 28,
    spawnWeight: 0,
    primaryColor: '#0d47a1',
    accentColor: '#002171',
    glowColor: 'rgba(128, 216, 255, 0.65)',
    diameterKm: '約 49,244 km',
    scienceFact: '太陽系最外側的大行星，屬於冰巨行星，大氣中甲烷吸收紅光呈現深邃蔚藍，風速高達時速 2,100 公里。'
  },
  {
    tier: 8,
    id: 'uranus',
    name: '天王星',
    radius: 102,
    density: 0.0035,
    restitution: 0.13,
    score: 36,
    spawnWeight: 0,
    primaryColor: '#26a69a',
    accentColor: '#00796b',
    glowColor: 'rgba(178, 235, 242, 0.65)',
    diameterKm: '約 50,724 km',
    scienceFact: '自轉軸傾斜達 97.8 度，宛如橫躺著繞太陽公轉，擁有極度奇特的極晝極夜循環與暗淡星環。'
  },
  {
    tier: 9,
    id: 'saturn',
    name: '土星',
    radius: 122,
    density: 0.0040,
    restitution: 0.12,
    score: 45,
    spawnWeight: 0,
    primaryColor: '#ffa000',
    accentColor: '#ff6f00',
    glowColor: 'rgba(255, 213, 79, 0.7)',
    diameterKm: '約 116,460 km',
    scienceFact: '太陽系中光環最為壯麗奪目的氣體巨行星，主要由無數細小冰粒、岩石顆粒組成。'
  },
  {
    tier: 10,
    id: 'jupiter',
    name: '木星',
    radius: 144,
    density: 0.0046,
    restitution: 0.10,
    score: 55,
    spawnWeight: 0,
    primaryColor: '#d84315',
    accentColor: '#bf360c',
    glowColor: 'rgba(255, 171, 145, 0.75)',
    diameterKm: '約 139,820 km',
    scienceFact: '太陽系行星之王！質量超過其他行星總和的兩倍以上，大紅斑是持續運轉數百年的巨大反氣旋風暴。'
  },
  {
    tier: 11,
    id: 'sun',
    name: '太陽 (恆星)',
    radius: 168,
    density: 0.0055,
    restitution: 0.08,
    score: 70,
    spawnWeight: 0,
    primaryColor: '#ff6d00',
    accentColor: '#ffab00',
    glowColor: 'rgba(255, 145, 0, 0.85)',
    diameterKm: '約 1,392,700 km',
    scienceFact: '太陽系的中心主序星，佔據整個太陽系質量的 99.86%，核心每秒都在進行劇烈的氫核融合釋放巨大能量！'
  },
  {
    tier: 12,
    id: 'blackhole',
    name: '終極黑洞·奇異點',
    radius: 192,
    density: 0.0080,
    restitution: 0.05,
    score: 250,
    spawnWeight: 0,
    primaryColor: '#000000',
    accentColor: '#120f26',
    glowColor: 'rgba(120, 180, 255, 0.95)',
    diameterKm: '事件視界 奇異點無限小',
    scienceFact: '時空曲率極大的終極奇異點天體，誕生時引發超新星全屏爆裂並一口吞噬周圍微型隕石！具有強大周邊引力井。'
  }
];

export function getRandomSpawnTier(): number {
  const spawnConfigs = CELESTIAL_CONFIGS.filter(c => c.spawnWeight > 0);
  const totalWeight = spawnConfigs.reduce((acc, c) => acc + c.spawnWeight, 0);
  let rand = Math.random() * totalWeight;
  for (const cfg of spawnConfigs) {
    if (rand < cfg.spawnWeight) {
      return cfg.tier;
    }
    rand -= cfg.spawnWeight;
  }
  return 1;
}
