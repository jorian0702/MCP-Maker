/**
 * Scenario Tools - AI-powered scenario generation via Gemini API
 * Logic ported from ShunsukeHayashi/rpgmaker-mz-mcp (MIT), adapted for SDK v1.0 + Zod
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import { SafeWriter } from "../utils/safeWriter.js";
import type { RPGMap, RPGMapInfo } from "../utils/types.js";

// ============================================================================
// Schemas
// ============================================================================

const generateScenarioSchema = z.object({
    theme: z
        .string()
        .describe("Game theme/concept (e.g. 'medieval fantasy adventure with dragons')"),
    style: z
        .string()
        .default("adventure")
        .describe("Narrative style (e.g. 'epic', 'dark', 'comedy', 'mystery')"),
    length: z
        .enum(["short", "medium", "long"])
        .default("medium")
        .describe("Scenario length: short (3-5 maps), medium (5-10 maps), long (10-20 maps)"),
});

const implementScenarioSchema = z.object({
    scenario_json: z
        .string()
        .describe("JSON string of a GeneratedScenario object (from generate_scenario output)"),
});

const generateAndImplementSchema = z.object({
    theme: z.string().describe("Game theme/concept"),
    style: z.string().default("adventure").describe("Narrative style"),
    length: z.enum(["short", "medium", "long"]).default("medium").describe("Scenario length"),
});

// ============================================================================
// Types
// ============================================================================

interface GeneratedScenario {
    title: string;
    synopsis: string;
    maps: { id: number; name: string; description: string; width: number; height: number }[];
    characters: { id: number; name: string; classId: number; className: string; description: string }[];
    events: { mapId: number; eventId: number; name: string; x: number; y: number; dialogues: string[] }[];
    items: { id: number; name: string; description: string; type: string }[];
    skills: { id: number; name: string; description: string; mpCost: number }[];
}

// ============================================================================
// Helpers
// ============================================================================

const LENGTH_GUIDE: Record<string, string> = {
    short: "3-5 maps, 2-3 characters, 5-8 events",
    medium: "5-10 maps, 4-6 characters, 10-15 events",
    long: "10-20 maps, 6-10 characters, 20-30 events",
};

function buildScenarioPrompt(theme: string, style: string, length: string): string {
    return `Generate a complete RPG game scenario in JSON format for RPG Maker MZ.

Theme: ${theme}
Style: ${style}
Length: ${length} (${LENGTH_GUIDE[length] ?? LENGTH_GUIDE.medium})

Return a JSON object with this structure:
{
  "title": "Game title",
  "synopsis": "Brief story synopsis",
  "maps": [
    { "id": 1, "name": "Map name", "description": "Map description", "width": 17, "height": 13 }
  ],
  "characters": [
    { "id": 1, "name": "Character name", "classId": 1, "className": "Class name", "description": "Description" }
  ],
  "events": [
    { "mapId": 1, "eventId": 1, "name": "Event name", "x": 10, "y": 10, "dialogues": ["Line 1", "Line 2"] }
  ],
  "items": [
    { "id": 1, "name": "Item name", "description": "Item description", "type": "consumable" }
  ],
  "skills": [
    { "id": 1, "name": "Skill name", "description": "Skill description", "mpCost": 10 }
  ]
}

Requirements:
- A clear main quest and story arc
- Interesting characters with unique personalities
- Meaningful dialogues that advance the plot
- Appropriate maps for different story beats
- Items and skills that fit the theme
- Logical progression and pacing

IMPORTANT: Return ONLY valid JSON, no additional text.`;
}

function createDefaultEventPage() {
    return {
        conditions: {
            actorId: 1, actorValid: false,
            itemId: 1, itemValid: false,
            selfSwitchCh: "A", selfSwitchValid: false,
            switch1Id: 1, switch1Valid: false,
            switch2Id: 1, switch2Valid: false,
            variableId: 1, variableValid: false, variableValue: 0,
        },
        directionFix: false,
        image: { characterIndex: 0, characterName: "", direction: 2, pattern: 1, tileId: 0 },
        list: [{ code: 0, indent: 0, parameters: [] as unknown[] }],
        moveFrequency: 3,
        moveRoute: { list: [{ code: 0, parameters: [] as unknown[] }], repeat: true, skippable: false, wait: false },
        moveSpeed: 3,
        moveType: 0,
        priorityType: 1,
        stepAnime: false,
        through: false,
        trigger: 0,
        walkAnime: true,
    };
}

async function callGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY environment variable is required. Set it in your MCP server configuration.",
        );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 1.0,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("No content returned from Gemini API");
    }
    return text;
}

// ============================================================================
// Implementation
// ============================================================================

async function implementScenarioOnProject(
    fileHandler: FileHandler,
    safeWriter: SafeWriter,
    scenario: GeneratedScenario,
): Promise<string[]> {
    const log: string[] = [];

    // 1. Create classes
    const createdClasses = new Set<number>();
    for (const char of scenario.characters) {
        if (createdClasses.has(char.classId)) continue;
        createdClasses.add(char.classId);
        try {
            const classes = await fileHandler.readJson<(unknown | null)[]>("data/Classes.json");
            while (classes.length <= char.classId) classes.push(null);
            classes[char.classId] = {
                id: char.classId,
                name: char.className,
                expParams: [30, 20, 30, 30],
                traits: [{ code: 51, dataId: 1, value: 1 }],
                learnings: [{ level: 1, note: "", skillId: 1 }],
                note: char.description || "",
                params: [
                    [500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [12, 24, 36, 48, 60, 72, 84, 96, 108, 120],
                    [11, 22, 33, 44, 55, 66, 77, 88, 99, 110],
                    [12, 24, 36, 48, 60, 72, 84, 96, 108, 120],
                    [11, 22, 33, 44, 55, 66, 77, 88, 99, 110],
                    [12, 24, 36, 48, 60, 72, 84, 96, 108, 120],
                    [11, 22, 33, 44, 55, 66, 77, 88, 99, 110],
                ],
            };
            await safeWriter.writeToDatabase("Classes.json", classes);
            log.push(`Class: ${char.className} (ID ${char.classId})`);
        } catch (e) {
            log.push(`[WARN] Class ${char.classId}: ${e}`);
        }
    }

    // 2. Create actors
    for (const char of scenario.characters) {
        try {
            const actors = await fileHandler.readJson<(unknown | null)[]>("data/Actors.json");
            while (actors.length <= char.id) actors.push(null);
            actors[char.id] = {
                id: char.id,
                battlerName: "",
                characterIndex: 0,
                characterName: "Actor1",
                classId: char.classId,
                equips: [1, 1, 2, 3, 0],
                faceIndex: 0,
                faceName: "Actor1",
                traits: [],
                initialLevel: 1,
                maxLevel: 99,
                name: char.name,
                nickname: "",
                note: char.description || "",
                profile: char.description || "",
            };
            await safeWriter.writeToDatabase("Actors.json", actors);
            log.push(`Actor: ${char.name} (ID ${char.id})`);
        } catch (e) {
            log.push(`[WARN] Actor ${char.id}: ${e}`);
        }
    }

    // 3. Create maps
    for (const mapDef of scenario.maps) {
        try {
            const w = mapDef.width || 17;
            const h = mapDef.height || 13;
            const mapData: RPGMap = {
                displayName: mapDef.name,
                tilesetId: 1,
                width: w,
                height: h,
                scrollType: 0,
                specifyBattleback: false,
                battleback1Name: "",
                battleback2Name: "",
                autoplayBgm: false,
                bgm: { name: "", pan: 0, pitch: 100, volume: 90 },
                autoplayBgs: false,
                bgs: { name: "", pan: 0, pitch: 100, volume: 90 },
                disableDashing: false,
                encounterList: [],
                encounterStep: 30,
                parallaxName: "",
                parallaxLoopX: false,
                parallaxLoopY: false,
                parallaxSx: 0,
                parallaxSy: 0,
                parallaxShow: false,
                data: new Array(w * h * 6).fill(0),
                events: [null],
                note: mapDef.description || "",
            };
            const mapInfo: RPGMapInfo = {
                id: mapDef.id,
                name: mapDef.name,
                parentId: 0,
                expanded: false,
                scrollX: 0,
                scrollY: 0,
                order: mapDef.id,
            };
            await safeWriter.writeMap(mapDef.id, mapData, mapInfo);
            log.push(`Map: ${mapDef.name} (ID ${mapDef.id}, ${w}x${h})`);
        } catch (e) {
            log.push(`[WARN] Map ${mapDef.id}: ${e}`);
        }
    }

    // 4. Create items
    for (const item of scenario.items) {
        try {
            const items = await fileHandler.readJson<(unknown | null)[]>("data/Items.json");
            while (items.length <= item.id) items.push(null);
            items[item.id] = {
                id: item.id,
                animationId: -1,
                consumable: true,
                damage: { critical: false, elementId: 0, formula: "0", type: 0, variance: 20 },
                description: item.description || "",
                effects: [],
                hitType: 0,
                iconIndex: 0,
                itypeId: 1,
                name: item.name,
                note: "",
                occasion: 0,
                price: 0,
                repeats: 1,
                scope: 0,
                speed: 0,
                successRate: 100,
                tpGain: 0,
            };
            await safeWriter.writeToDatabase("Items.json", items);
            log.push(`Item: ${item.name} (ID ${item.id})`);
        } catch (e) {
            log.push(`[WARN] Item ${item.id}: ${e}`);
        }
    }

    // 5. Create skills
    for (const skill of scenario.skills) {
        try {
            const skills = await fileHandler.readJson<(unknown | null)[]>("data/Skills.json");
            while (skills.length <= skill.id) skills.push(null);
            skills[skill.id] = {
                id: skill.id,
                animationId: -1,
                damage: { critical: false, elementId: 0, formula: "0", type: 0, variance: 20 },
                description: skill.description || "",
                effects: [],
                hitType: 0,
                iconIndex: 0,
                message1: "",
                message2: "",
                mpCost: skill.mpCost || 0,
                name: skill.name,
                note: "",
                occasion: 0,
                repeats: 1,
                requiredWtypeId1: 0,
                requiredWtypeId2: 0,
                scope: 0,
                speed: 0,
                stypeId: 1,
                successRate: 100,
                tpCost: 0,
                tpGain: 0,
            };
            await safeWriter.writeToDatabase("Skills.json", skills);
            log.push(`Skill: ${skill.name} (ID ${skill.id})`);
        } catch (e) {
            log.push(`[WARN] Skill ${skill.id}: ${e}`);
        }
    }

    // 6. Create events with dialogues
    for (const evt of scenario.events) {
        try {
            const mapFilename = `Map${String(evt.mapId).padStart(3, "0")}.json`;
            const mapData = await fileHandler.readJson<RPGMap>(`data/${mapFilename}`);

            while (mapData.events.length <= evt.eventId) {
                mapData.events.push(null);
            }

            const page = createDefaultEventPage();

            // Build command list with dialogue
            const commands: { code: number; indent: number; parameters: unknown[] }[] = [];
            if (evt.dialogues && evt.dialogues.length > 0) {
                commands.push({ code: 101, indent: 0, parameters: ["", 0, 0, 2] });
                for (const line of evt.dialogues) {
                    commands.push({ code: 401, indent: 0, parameters: [line] });
                }
            }
            commands.push({ code: 0, indent: 0, parameters: [] });
            page.list = commands;

            mapData.events[evt.eventId] = {
                id: evt.eventId,
                name: evt.name,
                x: evt.x,
                y: evt.y,
                pages: [page],
                note: "",
            };

            await safeWriter.writeToDatabase(mapFilename, mapData);
            log.push(`Event: ${evt.name} (Map ${evt.mapId}, ID ${evt.eventId})`);
        } catch (e) {
            log.push(`[WARN] Event ${evt.eventId} on Map ${evt.mapId}: ${e}`);
        }
    }

    return log;
}

// ============================================================================
// Registration
// ============================================================================

export function registerScenarioTools(
    server: McpServer,
    fileHandler: FileHandler,
    safeWriter: SafeWriter,
) {
    server.tool(
        "generate_scenario",
        "Generate a complete RPG scenario using Gemini AI. Returns a JSON scenario that can be passed to implement_scenario. Requires GEMINI_API_KEY env var.",
        generateScenarioSchema.shape,
        async (args) => {
            try {
                const { theme, style, length } = args;
                const prompt = buildScenarioPrompt(theme, style, length);
                const responseText = await callGemini(prompt);
                const scenario = JSON.parse(responseText) as GeneratedScenario;

                const summary = [
                    `Scenario Generated: "${scenario.title}"`,
                    `Synopsis: ${scenario.synopsis}`,
                    `Maps: ${scenario.maps?.length ?? 0}`,
                    `Characters: ${scenario.characters?.length ?? 0}`,
                    `Events: ${scenario.events?.length ?? 0}`,
                    `Items: ${scenario.items?.length ?? 0}`,
                    `Skills: ${scenario.skills?.length ?? 0}`,
                    "",
                    "Use implement_scenario with the JSON below to apply this to the project:",
                    "",
                    JSON.stringify(scenario, null, 2),
                ].join("\n");

                return { content: [{ type: "text" as const, text: summary }] };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        },
    );

    server.tool(
        "implement_scenario",
        "Implement a generated scenario into the current RPG Maker MZ project. Creates maps, characters, events, items, and skills.",
        implementScenarioSchema.shape,
        async (args) => {
            try {
                const scenario = JSON.parse(args.scenario_json) as GeneratedScenario;
                const log = await implementScenarioOnProject(fileHandler, safeWriter, scenario);

                return {
                    content: [{
                        type: "text" as const,
                        text: `Scenario "${scenario.title}" implemented.\n\nCreated:\n${log.join("\n")}`,
                    }],
                };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        },
    );

    server.tool(
        "generate_and_implement_scenario",
        "Generate a scenario with Gemini AI and immediately implement it into the project. One-step complete game content creation. Requires GEMINI_API_KEY.",
        generateAndImplementSchema.shape,
        async (args) => {
            try {
                const { theme, style, length } = args;

                // Generate
                const prompt = buildScenarioPrompt(theme, style, length);
                const responseText = await callGemini(prompt);
                const scenario = JSON.parse(responseText) as GeneratedScenario;

                // Implement
                const log = await implementScenarioOnProject(fileHandler, safeWriter, scenario);

                // Save scenario metadata
                try {
                    await fileHandler.writeJson("scenario.json", scenario);
                } catch {
                    // Non-critical
                }

                const summary = [
                    `Scenario "${scenario.title}" generated and implemented!`,
                    `Synopsis: ${scenario.synopsis}`,
                    "",
                    "Created:",
                    ...log,
                ].join("\n");

                return { content: [{ type: "text" as const, text: summary }] };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        },
    );
}
