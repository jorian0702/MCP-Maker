/**
 * Event Tools - add_event, add_event_command, get_map_events, read_map_data
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import { SafeWriter } from "../utils/safeWriter.js";
import type { RPGMap, RPGEvent, RPGEventPage, RPGEventCommand } from "../utils/types.js";

const addEventSchema = z.object({
    mapId: z.number().int().min(1).describe("Map ID"),
    name: z.string().describe("Event name"),
    x: z.number().int().min(0).describe("X coordinate on the map"),
    y: z.number().int().min(0).describe("Y coordinate on the map"),
    characterName: z.string().default("").describe("Character sprite filename (e.g., 'People1')"),
    characterIndex: z.number().int().min(0).max(7).default(0).describe("Character sprite index (0-7)"),
    direction: z.number().int().default(2).describe("Facing direction: 2=Down, 4=Left, 6=Right, 8=Up"),
    trigger: z.number().int().min(0).max(4).default(0).describe("Trigger: 0=Action Button, 1=Player Touch, 2=Event Touch, 3=Autorun, 4=Parallel"),
    priorityType: z.number().int().min(0).max(2).default(1).describe("Priority: 0=Below characters, 1=Same as characters, 2=Above characters"),
});

const addEventCommandSchema = z.object({
    mapId: z.number().int().min(1).describe("Map ID"),
    eventId: z.number().int().min(1).describe("Event ID"),
    pageIndex: z.number().int().min(0).default(0).describe("Page index (0-based)"),
    code: z.number().int().describe("Event command code (e.g., 101=Show Text Header, 401=Text Body, 201=Transfer Player, 301=Battle)"),
    indent: z.number().int().min(0).default(0).describe("Indentation level for nested commands"),
    parameters: z.array(z.any()).describe("Command parameters array"),
    insertBefore: z.number().int().min(-1).default(-1).describe("Insert before this index (-1 = before the terminal command at end)"),
});

const getMapEventsSchema = z.object({
    mapId: z.number().int().min(1).describe("Map ID to read events from"),
});

const readMapDataSchema = z.object({
    mapId: z.number().int().min(1).describe("Map ID to read"),
});

function createDefaultEventPage(): RPGEventPage {
    return {
        conditions: {
            actorId: 1,
            actorValid: false,
            itemId: 1,
            itemValid: false,
            selfSwitchCh: "A",
            selfSwitchValid: false,
            switch1Id: 1,
            switch1Valid: false,
            switch2Id: 1,
            switch2Valid: false,
            variableId: 1,
            variableValid: false,
            variableValue: 0,
        },
        directionFix: false,
        image: {
            tileId: 0,
            characterName: "",
            direction: 2,
            pattern: 1,
            characterIndex: 0,
        },
        list: [{ code: 0, indent: 0, parameters: [] }],
        moveFrequency: 3,
        moveRoute: {
            list: [{ code: 0, parameters: [] }],
            repeat: true,
            skippable: false,
            wait: false,
        },
        moveSpeed: 3,
        moveType: 0,
        priorityType: 1,
        stepAnime: false,
        through: false,
        trigger: 0,
        walkAnime: true,
    };
}

function getMapFilename(mapId: number): string {
    return `Map${String(mapId).padStart(3, "0")}.json`;
}

export function registerEventTools(server: McpServer, fileHandler: FileHandler, safeWriter: SafeWriter) {
    server.tool(
        "read_map_data",
        "Read complete map data including dimensions, tileset, BGM, and event count",
        readMapDataSchema.shape,
        async (args) => {
            try {
                const { mapId } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);
                const eventCount = map.events.filter((e): e is RPGEvent => e !== null).length;

                const summary = {
                    mapId,
                    displayName: map.displayName,
                    width: map.width,
                    height: map.height,
                    tilesetId: map.tilesetId,
                    scrollType: map.scrollType,
                    bgm: map.autoplayBgm ? map.bgm : null,
                    bgs: map.autoplayBgs ? map.bgs : null,
                    encounterStep: map.encounterStep,
                    encounterList: map.encounterList,
                    eventCount,
                    parallaxName: map.parallaxName || null,
                    note: map.note || "",
                };

                return {
                    content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
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
        "get_map_events",
        "Get all events on a specific map with their positions and commands",
        getMapEventsSchema.shape,
        async (args) => {
            try {
                const { mapId } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);
                const events = map.events
                    .filter((e): e is RPGEvent => e !== null)
                    .map((e) => ({
                        id: e.id,
                        name: e.name,
                        x: e.x,
                        y: e.y,
                        pages: e.pages.length,
                        commandCounts: e.pages.map((p) => p.list.length),
                        triggers: e.pages.map((p) => p.trigger),
                        note: e.note || "",
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

    server.tool(
        "add_event",
        "Add a new event to a map at the specified coordinates",
        addEventSchema.shape,
        async (args) => {
            try {
                const { mapId, name, x, y, characterName, characterIndex, direction, trigger, priorityType } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);

                let newId = 1;
                for (let i = 1; i < map.events.length; i++) {
                    if (map.events[i] !== null) {
                        newId = i + 1;
                    }
                }
                if (map.events.length > newId) {
                    newId = map.events.length;
                }

                const page = createDefaultEventPage();
                page.image.characterName = characterName;
                page.image.characterIndex = characterIndex;
                page.image.direction = direction;
                page.trigger = trigger;
                page.priorityType = priorityType;

                const newEvent: RPGEvent = {
                    id: newId,
                    name,
                    x,
                    y,
                    pages: [page],
                    note: "",
                };

                while (map.events.length <= newId) {
                    map.events.push(null);
                }
                map.events[newId] = newEvent;

                await safeWriter.writeToDatabase(filename, map);

                return {
                    content: [{
                        type: "text" as const,
                        text: `Added event "${name}" (ID ${newId}) to Map ${mapId} at (${x}, ${y})`,
                    }],
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
        "add_event_command",
        "Add a command to an event page (show text, transfer player, battle, etc.)",
        addEventCommandSchema.shape,
        async (args) => {
            try {
                const { mapId, eventId, pageIndex, code, indent, parameters, insertBefore } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);

                if (eventId >= map.events.length || !map.events[eventId]) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Event ${eventId} not found on Map ${mapId}` }],
                        isError: true,
                    };
                }

                const event = map.events[eventId]!;

                if (pageIndex >= event.pages.length) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Page ${pageIndex} not found (event has ${event.pages.length} pages)` }],
                        isError: true,
                    };
                }

                const page = event.pages[pageIndex];
                const command: RPGEventCommand = { code, indent, parameters };

                if (insertBefore === -1) {
                    const termIdx = page.list.findIndex((c) => c.code === 0);
                    if (termIdx >= 0) {
                        page.list.splice(termIdx, 0, command);
                    } else {
                        page.list.push(command);
                        page.list.push({ code: 0, indent: 0, parameters: [] });
                    }
                } else {
                    page.list.splice(insertBefore, 0, command);
                }

                await safeWriter.writeToDatabase(filename, map);

                return {
                    content: [{
                        type: "text" as const,
                        text: `Added command (code=${code}) to Map ${mapId} Event ${eventId} Page ${pageIndex}`,
                    }],
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
