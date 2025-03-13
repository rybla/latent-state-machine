import google from "@google/generative-ai";

// -----------------------------------------------------------------------------
// endpoint /api/gai/Generate
// -----------------------------------------------------------------------------

export const endpoint_Generate = "/api/gai/Generate";

export type RequestData_Generate = {
  model: string;
  tools: google.Tool[];
  toolConfig: google.ToolConfig;
  systemInstruction: google.Content;
  content: google.Content[];
};

export type ResponseData_Generate = {
  result: google.GenerateContentResult;
};

// -----------------------------------------------------------------------------
// endpoint /api/gai/GenerateStructure
// -----------------------------------------------------------------------------

export const endpoint_GenerateStructure = "/api/gai/GenerateStructure";

export type RequestData_GenerateStructure = {
  model: string;
  responseSchema: google.Schema;
  systemInstruction: google.Content;
  content: google.Content[];
};

export type ResponseData_GenerateStructure = {
  result: google.GenerateContentResult;
};
