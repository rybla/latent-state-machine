import google from "@google/generative-ai";

export type RequestData_GenerateText = {
  model: string;
  content: google.Content[];
  systemInstruction: google.Content;
  tools: google.Tool[];
  toolConfig: google.ToolConfig;
};

export type ResponseData_GenerateText = {
  result: google.GenerateContentResult;
};
