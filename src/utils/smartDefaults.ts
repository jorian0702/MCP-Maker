/**
 * Smart Defaults - Auto-infer icons, elements, stats, and positions from names/keywords
 * RPG Maker MZ default IconSet.png layout (16 columns x 20 rows = 320 icons)
 */

// ============================================================================
// Icon Inference
// ============================================================================

interface KeywordIcon {
    keywords: string[];
    icon: number;
}

const WEAPON_ICONS: KeywordIcon[] = [
    { keywords: ["短剣", "ダガー", "ナイフ", "dagger", "knife"],          icon: 96 },
    { keywords: ["剣", "ソード", "ブレード", "sword", "blade"],           icon: 97 },
    { keywords: ["大剣", "グレートソード", "greatsword", "claymore"],     icon: 98 },
    { keywords: ["聖剣", "光の剣", "holy", "sacred"],                     icon: 99 },
    { keywords: ["魔剣", "闇の剣", "dark sword", "cursed"],              icon: 100 },
    { keywords: ["炎の剣", "火の剣", "flame", "fire sword"],             icon: 101 },
    { keywords: ["氷の剣", "frost", "ice sword"],                        icon: 102 },
    { keywords: ["雷の剣", "thunder sword", "lightning"],                 icon: 103 },
    { keywords: ["斧", "アックス", "axe"],                                icon: 112 },
    { keywords: ["槍", "ランス", "スピア", "lance", "spear"],             icon: 113 },
    { keywords: ["弓", "ボウ", "bow"],                                    icon: 114 },
    { keywords: ["クロスボウ", "crossbow"],                               icon: 115 },
    { keywords: ["銃", "ガン", "gun", "pistol", "rifle"],                icon: 116 },
    { keywords: ["杖", "スタッフ", "ロッド", "staff", "rod", "wand"],    icon: 117 },
    { keywords: ["ムチ", "ウィップ", "whip"],                            icon: 118 },
    { keywords: ["爪", "クロー", "claw"],                                icon: 119 },
    { keywords: ["グローブ", "拳", "glove", "knuckle", "fist"],          icon: 120 },
    { keywords: ["フレイル", "メイス", "ハンマー", "flail", "mace", "hammer"], icon: 121 },
    { keywords: ["カタナ", "刀", "katana"],                              icon: 97 },
];

const ARMOR_ICONS: KeywordIcon[] = [
    { keywords: ["盾", "シールド", "shield"],                             icon: 128 },
    { keywords: ["兜", "ヘルム", "帽子", "helmet", "helm", "hat", "cap"], icon: 129 },
    { keywords: ["鎧", "アーマー", "armor", "armour", "plate"],          icon: 130 },
    { keywords: ["ローブ", "法衣", "robe", "cloak"],                     icon: 131 },
    { keywords: ["指輪", "リング", "ring"],                               icon: 132 },
    { keywords: ["首飾り", "ネックレス", "ペンダント", "amulet", "necklace"], icon: 133 },
    { keywords: ["腕輪", "ブレスレット", "bracelet"],                     icon: 134 },
    { keywords: ["ブーツ", "靴", "boots", "shoes"],                      icon: 135 },
    { keywords: ["マント", "cape"],                                      icon: 136 },
];

const ITEM_ICONS: KeywordIcon[] = [
    { keywords: ["ポーション", "薬", "回復薬", "potion", "heal"],         icon: 176 },
    { keywords: ["上級ポーション", "ハイポーション", "hi-potion"],        icon: 177 },
    { keywords: ["エリクサー", "万能薬", "elixir"],                      icon: 178 },
    { keywords: ["エーテル", "マジックウォーター", "ether", "mp"],        icon: 179 },
    { keywords: ["毒消し", "解毒", "antidote"],                          icon: 180 },
    { keywords: ["目薬", "eye"],                                         icon: 181 },
    { keywords: ["フェニックスの尾", "蘇生", "revive", "phoenix"],       icon: 182 },
    { keywords: ["テント", "tent"],                                      icon: 183 },
    { keywords: ["鍵", "キー", "key"],                                   icon: 192 },
    { keywords: ["宝石", "ジュエル", "gem", "jewel", "crystal"],         icon: 193 },
    { keywords: ["巻物", "スクロール", "scroll"],                        icon: 194 },
    { keywords: ["地図", "マップ", "map"],                               icon: 195 },
    { keywords: ["手紙", "書類", "letter", "document"],                  icon: 196 },
    { keywords: ["コイン", "メダル", "coin", "medal"],                   icon: 197 },
    { keywords: ["爆弾", "ボム", "bomb"],                                icon: 198 },
    { keywords: ["食料", "パン", "肉", "food", "bread", "meat"],         icon: 200 },
    { keywords: ["魚", "fish"],                                          icon: 201 },
    { keywords: ["素材", "鉱石", "ore", "material"],                     icon: 208 },
    { keywords: ["木材", "wood"],                                        icon: 209 },
    { keywords: ["布", "cloth", "fabric"],                               icon: 210 },
    { keywords: ["皮", "レザー", "leather", "hide"],                     icon: 211 },
];

const SKILL_ICONS: KeywordIcon[] = [
    { keywords: ["炎", "ファイア", "fire", "flame", "burn"],              icon: 64 },
    { keywords: ["氷", "ブリザド", "アイス", "ice", "frost", "blizzard"], icon: 65 },
    { keywords: ["雷", "サンダー", "thunder", "lightning", "bolt"],       icon: 66 },
    { keywords: ["水", "ウォータ", "water", "aqua", "flood"],            icon: 67 },
    { keywords: ["土", "アース", "ストーン", "earth", "stone", "quake"], icon: 68 },
    { keywords: ["風", "エアロ", "wind", "aero", "gale"],                icon: 69 },
    { keywords: ["光", "ホーリー", "holy", "light", "shine"],            icon: 70 },
    { keywords: ["闇", "ダーク", "dark", "shadow", "void"],              icon: 71 },
    { keywords: ["回復", "ケアル", "ヒール", "heal", "cure", "restore"], icon: 72 },
    { keywords: ["蘇生", "レイズ", "リザレク", "revive", "raise", "resurrect"], icon: 73 },
    { keywords: ["バリア", "プロテス", "protect", "barrier", "shield"],   icon: 74 },
    { keywords: ["ヘイスト", "加速", "haste", "speed", "quick"],         icon: 75 },
    { keywords: ["スロウ", "減速", "slow"],                              icon: 76 },
    { keywords: ["毒", "ポイズン", "poison", "toxic", "venom"],          icon: 77 },
    { keywords: ["眠り", "スリープ", "sleep"],                           icon: 78 },
    { keywords: ["混乱", "コンフュ", "confuse"],                         icon: 79 },
    { keywords: ["攻撃", "斬撃", "slash", "strike", "attack"],          icon: 80 },
    { keywords: ["突き", "刺突", "thrust", "pierce", "stab"],           icon: 81 },
    { keywords: ["乱れ打ち", "連撃", "multi", "barrage", "flurry"],     icon: 82 },
    { keywords: ["全体攻撃", "メテオ", "meteor", "apocalypse"],          icon: 83 },
    { keywords: ["吸収", "ドレイン", "drain", "absorb", "leech"],       icon: 84 },
];

const ENEMY_BATTLERS = [
    { keywords: ["スライム", "slime", "ゼリー", "jelly"],                name: "Slime" },
    { keywords: ["コウモリ", "バット", "bat"],                           name: "Bat" },
    { keywords: ["蜂", "ホーネット", "bee", "hornet", "wasp"],          name: "Hornet" },
    { keywords: ["蜘蛛", "スパイダー", "spider"],                       name: "Spider" },
    { keywords: ["蛇", "サーペント", "snake", "serpent"],               name: "Snake" },
    { keywords: ["ゴブリン", "goblin"],                                  name: "Goblin" },
    { keywords: ["オーク", "orc"],                                       name: "Orc" },
    { keywords: ["スケルトン", "骸骨", "skeleton"],                      name: "Skeleton" },
    { keywords: ["ゾンビ", "zombie"],                                    name: "Zombie" },
    { keywords: ["ゴースト", "幽霊", "ghost", "spirit"],                name: "Ghost" },
    { keywords: ["狼", "ウルフ", "wolf"],                                name: "Wolf" },
    { keywords: ["ドラゴン", "竜", "dragon"],                            name: "Dragon" },
    { keywords: ["デーモン", "悪魔", "demon", "devil"],                  name: "Demon" },
    { keywords: ["ゴーレム", "golem"],                                   name: "Golem" },
    { keywords: ["ミノタウロス", "minotaur"],                            name: "Minotaur" },
    { keywords: ["ガーゴイル", "gargoyle"],                              name: "Gargoyle" },
    { keywords: ["ワイバーン", "wyvern"],                                name: "Wyvern" },
    { keywords: ["リッチ", "lich"],                                      name: "Lich" },
    { keywords: ["サキュバス", "succubus"],                              name: "Succubus" },
    { keywords: ["ヴァンパイア", "吸血鬼", "vampire"],                   name: "Vampire" },
];

function matchKeyword(name: string, list: KeywordIcon[]): number | null {
    const lower = name.toLowerCase();
    for (const entry of list) {
        for (const kw of entry.keywords) {
            if (lower.includes(kw.toLowerCase())) return entry.icon;
        }
    }
    return null;
}

export function guessWeaponIcon(name: string): number {
    return matchKeyword(name, WEAPON_ICONS) ?? 97;
}

export function guessArmorIcon(name: string): number {
    return matchKeyword(name, ARMOR_ICONS) ?? 128;
}

export function guessItemIcon(name: string): number {
    return matchKeyword(name, ITEM_ICONS) ?? 176;
}

export function guessSkillIcon(name: string): number {
    return matchKeyword(name, SKILL_ICONS) ?? 64;
}

// ============================================================================
// Element Inference
// ============================================================================

const ELEMENT_KEYWORDS: { keywords: string[]; id: number }[] = [
    { keywords: ["物理", "斬", "突", "打", "physical"],  id: 1 },
    { keywords: ["炎", "火", "ファイア", "fire", "flame", "burn"], id: 2 },
    { keywords: ["氷", "ブリザド", "アイス", "ice", "frost", "cold"], id: 3 },
    { keywords: ["雷", "サンダー", "thunder", "lightning", "bolt"], id: 4 },
    { keywords: ["水", "ウォータ", "water", "aqua"],     id: 5 },
    { keywords: ["土", "アース", "earth", "stone"],      id: 6 },
    { keywords: ["風", "エアロ", "wind", "aero"],        id: 7 },
    { keywords: ["光", "ホーリー", "holy", "light"],     id: 8 },
    { keywords: ["闇", "ダーク", "dark", "shadow"],      id: 9 },
];

export function guessElement(name: string): number {
    const lower = name.toLowerCase();
    for (const entry of ELEMENT_KEYWORDS) {
        for (const kw of entry.keywords) {
            if (lower.includes(kw.toLowerCase())) return entry.id;
        }
    }
    return 0;
}

// ============================================================================
// Weapon Type Inference
// ============================================================================

const WEAPON_TYPE_KEYWORDS: { keywords: string[]; id: number }[] = [
    { keywords: ["短剣", "ダガー", "ナイフ", "dagger", "knife"],     id: 1 },
    { keywords: ["剣", "ソード", "ブレード", "sword", "blade", "カタナ", "刀", "katana"], id: 2 },
    { keywords: ["フレイル", "メイス", "ハンマー", "flail", "mace", "hammer"], id: 3 },
    { keywords: ["斧", "アックス", "axe"],                            id: 4 },
    { keywords: ["ムチ", "ウィップ", "whip"],                         id: 5 },
    { keywords: ["杖", "スタッフ", "ロッド", "staff", "rod", "wand"], id: 6 },
    { keywords: ["弓", "ボウ", "bow"],                                id: 7 },
    { keywords: ["クロスボウ", "crossbow"],                           id: 8 },
    { keywords: ["銃", "ガン", "gun", "pistol", "rifle"],            id: 9 },
    { keywords: ["爪", "クロー", "claw"],                             id: 10 },
    { keywords: ["グローブ", "拳", "glove", "knuckle", "fist"],      id: 11 },
    { keywords: ["槍", "ランス", "スピア", "lance", "spear"],         id: 12 },
];

export function guessWeaponType(name: string): number {
    const lower = name.toLowerCase();
    for (const entry of WEAPON_TYPE_KEYWORDS) {
        for (const kw of entry.keywords) {
            if (lower.includes(kw.toLowerCase())) return entry.id;
        }
    }
    return 2;
}

// ============================================================================
// Armor Type / Equip Slot Inference
// ============================================================================

export function guessArmorSlot(name: string): { atypeId: number; etypeId: number } {
    const lower = name.toLowerCase();
    if (/盾|シールド|shield/i.test(lower))              return { atypeId: 1, etypeId: 2 };
    if (/兜|ヘルム|帽子|hat|helm|cap|crown|冠/i.test(lower)) return { atypeId: 1, etypeId: 3 };
    if (/ローブ|法衣|robe|cloak/i.test(lower))          return { atypeId: 2, etypeId: 4 };
    if (/軽装|レザー|leather|軽鎧/i.test(lower))        return { atypeId: 3, etypeId: 4 };
    if (/鎧|アーマー|armor|plate|重装|ミスリル/i.test(lower)) return { atypeId: 4, etypeId: 4 };
    if (/指輪|リング|ネックレス|首飾|ペンダント|腕輪|ブレスレット|ブーツ|靴|マント|ring|necklace|amulet|bracelet|boots|cape/i.test(lower))
        return { atypeId: 1, etypeId: 5 };
    return { atypeId: 1, etypeId: 4 };
}

// ============================================================================
// Stat Inference (Power Level)
// ============================================================================

type PowerTier = "weak" | "normal" | "strong" | "boss" | "legendary";

const TIER_KEYWORDS: { keywords: string[]; tier: PowerTier }[] = [
    { keywords: ["最強", "究極", "伝説", "legendary", "ultimate", "supreme", "divine", "神"],  tier: "legendary" },
    { keywords: ["ボス", "boss", "魔王", "竜王", "大魔", "overlord"],                           tier: "boss" },
    { keywords: ["強い", "上級", "レア", "strong", "greater", "high", "advanced", "エクス", "ex"], tier: "strong" },
    { keywords: ["弱い", "初期", "木の", "銅の", "weak", "wooden", "copper", "basic", "練習"], tier: "weak" },
];

export function guessPowerTier(name: string): PowerTier {
    const lower = name.toLowerCase();
    for (const entry of TIER_KEYWORDS) {
        for (const kw of entry.keywords) {
            if (lower.includes(kw.toLowerCase())) return entry.tier;
        }
    }
    return "normal";
}

const WEAPON_STATS: Record<PowerTier, { atk: number; price: number }> = {
    weak:      { atk: 5,   price: 100 },
    normal:    { atk: 15,  price: 500 },
    strong:    { atk: 40,  price: 3000 },
    boss:      { atk: 80,  price: 10000 },
    legendary: { atk: 150, price: 50000 },
};

const ARMOR_STATS: Record<PowerTier, { def: number; mdf: number; price: number }> = {
    weak:      { def: 3,   mdf: 2,   price: 80 },
    normal:    { def: 10,  mdf: 8,   price: 400 },
    strong:    { def: 25,  mdf: 20,  price: 2500 },
    boss:      { def: 50,  mdf: 40,  price: 8000 },
    legendary: { def: 100, mdf: 80,  price: 40000 },
};

const ITEM_STATS: Record<PowerTier, { hpPct: number; hpFlat: number; price: number }> = {
    weak:      { hpPct: 0,  hpFlat: 50,   price: 20 },
    normal:    { hpPct: 30, hpFlat: 0,    price: 50 },
    strong:    { hpPct: 50, hpFlat: 200,  price: 300 },
    boss:      { hpPct: 100, hpFlat: 0,   price: 1000 },
    legendary: { hpPct: 100, hpFlat: 9999, price: 5000 },
};

const ENEMY_STATS: Record<PowerTier, { hp: number; mp: number; atk: number; def: number; mat: number; mdf: number; agi: number; luk: number; exp: number; gold: number }> = {
    weak:      { hp: 50,   mp: 0,   atk: 8,   def: 8,   mat: 5,   mdf: 5,   agi: 8,   luk: 5,   exp: 10,   gold: 5 },
    normal:    { hp: 200,  mp: 20,  atk: 20,  def: 18,  mat: 15,  mdf: 12,  agi: 15,  luk: 10,  exp: 50,   gold: 30 },
    strong:    { hp: 800,  mp: 80,  atk: 45,  def: 35,  mat: 40,  mdf: 30,  agi: 25,  luk: 20,  exp: 200,  gold: 150 },
    boss:      { hp: 3000, mp: 300, atk: 80,  def: 60,  mat: 70,  mdf: 50,  agi: 35,  luk: 30,  exp: 1000, gold: 500 },
    legendary: { hp: 10000, mp: 999, atk: 150, def: 100, mat: 120, mdf: 90, agi: 50,  luk: 50,  exp: 5000, gold: 3000 },
};

const SKILL_STATS: Record<PowerTier, { mpCost: number; power: number }> = {
    weak:      { mpCost: 3,   power: 2 },
    normal:    { mpCost: 8,   power: 4 },
    strong:    { mpCost: 20,  power: 6 },
    boss:      { mpCost: 50,  power: 8 },
    legendary: { mpCost: 100, power: 12 },
};

export function guessWeaponStats(name: string) {
    const tier = guessPowerTier(name);
    return { ...WEAPON_STATS[tier], tier };
}

export function guessArmorStats(name: string) {
    const tier = guessPowerTier(name);
    return { ...ARMOR_STATS[tier], tier };
}

export function guessItemStats(name: string) {
    const tier = guessPowerTier(name);
    return { ...ITEM_STATS[tier], tier };
}

export function guessEnemyStats(name: string) {
    const tier = guessPowerTier(name);
    return { ...ENEMY_STATS[tier], tier };
}

export function guessSkillStats(name: string) {
    const tier = guessPowerTier(name);
    return { ...SKILL_STATS[tier], tier };
}

export function guessSkillFormula(name: string): string {
    const element = guessElement(name);
    if (element >= 2 && element <= 9) {
        const { power } = guessSkillStats(name);
        return `a.mat * ${power} - b.mdf * 2`;
    }
    const { power } = guessSkillStats(name);
    return `a.atk * ${power} - b.def * 2`;
}

export function guessSkillScope(name: string): number {
    const lower = name.toLowerCase();
    if (/全体|オール|all|メテオ|meteor|apocalypse|ブリザガ|ファイガ|サンダガ/i.test(lower)) return 2;
    if (/回復|ケアル|ヒール|heal|cure|restore/i.test(lower)) return 7;
    if (/蘇生|レイズ|リザレク|revive|raise|resurrect/i.test(lower)) return 9;
    if (/バリア|プロテス|ヘイスト|protect|barrier|haste/i.test(lower)) return 7;
    if (/自分|self|使用者/i.test(lower)) return 11;
    return 1;
}

export function guessSkillDamageType(name: string): number {
    const lower = name.toLowerCase();
    if (/回復|ケアル|ヒール|heal|cure|restore/i.test(lower)) return 3;
    if (/mp回復|エーテル|ether/i.test(lower)) return 4;
    if (/吸収|ドレイン|drain|absorb/i.test(lower)) return 5;
    if (/バリア|プロテス|ヘイスト|バフ|protect|barrier|haste|buff/i.test(lower)) return 0;
    if (/蘇生|レイズ|revive/i.test(lower)) return 0;
    return 1;
}

// ============================================================================
// Enemy Battler Name Inference
// ============================================================================

export function guessEnemyBattler(name: string): string {
    const lower = name.toLowerCase();
    for (const entry of ENEMY_BATTLERS) {
        for (const kw of entry.keywords) {
            if (lower.includes(kw.toLowerCase())) return entry.name;
        }
    }
    return "";
}

// ============================================================================
// Position Inference (NPC / Event placement on map)
// ============================================================================

export function guessEventPosition(
    mapWidth: number,
    mapHeight: number,
    role: string,
): { x: number; y: number } {
    const lower = role.toLowerCase();
    const cx = Math.floor(mapWidth / 2);
    const cy = Math.floor(mapHeight / 2);
    const margin = 2;

    if (/入口|入り口|gate|entrance|門/i.test(lower))
        return { x: cx, y: mapHeight - margin };
    if (/出口|exit|奥|boss/i.test(lower))
        return { x: cx, y: margin };
    if (/店|ショップ|shop|商人|merchant/i.test(lower))
        return { x: Math.min(cx + 3, mapWidth - margin), y: cy };
    if (/宿|inn|酒場|tavern/i.test(lower))
        return { x: Math.max(cx - 3, margin), y: cy };
    if (/宝|treasure|chest|箱/i.test(lower))
        return { x: cx, y: margin + 1 };
    if (/村長|長老|elder|chief|王|king/i.test(lower))
        return { x: cx, y: cy - 2 };
    if (/衛兵|兵士|guard|soldier/i.test(lower))
        return { x: cx + 2, y: mapHeight - margin };

    return { x: cx, y: cy };
}

// ============================================================================
// NPC Character Sprite Inference
// ============================================================================

const NPC_SPRITES: { keywords: string[]; characterName: string; characterIndex: number }[] = [
    { keywords: ["村人", "町人", "住人", "villager", "citizen"],    characterName: "People1", characterIndex: 0 },
    { keywords: ["商人", "店", "merchant", "shop"],                 characterName: "People1", characterIndex: 1 },
    { keywords: ["兵士", "衛兵", "guard", "soldier", "騎士"],       characterName: "People1", characterIndex: 2 },
    { keywords: ["王", "king", "王様"],                             characterName: "People1", characterIndex: 3 },
    { keywords: ["女王", "queen", "姫", "princess"],                characterName: "People1", characterIndex: 4 },
    { keywords: ["老人", "長老", "村長", "elder", "chief", "老婆"], characterName: "People1", characterIndex: 5 },
    { keywords: ["子供", "少年", "少女", "child", "boy", "girl"],   characterName: "People1", characterIndex: 6 },
    { keywords: ["魔法使い", "魔術師", "wizard", "mage", "witch"],  characterName: "People2", characterIndex: 0 },
    { keywords: ["僧侶", "神官", "priest", "cleric"],              characterName: "People2", characterIndex: 1 },
    { keywords: ["盗賊", "シーフ", "thief", "rogue"],              characterName: "People2", characterIndex: 2 },
];

export function guessNpcSprite(name: string): { characterName: string; characterIndex: number } {
    const lower = name.toLowerCase();
    for (const entry of NPC_SPRITES) {
        for (const kw of entry.keywords) {
            if (lower.includes(kw.toLowerCase())) {
                return { characterName: entry.characterName, characterIndex: entry.characterIndex };
            }
        }
    }
    return { characterName: "People1", characterIndex: 0 };
}

// ============================================================================
// Item Type Inference (regular vs key item)
// ============================================================================

export function guessItemType(name: string): "regular" | "key" {
    const lower = name.toLowerCase();
    if (/鍵|キー|key|手紙|letter|地図|map|パスポート|passport|証明|medallion|メダリオン|紋章|crest|巻物|scroll|秘伝書|レシピ|recipe|日記|diary/i.test(lower)) {
        return "key";
    }
    return "regular";
}
