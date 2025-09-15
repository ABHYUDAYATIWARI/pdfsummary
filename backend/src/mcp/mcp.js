// // server.js

// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { z } from "zod";
// // import { getTranscript } from "youtube-transcript"; // npm install youtube-transcript

// // Create server instance
// const server = new McpServer({
//   name: "youtube-transcript",
//   version: "1.0.0",
//   capabilities: {
//     resources: {},
//     tools: {},
//   },
// });

// // Register YouTube transcript tool
// server.tool(
//   "get_youtube_transcript",
//   "Fetch transcript from a YouTube video",
//   {
//     url: z.string().url().describe("The full YouTube video URL"),
//   },
//   async ({ url }) => {
//     try {
//       const transcript = "hello in mco";

//       if (!transcript || transcript.length === 0) {
//         return {
//           content: [{ type: "text", text: "No transcript found for this video." }],
//         };
//       }

//       // Combine transcript into plain text
//       const transcriptText = transcript
//         .map((item) => item.text)
//         .join(" ");

//       return {
//         content: [{ type: "text", text: transcriptText }],
//       };
//     } catch (err) {
//       console.error("Error fetching transcript:", err);
//       return {
//         content: [{ type: "text", text: "Failed to fetch transcript. Please check the URL." }],
//       };
//     }
//   }
// );

// // ===================================================================
// //                 SERVER STARTUP AND TRANSPORT
// // ===================================================================
// console.log("Starting YouTube Transcript MCP server...");

// const transport = new StdioServerTransport();
// export const runServer = async () => {
//   await server.start(transport);
// };

// console.log("YouTube Transcript MCP server is running and listening on stdio.");
