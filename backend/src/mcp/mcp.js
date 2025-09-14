// server.js

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Import your custom functions from the separate helper file
import { makeNWSRequest, formatAlert } from "./weather-api.js";

const NWS_API_BASE = "https://api.weather.gov";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    // Resources and tools are defined below
    resources: {},
    tools: {},
  },
});

// Register weather tools
server.tool(
  "get_alerts",
  "Get weather alerts for a US state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts/active?area=${stateCode}`;
    const alertsData = await makeNWSRequest(alertsUrl); // Using your imported function

    if (!alertsData) {
      return {
        content: [{ type: "text", text: "Failed to retrieve alerts data." }],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [{ type: "text", text: `No active alerts for ${stateCode}.` }],
      };
    }

    const formattedAlerts = features.map(formatAlert); // Using your imported function
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n\n")}`;

    return {
      content: [{ type: "text", text: alertsText }],
    };
  },
);


// ===================================================================
//                 SERVER STARTUP AND TRANSPORT
// This part was missing and is required to run the server.
// It connects your MCP server to standard input/output, which is how
// the Gemini client will communicate with it.
// ===================================================================
console.log("Starting Weather MCP server...");

const transport = new StdioServerTransport();
server.listen(transport);

console.log("Weather MCP server is running and listening on stdio.");