/**
 * Smart Create Tools - Create game content from just a name.
 * All icons, stats, elements, positions are auto-inferred.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import { SafeWriter } from "../utils/safeWriter.js";
import type { RPGItem, RPGSkill, RPGWeapon, RPGArmor, RPGEnemy, RPGMap, RPGEvent, RPGEventPage, RPGEventCommand } from "../utils/types.js";
import { EffectCode } from "../utils/types.js";
import {
    guessWeaponIcon, guessArmorIcon, guessItemIcon, guessSkillIcon,
    guessElement, guessWeaponType, guessArmorSlot,
    guessWeaponStats, guessArmorStats, guessItemStats, guessEnemyStats, guessSkillStats,
    guessSkillFormula, guessSkillScope, guessSkillDamageType,
    guessEnemyBattler, guessEventPosition, guessNpcSprite, guessItemType,
    guessPowerTier,
} from "../utils/smartDefaults.js";

// ============================================================================
// Schemas (minimal input required)
// ============================================================================

const smartWeaponSchema = z.object({
    name: z.string().describe("Weapon name (e.g. '炎の大剣', 'Ice Dagger'). Stats, icon, element, type are all auto-inferred from the name."),
    description: z.string().default("").describe("Optional description. Auto-generated if empty."),
});

const smartArmorSchema = z.object({
    name: z.string().describe("Armor name (e.g. 'ミスリルアーマー', 'Magic Shield'). Stats, slot, icon auto-inferred."),
    description: z.string().default("").describe("Optional description."),
});

const smartItemSchema = z.object({
    name: z.string().describe("Item name (e.g. '上級ポーション', '古びた鍵'). Type, effect, icon auto-inferred."),
    description: z.string().default("").describe("Optional description."),
});

const smartEnemySchema = z.object({
    name: z.string().describe("Enemy name (e.g. 'ドラゴンゾンビ', 'Goblin King'). All stats, rewards, battler auto-inferred."),
});

const smartSkillSchema = z.object({
    name: z.string().describe("Skill name (e.g. 'ヘルファイア', 'アイスストーム'). MP cost, formula, element, scope auto-inferred."),
    description: z.string().default("").describe("Optional description."),
});

const smartNpcSchema = z.object({
    name: z.string().describe("NPC event name (e.g. '村長', '武器屋の店主'). Sprite, position auto-inferred."),
    mapId: z.number().int().min(1).describe("Map ID to place the NPC on"),
    dialogue: z.string().default("").describe("What the NPC says when talked to. If empty, a placeholder is used."),
    role: z.string().default("").describe("Optional role hint for positioning (e.g. '店', '入口', 'ボス'). If empty, name is used."),
});

const smartBatchSchema = z.object({
    weapons: z.array(z.string()).default([]).describe("Array of weapon names to create"),
    armors: z.array(z.string()).default([]).describe("Array of armor names to create"),
    items: z.array(z.string()).default([]).describe("Array of item names to create"),
    enemies: z.array(z.string()).default([]).describe("Array of enemy names to create"),
    skills: z.array(z.string()).default([]).describe("Array of skill names to create"),
});

// ============================================================================
// Helpers
// ============================================================================

function getMapFilename(mapId: number): string {
    return `Map${String(mapId).padStart(3, "0")}.json`;
}

function autoDescription(name: string, category: string): string {
    const tier = guessPowerTier(name);
    const tierLabel: Record<string, string> = {
        weak: "初心者向けの", normal: "", strong: "上級者向けの",
        boss: "ボス級の", legendary: "伝説の",
    };
    return `${tierLabel[tier]}${name}`;
}

function createDefaultEventPage(): RPGEventPage {
    return {
        conditions: {
            actorId: 1, actorValid: false, itemId: 1, itemValid: false,
            selfSwitchCh: "A", selfSwitchValid: false,
            switch1Id: 1, switch1Valid: false, switch2Id: 1, switch2Valid: false,
            variableId: 1, variableValid: false, variableValue: 0,
        },
        directionFix: false,
        image: { tileId: 0, characterName: "", direction: 2, pattern: 1, characterIndex: 0 },
        list: [{ code: 0, indent: 0, parameters: [] as unknown[] }],
        moveFrequency: 3,
        moveRoute: { list: [{ code: 0, parameters: [] as unknown[] }], repeat: true, skippable: false, wait: false },
        moveSpeed: 3, moveType: 0, priorityType: 1,
        stepAnime: false, through: false, trigger: 0, walkAnime: true,
    };
}

// ============================================================================
// Registration
// ============================================================================

export function registerSmartCreateTools(
    server: McpServer,
    fileHandler: FileHandler,
    safeWriter: SafeWriter,
) {
    // -----------------------------------------------------------------------
    // smart_create_weapon
    // -----------------------------------------------------------------------
    server.tool(
        "smart_create_weapon",
        "Create a weapon from just its name. Icon, attack power, element, weapon type, and price are all auto-inferred from keywords in the name.",
        smartWeaponSchema.shape,
        async (args) => {
            try {
                const { name } = args;
                const description = args.description || autoDescription(name, "weapon");
                const icon = guessWeaponIcon(name);
                const element = guessElement(name);
                const wtypeId = guessWeaponType(name);
                const { atk, price } = guessWeaponStats(name);

                const weapons = await fileHandler.readJson<(RPGWeapon | null)[]>("data/Weapons.json");
                const newId = weapons.length;

                const weapon: RPGWeapon = {
                    id: newId, name, description, iconIndex: icon,
                    price, wtypeId, etypeId: 1,
                    params: [0, 0, atk, 0, 0, 0, 0, 0],
                    traits: element > 0 ? [{ code: 31, dataId: element, value: 1 }] : [],
                    animationId: 0, note: "",
                };
                weapons.push(weapon);
                await safeWriter.writeToDatabase("Weapons.json", weapons);

                return {
                    content: [{
                        type: "text" as const,
                        text: [
                            `Created weapon "${name}" (ID ${newId})`,
                            `  ATK: ${atk} | Price: ${price}G`,
                            `  Type: ${wtypeId} | Element: ${element} | Icon: ${icon}`,
                        ].join("\n"),
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );

    // -----------------------------------------------------------------------
    // smart_create_armor
    // -----------------------------------------------------------------------
    server.tool(
        "smart_create_armor",
        "Create armor from just its name. Defense, magic defense, equip slot, armor type, icon, and price are auto-inferred.",
        smartArmorSchema.shape,
        async (args) => {
            try {
                const { name } = args;
                const description = args.description || autoDescription(name, "armor");
                const icon = guessArmorIcon(name);
                const { atypeId, etypeId } = guessArmorSlot(name);
                const { def, mdf, price } = guessArmorStats(name);

                const armors = await fileHandler.readJson<(RPGArmor | null)[]>("data/Armors.json");
                const newId = armors.length;

                const armor: RPGArmor = {
                    id: newId, name, description, iconIndex: icon,
                    price, atypeId, etypeId,
                    params: [0, 0, 0, def, 0, mdf, 0, 0],
                    traits: [], note: "",
                };
                armors.push(armor);
                await safeWriter.writeToDatabase("Armors.json", armors);

                return {
                    content: [{
                        type: "text" as const,
                        text: [
                            `Created armor "${name}" (ID ${newId})`,
                            `  DEF: ${def} | MDF: ${mdf} | Price: ${price}G`,
                            `  Slot: etypeId=${etypeId} | Icon: ${icon}`,
                        ].join("\n"),
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );

    // -----------------------------------------------------------------------
    // smart_create_item
    // -----------------------------------------------------------------------
    server.tool(
        "smart_create_item",
        "Create an item from just its name. Recovery amount, type (regular/key), icon, and price are auto-inferred.",
        smartItemSchema.shape,
        async (args) => {
            try {
                const { name } = args;
                const description = args.description || autoDescription(name, "item");
                const icon = guessItemIcon(name);
                const itemType = guessItemType(name);
                const { hpPct, hpFlat, price } = guessItemStats(name);

                const items = await fileHandler.readJson<(RPGItem | null)[]>("data/Items.json");
                const newId = items.length;

                const effects: { code: number; dataId: number; value1: number; value2: number }[] = [];
                if (itemType === "regular" && (hpPct > 0 || hpFlat > 0)) {
                    effects.push({ code: EffectCode.RecoverHP, dataId: 0, value1: hpPct / 100, value2: hpFlat });
                }

                const item: RPGItem = {
                    id: newId, name, description, iconIndex: icon,
                    price, itypeId: itemType === "key" ? 2 : 1,
                    consumable: itemType !== "key",
                    scope: effects.length > 0 ? 7 : 0,
                    occasion: itemType === "key" ? 3 : 0,
                    animationId: 0,
                    damage: { type: 0, elementId: 0, formula: "0", variance: 20, critical: false },
                    effects, hitType: 0, repeats: 1, speed: 0,
                    successRate: 100, tpGain: 0, note: "",
                };
                items.push(item);
                await safeWriter.writeToDatabase("Items.json", items);

                const typeLabel = itemType === "key" ? "大事なもの" : "消費アイテム";
                return {
                    content: [{
                        type: "text" as const,
                        text: [
                            `Created item "${name}" (ID ${newId})`,
                            `  Type: ${typeLabel} | Price: ${price}G | Icon: ${icon}`,
                            effects.length > 0 ? `  HP Recovery: ${hpPct}% + ${hpFlat}` : "  (No recovery effect)",
                        ].join("\n"),
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );

    // -----------------------------------------------------------------------
    // smart_create_enemy
    // -----------------------------------------------------------------------
    server.tool(
        "smart_create_enemy",
        "Create an enemy from just its name. HP, ATK, DEF, rewards, and battler image are auto-inferred from keywords.",
        smartEnemySchema.shape,
        async (args) => {
            try {
                const { name } = args;
                const stats = guessEnemyStats(name);
                const battler = guessEnemyBattler(name);

                const enemies = await fileHandler.readJson<(RPGEnemy | null)[]>("data/Enemies.json");
                const newId = enemies.length;

                const enemy: RPGEnemy = {
                    id: newId, name, battlerName: battler, battlerHue: 0,
                    params: [stats.hp, stats.mp, stats.atk, stats.def, stats.mat, stats.mdf, stats.agi, stats.luk],
                    exp: stats.exp, gold: stats.gold,
                    dropItems: [
                        { kind: 0, dataId: 1, denominator: 1 },
                        { kind: 0, dataId: 1, denominator: 1 },
                        { kind: 0, dataId: 1, denominator: 1 },
                    ],
                    actions: [{ conditionParam1: 0, conditionParam2: 0, conditionType: 0, rating: 5, skillId: 1 }],
                    traits: [], note: "",
                };
                enemies.push(enemy);
                await safeWriter.writeToDatabase("Enemies.json", enemies);

                return {
                    content: [{
                        type: "text" as const,
                        text: [
                            `Created enemy "${name}" (ID ${newId}) [${stats.tier}]`,
                            `  HP: ${stats.hp} | ATK: ${stats.atk} | DEF: ${stats.def}`,
                            `  MAT: ${stats.mat} | MDF: ${stats.mdf} | AGI: ${stats.agi}`,
                            `  EXP: ${stats.exp} | Gold: ${stats.gold}`,
                            battler ? `  Battler: ${battler}` : "  Battler: (none - assign manually)",
                        ].join("\n"),
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );

    // -----------------------------------------------------------------------
    // smart_create_skill
    // -----------------------------------------------------------------------
    server.tool(
        "smart_create_skill",
        "Create a skill from just its name. MP cost, damage formula, element, scope, and icon are auto-inferred.",
        smartSkillSchema.shape,
        async (args) => {
            try {
                const { name } = args;
                const description = args.description || autoDescription(name, "skill");
                const icon = guessSkillIcon(name);
                const element = guessElement(name);
                const { mpCost } = guessSkillStats(name);
                const formula = guessSkillFormula(name);
                const scope = guessSkillScope(name);
                const damageType = guessSkillDamageType(name);

                const skills = await fileHandler.readJson<(RPGSkill | null)[]>("data/Skills.json");
                const newId = skills.length;

                const skill: RPGSkill = {
                    id: newId, name, description, iconIndex: icon,
                    stypeId: 1, scope, occasion: 1,
                    mpCost, tpCost: 0,
                    damage: { type: damageType, elementId: element, formula, variance: 20, critical: false },
                    effects: [], requiredWtypeId1: 0, requiredWtypeId2: 0,
                    speed: 0, successRate: 100, repeats: 1,
                    tpGain: 0, hitType: damageType > 0 ? 2 : 0,
                    animationId: 0, message1: "", message2: "", note: "",
                };
                skills.push(skill);
                await safeWriter.writeToDatabase("Skills.json", skills);

                const scopeLabel = ["-", "敵単体", "敵全体", "敵ランダム1", "敵ランダム2", "敵ランダム3", "敵ランダム4", "味方単体", "味方全体", "味方(戦闘不能)", "味方全体(戦闘不能)", "使用者"][scope] ?? `scope=${scope}`;
                return {
                    content: [{
                        type: "text" as const,
                        text: [
                            `Created skill "${name}" (ID ${newId})`,
                            `  MP: ${mpCost} | Formula: ${formula}`,
                            `  Scope: ${scopeLabel} | Element: ${element} | Icon: ${icon}`,
                        ].join("\n"),
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );

    // -----------------------------------------------------------------------
    // smart_add_npc
    // -----------------------------------------------------------------------
    server.tool(
        "smart_add_npc",
        "Place an NPC on a map from just a name and map ID. Sprite, position, and dialogue are auto-configured. Add a role hint like '店' or '入口' for better positioning.",
        smartNpcSchema.shape,
        async (args) => {
            try {
                const { name, mapId, dialogue, role } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);
                const hint = role || name;
                const { x, y } = guessEventPosition(map.width, map.height, hint);
                const sprite = guessNpcSprite(hint);

                let newId = 1;
                for (let i = 1; i < map.events.length; i++) {
                    if (map.events[i] !== null) newId = i + 1;
                }
                if (map.events.length > newId) newId = map.events.length;

                const page = createDefaultEventPage();
                page.image.characterName = sprite.characterName;
                page.image.characterIndex = sprite.characterIndex;
                page.image.direction = 2;
                page.trigger = 0;
                page.priorityType = 1;

                const text = dialogue || `...`;
                const commands: RPGEventCommand[] = [
                    { code: 101, indent: 0, parameters: ["", 0, 0, 2] },
                    { code: 401, indent: 0, parameters: [text] },
                    { code: 0, indent: 0, parameters: [] },
                ];
                page.list = commands;

                const event: RPGEvent = {
                    id: newId, name, x, y, pages: [page], note: "",
                };
                while (map.events.length <= newId) map.events.push(null);
                map.events[newId] = event;

                await safeWriter.writeToDatabase(filename, map);

                return {
                    content: [{
                        type: "text" as const,
                        text: [
                            `Placed NPC "${name}" (Event ID ${newId}) on Map ${mapId}`,
                            `  Position: (${x}, ${y})`,
                            `  Sprite: ${sprite.characterName}[${sprite.characterIndex}]`,
                            `  Dialogue: "${text}"`,
                        ].join("\n"),
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );

    // -----------------------------------------------------------------------
    // smart_batch_create
    // -----------------------------------------------------------------------
    server.tool(
        "smart_batch_create",
        "Create multiple weapons, armors, items, enemies, and skills at once from just their names. Everything is auto-inferred.",
        smartBatchSchema.shape,
        async (args) => {
            try {
                const log: string[] = [];

                for (const wName of args.weapons) {
                    const icon = guessWeaponIcon(wName);
                    const element = guessElement(wName);
                    const wtypeId = guessWeaponType(wName);
                    const { atk, price } = guessWeaponStats(wName);
                    const weapons = await fileHandler.readJson<(RPGWeapon | null)[]>("data/Weapons.json");
                    const id = weapons.length;
                    weapons.push({
                        id, name: wName, description: autoDescription(wName, "weapon"),
                        iconIndex: icon, price, wtypeId, etypeId: 1,
                        params: [0, 0, atk, 0, 0, 0, 0, 0],
                        traits: element > 0 ? [{ code: 31, dataId: element, value: 1 }] : [],
                        animationId: 0, note: "",
                    });
                    await safeWriter.writeToDatabase("Weapons.json", weapons);
                    log.push(`Weapon: ${wName} (ID ${id}, ATK ${atk})`);
                }

                for (const aName of args.armors) {
                    const icon = guessArmorIcon(aName);
                    const { atypeId, etypeId } = guessArmorSlot(aName);
                    const { def, mdf, price } = guessArmorStats(aName);
                    const armors = await fileHandler.readJson<(RPGArmor | null)[]>("data/Armors.json");
                    const id = armors.length;
                    armors.push({
                        id, name: aName, description: autoDescription(aName, "armor"),
                        iconIndex: icon, price, atypeId, etypeId,
                        params: [0, 0, 0, def, 0, mdf, 0, 0],
                        traits: [], note: "",
                    });
                    await safeWriter.writeToDatabase("Armors.json", armors);
                    log.push(`Armor: ${aName} (ID ${id}, DEF ${def})`);
                }

                for (const iName of args.items) {
                    const icon = guessItemIcon(iName);
                    const itemType = guessItemType(iName);
                    const { hpPct, hpFlat, price } = guessItemStats(iName);
                    const items = await fileHandler.readJson<(RPGItem | null)[]>("data/Items.json");
                    const id = items.length;
                    const effects: { code: number; dataId: number; value1: number; value2: number }[] = [];
                    if (itemType === "regular" && (hpPct > 0 || hpFlat > 0)) {
                        effects.push({ code: EffectCode.RecoverHP, dataId: 0, value1: hpPct / 100, value2: hpFlat });
                    }
                    items.push({
                        id, name: iName, description: autoDescription(iName, "item"),
                        iconIndex: icon, price, itypeId: itemType === "key" ? 2 : 1,
                        consumable: itemType !== "key", scope: effects.length > 0 ? 7 : 0,
                        occasion: itemType === "key" ? 3 : 0, animationId: 0,
                        damage: { type: 0, elementId: 0, formula: "0", variance: 20, critical: false },
                        effects, hitType: 0, repeats: 1, speed: 0,
                        successRate: 100, tpGain: 0, note: "",
                    });
                    await safeWriter.writeToDatabase("Items.json", items);
                    log.push(`Item: ${iName} (ID ${id})`);
                }

                for (const eName of args.enemies) {
                    const stats = guessEnemyStats(eName);
                    const battler = guessEnemyBattler(eName);
                    const enemies = await fileHandler.readJson<(RPGEnemy | null)[]>("data/Enemies.json");
                    const id = enemies.length;
                    enemies.push({
                        id, name: eName, battlerName: battler, battlerHue: 0,
                        params: [stats.hp, stats.mp, stats.atk, stats.def, stats.mat, stats.mdf, stats.agi, stats.luk],
                        exp: stats.exp, gold: stats.gold,
                        dropItems: [{ kind: 0, dataId: 1, denominator: 1 }, { kind: 0, dataId: 1, denominator: 1 }, { kind: 0, dataId: 1, denominator: 1 }],
                        actions: [{ conditionParam1: 0, conditionParam2: 0, conditionType: 0, rating: 5, skillId: 1 }],
                        traits: [], note: "",
                    });
                    await safeWriter.writeToDatabase("Enemies.json", enemies);
                    log.push(`Enemy: ${eName} (ID ${id}, HP ${stats.hp})`);
                }

                for (const sName of args.skills) {
                    const icon = guessSkillIcon(sName);
                    const element = guessElement(sName);
                    const { mpCost } = guessSkillStats(sName);
                    const formula = guessSkillFormula(sName);
                    const scope = guessSkillScope(sName);
                    const damageType = guessSkillDamageType(sName);
                    const skills = await fileHandler.readJson<(RPGSkill | null)[]>("data/Skills.json");
                    const id = skills.length;
                    skills.push({
                        id, name: sName, description: autoDescription(sName, "skill"),
                        iconIndex: icon, stypeId: 1, scope, occasion: 1,
                        mpCost, tpCost: 0,
                        damage: { type: damageType, elementId: element, formula, variance: 20, critical: false },
                        effects: [], requiredWtypeId1: 0, requiredWtypeId2: 0,
                        speed: 0, successRate: 100, repeats: 1, tpGain: 0,
                        hitType: damageType > 0 ? 2 : 0, animationId: 0,
                        message1: "", message2: "", note: "",
                    });
                    await safeWriter.writeToDatabase("Skills.json", skills);
                    log.push(`Skill: ${sName} (ID ${id}, MP ${mpCost})`);
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: `Batch created ${log.length} entries:\n${log.join("\n")}`,
                    }],
                };
            } catch (error) {
                return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
            }
        },
    );
}
