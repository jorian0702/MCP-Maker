/**
 * Tile Tools - update_map_tile, fill_map_region, get_tileset_info
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import { SafeWriter } from "../utils/safeWriter.js";
import type { RPGMap, RPGTileset } from "../utils/types.js";

const updateTileSchema = z.object({
    mapId: z.number().int().min(1).describe("Map ID"),
    x: z.number().int().min(0).describe("X coordinate"),
    y: z.number().int().min(0).describe("Y coordinate"),
    layer: z.number().int().min(0).max(5).describe("Layer: 0=Ground A, 1=Ground B, 2=Building, 3=Building Upper, 4=Shadow, 5=Region"),
    tileId: z.number().int().min(0).describe("Tile ID from the tileset"),
});

const fillRegionSchema = z.object({
    mapId: z.number().int().min(1).describe("Map ID"),
    x1: z.number().int().min(0).describe("Start X coordinate"),
    y1: z.number().int().min(0).describe("Start Y coordinate"),
    x2: z.number().int().min(0).describe("End X coordinate"),
    y2: z.number().int().min(0).describe("End Y coordinate"),
    layer: z.number().int().min(0).max(5).describe("Layer (0-5)"),
    tileId: z.number().int().min(0).describe("Tile ID to fill with"),
});

const getTilesetInfoSchema = z.object({
    tilesetId: z.number().int().min(1).describe("Tileset ID"),
});

function getMapFilename(mapId: number): string {
    return `Map${String(mapId).padStart(3, "0")}.json`;
}

function getTileIndex(x: number, y: number, layer: number, width: number, height: number): number {
    return x + (y + layer * height) * width;
}

export function registerTileTools(server: McpServer, fileHandler: FileHandler, safeWriter: SafeWriter) {
    server.tool(
        "update_map_tile",
        "Update a single tile on a map at specific coordinates and layer",
        updateTileSchema.shape,
        async (args) => {
            try {
                const { mapId, x, y, layer, tileId } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);

                if (x >= map.width || y >= map.height) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `Error: Coordinates (${x},${y}) out of bounds for map ${map.width}x${map.height}`,
                        }],
                        isError: true,
                    };
                }

                const index = getTileIndex(x, y, layer, map.width, map.height);
                map.data[index] = tileId;

                await safeWriter.writeToDatabase(filename, map);

                return {
                    content: [{
                        type: "text" as const,
                        text: `Set tile at (${x},${y}) layer ${layer} to tileId ${tileId} on Map ${mapId}`,
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
        "fill_map_region",
        "Fill a rectangular region of a map with a specific tile",
        fillRegionSchema.shape,
        async (args) => {
            try {
                const { mapId, x1, y1, x2, y2, layer, tileId } = args;
                const filename = getMapFilename(mapId);

                if (!(await fileHandler.exists(`data/${filename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map ${mapId} not found` }],
                        isError: true,
                    };
                }

                const map = await fileHandler.readJson<RPGMap>(`data/${filename}`);
                const startX = Math.max(0, Math.min(x1, x2));
                const endX = Math.min(map.width - 1, Math.max(x1, x2));
                const startY = Math.max(0, Math.min(y1, y2));
                const endY = Math.min(map.height - 1, Math.max(y1, y2));

                let count = 0;
                for (let fy = startY; fy <= endY; fy++) {
                    for (let fx = startX; fx <= endX; fx++) {
                        const index = getTileIndex(fx, fy, layer, map.width, map.height);
                        map.data[index] = tileId;
                        count++;
                    }
                }

                await safeWriter.writeToDatabase(filename, map);

                return {
                    content: [{
                        type: "text" as const,
                        text: `Filled ${count} tiles (${startX},${startY})-(${endX},${endY}) layer ${layer} with tileId ${tileId} on Map ${mapId}`,
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
        "get_tileset_info",
        "Get tileset information including image names and passability flags",
        getTilesetInfoSchema.shape,
        async (args) => {
            try {
                const { tilesetId } = args;
                const tilesets = await fileHandler.readJson<(RPGTileset | null)[]>("data/Tilesets.json");

                if (tilesetId >= tilesets.length || !tilesets[tilesetId]) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Tileset ${tilesetId} not found` }],
                        isError: true,
                    };
                }

                const tileset = tilesets[tilesetId]!;
                const info = {
                    id: tileset.id,
                    name: tileset.name,
                    mode: tileset.mode === 0 ? "Field" : "Area",
                    tilesetNames: tileset.tilesetNames,
                    flagCount: tileset.flags.length,
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
}
