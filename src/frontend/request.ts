import {
  endpoint_Generate,
  endpoint_GenerateStructure,
  RequestData_Generate,
  RequestData_GenerateStructure,
  ResponseData_Generate,
  ResponseData_GenerateStructure,
} from "@/common/endpoint";

function make_request<RequestData, ResponseData>(
  endpoint: string,
): (request_data: RequestData) => Promise<ResponseData> {
  return async (request_data) => {
    const method = "POST";
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request_data),
    });
    if (!response.ok)
      throw new Error(`${method} ${endpoint}: ${response.statusText}`);
    const response_data = await response.json();
    return response_data;
  };
}

export const Generate = make_request<
  RequestData_Generate,
  ResponseData_Generate
>(endpoint_Generate);

export const GenerateStructure = make_request<
  RequestData_GenerateStructure,
  ResponseData_GenerateStructure
>(endpoint_GenerateStructure);
