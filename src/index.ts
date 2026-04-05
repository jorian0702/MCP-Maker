/**
 * RPG Maker MZ MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FileHandler } from "./utils/fileHandler.js";
import { SafeWriter } from "./utils/safeWriter.js";
import { registerDatabaseTools } from "./tools/databaseTools.js";
import { registerItemTools } from "./tools/itemTools.js";
import { registerPluginTools } from "./tools/pluginTools.js";
import { registerMapTools } from "./tools/mapTools.js";
import { registerResourceTools } from "./tools/resourceTools.js";
import { registerSkillTools } from "./tools/skillTools.js";
import { registerLimitTools } from "./tools/limitTools.js";
import { registerWeaponTools } from "./tools/weaponTools.js";
import { registerStateTools } from "./tools/stateTools.js";
import { registerEnemyTools } from "./tools/enemyTools.js";
import { registerArmorTools } from "./tools/armorTools.js";
import { registerActorTools } from "./tools/actorTools.js";
import { registerClassTools } from "./tools/classTools.js";
import { registerEventTools } from "./tools/eventTools.js";
import { registerSearchTools } from "./tools/searchTools.js";
import { registerProjectTools } from "./tools/projectTools.js";
import { registerTileTools } from "./tools/tileTools.js";

// Get configuration from environment variables
const projectPath = process.env.RPGMAKER_PROJECT_PATH;
const enginePath = process.env.RPGMAKER_ENGINE_PATH;

if (!projectPath) {
    console.error("Error: RPGMAKER_PROJECT_PATH environment variable is required");
    process.exit(1);
}

// Initialize utilities
const fileHandler = new FileHandler(projectPath, enginePath);
const safeWriter = new SafeWriter(fileHandler);

// Initialize MCP server
const server = new McpServer({
    name: "rpgmaker-mz-mcp",
    version: "1.0.0",
});

// Register all tools
registerDatabaseTools(server, fileHandler);
registerItemTools(server, fileHandler, safeWriter);
registerPluginTools(server, fileHandler, safeWriter);
registerMapTools(server, fileHandler, safeWriter);
registerResourceTools(server, fileHandler);
registerSkillTools(server, fileHandler, safeWriter);
registerLimitTools(server, fileHandler, safeWriter);
registerWeaponTools(server, fileHandler, safeWriter);
registerStateTools(server, fileHandler, safeWriter);
registerEnemyTools(server, fileHandler, safeWriter);
registerArmorTools(server, fileHandler, safeWriter);
registerActorTools(server, fileHandler, safeWriter);
registerClassTools(server, fileHandler, safeWriter);
registerEventTools(server, fileHandler, safeWriter);
registerSearchTools(server, fileHandler);
registerProjectTools(server, fileHandler);
registerTileTools(server, fileHandler, safeWriter);

// Start server with stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log to stderr so it doesn't interfere with MCP protocol on stdout
    console.error(`RPG Maker MZ MCP Server started`);
    console.error(`Project: ${projectPath}`);
    if (enginePath) {
        console.error(`Engine: ${enginePath}`);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
