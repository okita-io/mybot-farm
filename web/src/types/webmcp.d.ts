type WebMcpContent = {
  type: "text";
  text: string;
};

type WebMcpToolResult = {
  content: WebMcpContent[];
};

type WebMcpTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
  execute: (
    args: Record<string, unknown>,
  ) => Promise<WebMcpToolResult | string> | WebMcpToolResult | string;
};

type ModelContext = {
  registerTool(
    tool: WebMcpTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void> | void;
};

interface Document {
  modelContext?: ModelContext;
}

interface Navigator {
  modelContext?: ModelContext;
}
