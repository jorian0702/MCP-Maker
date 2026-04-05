/**
 * Map Tools - create_map, get_maps, update_map
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import { SafeWriter } from "../utils/safeWriter.js";
import type { RPGMap, RPGMapInfo } from "../utils/types.js";
import { ScrollType } from "../utils/types.js";

const createMapSchema = z.object({
    name: z.string().describe("Map name (shown in editor)"),
    displayName: z.string().default("").describe("Display name (shown in game)"),
    width: z.number().int().min(1).max(256).default(17).describe("Map width in tiles"),
    height: z.number().int().min(1).max(256).default(13).describe("Map height in tiles"),
    tilesetId: z.number().int().min(1).default(1).describe("Tileset ID to use"),
    scrollType: z.number().int().min(0).max(3).default(0).describe("Scroll type: 0=NoLoop, 1=Vertical, 2=Horizontal, 3=Both"),
    encounterSteps: z.number().int().min(1).max(999).default(30).describe("Average steps between encounters"),
    parentId: z.number().int().min(0).default(0).describe("Parent map ID for hierarchy"),
});

const updateMapSchema = z.object({
    id: z.number().int().min(1).describe("Map ID to update"),
    displayName: z.string().optional(),
    tilesetId: z.number().int().min(1).optional(),
    encounterSteps: z.number().int().min(1).max(999).optional(),
});

function createDefaultMap(width: number, height: number): RPGMap {
    // Map data array: width * height * 6 layers (A through R)
    const dataSize = width * height * 6;
    const data = new Array(dataSize).fill(0);

    // Fill ground layer (layer 0) with default grass tile (2816 = World_A2 grass)
    const groundTileId = 2816;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x);
            data[index] = groundTileId;
        }
    }

    return {
        displayName: "",
        tilesetId: 1,
        width,
        height,
        scrollType: ScrollType.NoLoop,
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
        data,
        events: [],
        note: "",
    };
}

export function registerMapTools(server: McpServer, fileHandler: FileHandler, safeWriter: SafeWriter) {
    // get_maps - List all maps
    server.tool(
        "get_maps",
        "Get all maps from the project",
        {},
        async () => {
            try {
                const mapInfos = await fileHandler.readJson<(RPGMapInfo | null)[]>("data/MapInfos.json");
                const mapList = mapInfos
                    .filter((m): m is RPGMapInfo => m !== null)
                    .map((m) => ({
                        id: m.id,
                        name: m.name,
                        parentId: m.parentId,
                        order: m.order,
                    }));

                return {
                    content: [{ type: "text" as const, text: JSON.stringify(mapList, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    // create_map - Create a new map
    server.tool(
        "create_map",
        "Create a new map in the project",
        createMapSchema.shape,
        async (args) => {
            try {
                const { name, displayName, width, height, tilesetId, scrollType, encounterSteps, parentId } = args;

                // Read MapInfos to determine next ID
                const mapInfos = await fileHandler.readJson<(RPGMapInfo | null)[]>("data/MapInfos.json");

                // Find next available ID
                let newId = 1;
                for (let i = 1; i < mapInfos.length; i++) {
                    if (mapInfos[i] !== null) {
                        newId = i + 1;
                    }
                }
                if (mapInfos.length > newId) {
                    newId = mapInfos.length;
                }

                // Calculate order (max order + 1)
                const maxOrder = mapInfos
                    .filter((m): m is RPGMapInfo => m !== null)
                    .reduce((max, m) => Math.max(max, m.order || 0), 0);

                // Create map data
                const mapData = createDefaultMap(width, height);
                mapData.displayName = displayName;
                mapData.tilesetId = tilesetId;
                mapData.scrollType = scrollType;
                mapData.encounterStep = encounterSteps;

                // Create map info
                const mapInfo: RPGMapInfo = {
                    id: newId,
                    name,
                    parentId,
                    expanded: false,
                    scrollX: 0,
                    scrollY: 0,
                    order: maxOrder + 1,
                };

                // Write map using SafeWriter
                await safeWriter.writeMap(newId, mapData, mapInfo);

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `Created map "${name}" with ID ${newId} (${width}x${height} tiles)`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text" as const, text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    // update_map - Update an existing map's properties
    server.tool(
        "update_map",
        "Update an existing map's properties",
        updateMapSchema.shape,
        async (args) => {
            try {
                const { id, displayName, tilesetId, encounterSteps } = args;

                const mapFilename = `Map${String(id).padStart(3, "0")}.json`;

                if (!(await fileHandler.exists(`data/${mapFilename}`))) {
                    return {
                        content: [{ type: "text" as const, text: `Error: Map with ID ${id} not found` }],
                        isError: true,
                    };
                }

                const mapData = await fileHandler.readJson<RPGMap>(`data/${mapFilename}`);

                if (displayName !== undefined) mapData.displayName = displayName;
                if (tilesetId !== undefined) mapData.tilesetId = tilesetId;
                if (encounterSteps !== undefined) mapData.encounterStep = encounterSteps;

                await safeWriter.writeToDatabase(mapFilename, mapData);

                return {
                    content: [{ type: "text" as const, text: `Updated map ID ${id}` }],
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
