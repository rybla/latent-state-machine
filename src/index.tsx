import { serve } from "bun";
import index from "./index.html";
import google, { GoogleGenerativeAI } from "@google/generative-ai";
import {
  endpoint_Generate,
  endpoint_GenerateStructure,
  RequestData_Generate,
  RequestData_GenerateStructure,
  ResponseData_Generate,
  ResponseData_GenerateStructure,
} from "@/common/endpoint";
import * as schema from "@/common/schema";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    [endpoint_Generate]: {
      async POST(request) {
        const request_data: RequestData_Generate = await request.json();

        console.log(
          `
request_data:
  - systemInstruction:\n    ${JSON.stringify(request_data.systemInstruction)}
  - content:\n
${request_data.content.map((content) => `    - ${JSON.stringify(content)}`)}
`.trim(),
        );

        const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = client.getGenerativeModel({
          model: request_data.model,
        });
        const result: google.GenerateContentResult =
          await model.generateContent({
            tools: request_data.tools,
            toolConfig: request_data.toolConfig,
            systemInstruction: request_data.systemInstruction,
            contents: request_data.content,
          });
        const response_data: ResponseData_Generate = { result };
        return new Response(JSON.stringify(response_data));
      },
    },

    [endpoint_GenerateStructure]: {
      async POST(response) {
        const request_data: RequestData_GenerateStructure =
          await response.json();
        const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = client.getGenerativeModel({
          model: request_data.model,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: request_data.responseSchema,
          },
        });
        const result = await model.generateContent({
          systemInstruction: request_data.systemInstruction,
          contents: request_data.content,
        });
        const response_data: ResponseData_GenerateStructure = { result };
        return new Response(JSON.stringify(response_data));
      },
    },
  },

  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
