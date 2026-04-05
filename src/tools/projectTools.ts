/**
 * Project Tools - analyze_project, get_system_info, get_common_events
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import type {
    RPGMapInfo, RPGMap, RPGEvent, RPGSystem,
    RPGActor, RPGClass, RPGItem, RPGSkill, RPGWeapon, RPGArmor, RPGEnemy, RPGState,
} from "../utils/types.js";

export function registerProjectTools(server: McpServer, fileHandler: FileHandler) {
    server.tool(
        "analyze_project",
        "Analyze the full project structure: database counts, map hierarchy, system settings, and plugin list",
        {},
        async () => {
            try {
                const count = async <T extends { name?: string }>(file: string): Promise<number> => {
                    try {
                        const data = await fileHandler.readJson<(T | null)[]>(`data/${file}`);
                        return data.filter((e) => e !== null && (e as any).name !== "").length;
                    } catch { return 0; }
                };

                const [actors, classes, skills, items, weapons, armors, enemies, states] = await Promise.all([
                    count("Actors.json"), count("Classes.json"), count("Skills.json"), count("Items.json"),
                    count("Weapons.json"), count("Armors.json"), count("Enemies.json"), count("States.json"),
                ]);

                let mapInfos: (RPGMapInfo | null)[] = [];
                try { mapInfos = await fileHandler.readJson<(RPGMapInfo | null)[]>("data/MapInfos.json"); } catch {}

                const maps = mapInfos.filter((m): m is RPGMapInfo => m !== null);

                let system: Partial<RPGSystem> = {};
                try { system = await fileHandler.readJson<RPGSystem>("data/System.json"); } catch {}

                const pluginFiles = await fileHandler.listFiles("js/plugins", ".js");

                const analysis = {
                    gameTitle: system.gameTitle || "Unknown",
                    startPosition: system.startMapId ? { mapId: system.startMapId, x: system.startX, y: system.startY } : null,
                    locale: system.locale || "ja_JP",
                    partyMembers: system.partyMembers || [],
                    database: { actors, classes, skills, items, weapons, armors, enemies, states },
                    maps: {
                        total: maps.length,
                        list: maps.map((m) => ({ id: m.id, name: m.name, parentId: m.parentId })),
                    },
                    plugins: pluginFiles.map((f) => f.replace(".js", "")),
                };

                return {
                    content: [{ type: "text" as const, text: JSON.stringify(analysis, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        "get_system_info",
        "Get detailed system settings (game title, start position, currency, party, switches, variables, etc.)",
        {},
        async () => {
            try {
                const system = await fileHandler.readJson<Record<string, unknown>>("data/System.json");

                const info = {
                    gameTitle: system.gameTitle,
                    versionId: system.versionId,
                    locale: system.locale,
                    currencyUnit: system.currencyUnit,
                    startMapId: system.startMapId,
                    startX: system.startX,
                    startY: system.startY,
                    partyMembers: system.partyMembers,
                    hasEncryptedImages: system.hasEncryptedImages ?? false,
                    hasEncryptedAudio: system.hasEncryptedAudio ?? false,
                    switchCount: Array.isArray(system.switches) ? (system.switches as unknown[]).length : 0,
                    variableCount: Array.isArray(system.variables) ? (system.variables as unknown[]).length : 0,
                };

                return {
                    content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        "get_common_events",
        "List all common events with their triggers and command counts",
        {},
        async () => {
            try {
                interface CommonEvent {
                    id: number;
                    name: string;
                    trigger: number;
                    switchId: number;
                    list: { code: number }[];
                }

                const data = await fileHandler.readJson<(CommonEvent | null)[]>("data/CommonEvents.json");
                const events = data
                    .filter((e): e is CommonEvent => e !== null && e.name !== "")
                    .map((e) => ({
                        id: e.id,
                        name: e.name,
                        trigger: e.trigger === 0 ? "None" : e.trigger === 1 ? "Autorun" : "Parallel",
                        switchId: e.switchId,
                        commandCount: e.list.length,
                    }));

                return {
                    content: [{ type: "text" as const, text: JSON.stringify(events, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );
}
