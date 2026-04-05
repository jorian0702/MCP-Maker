/**
 * Create Project Tools - Full project scaffolding from scratch
 * Logic ported from ShunsukeHayashi/rpgmaker-mz-mcp (MIT), adapted for SDK v1.0 + Zod
 */

import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileHandler } from "../utils/fileHandler.js";
import { SafeWriter } from "../utils/safeWriter.js";
import {
    getDefaultSystem,
    PROJECT_DIRECTORIES,
    EMPTY_DATABASE_FILES,
} from "../utils/templates.js";

const createProjectSchema = z.object({
    project_path: z
        .string()
        .describe("Absolute path where the new project will be created"),
    game_title: z
        .string()
        .describe("Game title shown on title screen"),
    locale: z
        .enum(["ja_JP", "en_US", "zh_CN", "ko_KR"])
        .default("ja_JP")
        .describe("Game locale"),
    screen_width: z
        .number().int().min(544).max(1920).default(816)
        .describe("Screen width in pixels"),
    screen_height: z
        .number().int().min(416).max(1080).default(624)
        .describe("Screen height in pixels"),
    initial_map_width: z
        .number().int().min(1).max(256).default(17)
        .describe("Width of the initial Map001 in tiles"),
    initial_map_height: z
        .number().int().min(1).max(256).default(13)
        .describe("Height of the initial Map001 in tiles"),
});

const duplicateProjectSchema = z.object({
    source_path: z
        .string()
        .describe("Absolute path of the project to duplicate"),
    dest_path: z
        .string()
        .describe("Absolute path for the duplicated project"),
    new_title: z
        .string()
        .optional()
        .describe("Optional new game title for the duplicate"),
});

export function registerCreateProjectTools(
    server: McpServer,
    _fileHandler: FileHandler,
    _safeWriter: SafeWriter,
) {
    server.tool(
        "create_project",
        "Create a brand-new RPG Maker MZ project from scratch with full directory structure, System.json, initial map, and all empty database files",
        createProjectSchema.shape,
        async (args) => {
            try {
                const {
                    project_path: projectPath,
                    game_title: gameTitle,
                    locale,
                    screen_width: screenWidth,
                    screen_height: screenHeight,
                    initial_map_width: mapW,
                    initial_map_height: mapH,
                } = args;

                // Guard against overwriting existing project
                try {
                    await fs.access(projectPath);
                    return {
                        content: [{
                            type: "text" as const,
                            text: `Error: Path already exists: ${projectPath}`,
                        }],
                        isError: true,
                    };
                } catch {
                    // Path doesn't exist - good
                }

                // 1. Create all directories
                for (const dir of PROJECT_DIRECTORIES) {
                    await fs.mkdir(path.join(projectPath, dir), { recursive: true });
                }

                // 2. Create project marker file (.rmmzproject for MZ 1.9+)
                await fs.writeFile(
                    path.join(projectPath, "game.rmmzproject"),
                    "RPGMZ 1.0.0",
                    "utf-8",
                );

                // 3. Create System.json with full configuration
                const system = getDefaultSystem(gameTitle);
                system.locale = locale;
                system.advanced.screenWidth = screenWidth;
                system.advanced.screenHeight = screenHeight;
                system.advanced.uiAreaWidth = screenWidth;
                system.advanced.uiAreaHeight = screenHeight;
                await fs.writeFile(
                    path.join(projectPath, "data", "System.json"),
                    JSON.stringify(system, null, 0),
                    "utf-8",
                );

                // 4. Create MapInfos.json with one initial map
                const mapInfos = [
                    null,
                    {
                        id: 1,
                        expanded: false,
                        name: "MAP001",
                        order: 1,
                        parentId: 0,
                        scrollX: 0,
                        scrollY: 0,
                    },
                ];
                await fs.writeFile(
                    path.join(projectPath, "data", "MapInfos.json"),
                    JSON.stringify(mapInfos, null, 0),
                    "utf-8",
                );

                // 5. Create Map001.json
                const dataSize = mapW * mapH * 6;
                const map001 = {
                    autoplayBgm: false,
                    autoplayBgs: false,
                    battleback1Name: "",
                    battleback2Name: "",
                    bgm: { name: "", pan: 0, pitch: 100, volume: 90 },
                    bgs: { name: "", pan: 0, pitch: 100, volume: 90 },
                    disableDashing: false,
                    displayName: "",
                    encounterList: [],
                    encounterStep: 30,
                    height: mapH,
                    width: mapW,
                    note: "",
                    parallaxLoopX: false,
                    parallaxLoopY: false,
                    parallaxName: "",
                    parallaxShow: true,
                    parallaxSx: 0,
                    parallaxSy: 0,
                    scrollType: 0,
                    specifyBattleback: false,
                    tilesetId: 1,
                    data: new Array(dataSize).fill(0),
                    events: [null],
                };
                await fs.writeFile(
                    path.join(projectPath, "data", "Map001.json"),
                    JSON.stringify(map001, null, 0),
                    "utf-8",
                );

                // 6. Create all empty database JSON files
                for (const file of EMPTY_DATABASE_FILES) {
                    await fs.writeFile(
                        path.join(projectPath, "data", file),
                        JSON.stringify([null], null, 0),
                        "utf-8",
                    );
                }

                // 7. Create empty plugins.js
                await fs.writeFile(
                    path.join(projectPath, "js", "plugins.js"),
                    "var $plugins = [];\n",
                    "utf-8",
                );

                const summary = [
                    `Project created: ${gameTitle}`,
                    `Path: ${projectPath}`,
                    `Locale: ${locale}`,
                    `Screen: ${screenWidth}x${screenHeight}`,
                    `Initial map: ${mapW}x${mapH} tiles`,
                    `Directories created: ${PROJECT_DIRECTORIES.length}`,
                    `Database files: ${EMPTY_DATABASE_FILES.length}`,
                    "",
                    "Next steps:",
                    "- Copy RPG Maker MZ runtime files (js/rmmz_*.js, fonts/, icon/) from an existing project or engine installation",
                    "- Open with RPG Maker MZ editor to verify",
                    "- Use create_map, add_actor, add_class etc. to populate the project",
                ].join("\n");

                return {
                    content: [{ type: "text" as const, text: summary }],
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
        "duplicate_project",
        "Duplicate an existing RPG Maker MZ project to a new location",
        duplicateProjectSchema.shape,
        async (args) => {
            try {
                const { source_path: src, dest_path: dest, new_title: newTitle } = args;

                // Verify source exists
                try {
                    await fs.access(src);
                } catch {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `Error: Source project not found: ${src}`,
                        }],
                        isError: true,
                    };
                }

                // Guard dest
                try {
                    await fs.access(dest);
                    return {
                        content: [{
                            type: "text" as const,
                            text: `Error: Destination already exists: ${dest}`,
                        }],
                        isError: true,
                    };
                } catch {
                    // Good
                }

                await copyDir(src, dest);

                // Optionally update title
                if (newTitle) {
                    const sysPath = path.join(dest, "data", "System.json");
                    try {
                        const raw = await fs.readFile(sysPath, "utf-8");
                        const sys = JSON.parse(raw);
                        sys.gameTitle = newTitle;
                        sys.versionId = Math.floor(Math.random() * 1000000000);
                        await fs.writeFile(sysPath, JSON.stringify(sys, null, 0), "utf-8");
                    } catch {
                        // Non-critical
                    }
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: `Project duplicated: ${src} -> ${dest}${newTitle ? ` (title: ${newTitle})` : ""}`,
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
}

async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}
