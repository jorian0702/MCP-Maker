/**
 * Search Tools - search_database, search_maps
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import type { RPGMapInfo, RPGMap, RPGEvent } from "../utils/types.js";

const searchDatabaseSchema = z.object({
    types: z.array(z.enum([
        "Actors", "Classes", "Skills", "Items", "Weapons", "Armors",
        "Enemies", "States", "Tilesets", "CommonEvents",
    ])).default(["Actors", "Classes", "Skills", "Items", "Weapons", "Armors", "Enemies", "States"])
        .describe("Database types to search"),
    nameContains: z.string().default("").describe("Filter entries whose name contains this text (case-insensitive)"),
    idMin: z.number().int().min(0).default(0).describe("Minimum ID"),
    idMax: z.number().int().min(0).default(9999).describe("Maximum ID"),
});

const searchMapsSchema = z.object({
    nameContains: z.string().default("").describe("Filter maps whose name contains this text"),
    hasEvents: z.boolean().default(false).describe("Only return maps that have at least one event"),
});

interface DatabaseEntry {
    id: number;
    name: string;
    [key: string]: unknown;
}

export function registerSearchTools(server: McpServer, fileHandler: FileHandler) {
    server.tool(
        "search_database",
        "Search across all game databases with name and ID filters",
        searchDatabaseSchema.shape,
        async (args) => {
            try {
                const { types, nameContains, idMin, idMax } = args;
                const results: Record<string, { id: number; name: string }[]> = {};

                for (const dbType of types) {
                    try {
                        const data = await fileHandler.readJson<(DatabaseEntry | null)[]>(`data/${dbType}.json`);
                        const filtered = data
                            .filter((entry): entry is DatabaseEntry =>
                                entry !== null &&
                                typeof entry.name === "string" &&
                                entry.name !== "" &&
                                entry.id >= idMin &&
                                entry.id <= idMax &&
                                (nameContains === "" || entry.name.toLowerCase().includes(nameContains.toLowerCase()))
                            )
                            .map((entry) => ({ id: entry.id, name: entry.name }));

                        if (filtered.length > 0) {
                            results[dbType] = filtered;
                        }
                    } catch {
                        // Skip databases that don't exist or can't be read
                    }
                }

                const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({ totalResults: totalCount, results }, null, 2),
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
        "search_maps",
        "Search maps by name or filter maps with events",
        searchMapsSchema.shape,
        async (args) => {
            try {
                const { nameContains, hasEvents } = args;
                const mapInfos = await fileHandler.readJson<(RPGMapInfo | null)[]>("data/MapInfos.json");

                const results: {
                    id: number;
                    name: string;
                    parentId: number;
                    eventCount: number;
                }[] = [];

                for (const info of mapInfos) {
                    if (!info) continue;
                    if (nameContains && !info.name.toLowerCase().includes(nameContains.toLowerCase())) continue;

                    const mapFilename = `Map${String(info.id).padStart(3, "0")}.json`;
                    let eventCount = 0;

                    try {
                        const map = await fileHandler.readJson<RPGMap>(`data/${mapFilename}`);
                        eventCount = map.events.filter((e): e is RPGEvent => e !== null).length;
                    } catch {
                        // Map file might not exist
                    }

                    if (hasEvents && eventCount === 0) continue;

                    results.push({
                        id: info.id,
                        name: info.name,
                        parentId: info.parentId,
                        eventCount,
                    });
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({ totalResults: results.length, maps: results }, null, 2),
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
