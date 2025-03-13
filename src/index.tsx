import { serve } from "bun";
import index from "./index.html";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  RequestData_GenerateText,
  ResponseData_GenerateText,
} from "./common/types";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/gai/text": {
      async POST(req) {
        const data: RequestData_GenerateText = await req.json();
        const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = client.getGenerativeModel({ model: data.model });
        const result = await model.generateContent({
          contents: data.content,
          systemInstruction: data.systemInstruction,
          tools: data.tools,
          toolConfig: data.toolConfig,
        });
        const response_data: ResponseData_GenerateText = { result };
        return new Response(JSON.stringify(response_data));
      },
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
