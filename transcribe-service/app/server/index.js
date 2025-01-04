import http from "http";
import { WebSocketServer } from "ws";

import { MAX_PAYLOAD_SIZE } from "../constants.js";

import { httpHandler } from "./http-handler.js";
import { wsHandler } from "./ws-handler.js";

const port = process.env.TRANSCRIBE_PORT || 8000;
const server = http.createServer((req, res) => {
  httpHandler(req, res);
});

const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_SIZE,
});

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});

wss.on("connection", (ws, req) => {
  console.log("Client connected");
  console.log("Headers", req.headers);

  ws.on("message", async (message, isBinary) => {
    wsHandler(ws, message, isBinary);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
