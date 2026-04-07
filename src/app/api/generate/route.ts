import { NextRequest, NextResponse } from "next/server";

interface GenerationResult {
  model: string;
  status: "success" | "error";
  imageUrl?: string;
  generationTime?: number;
  error?: string;
}

interface CustomModelConfig {
  id: string;
  name: string;
  provider: string;
  requiresUserKey: boolean;
  apiEndpoint: string;
  apiKey: string;
  method: string;
  headers: string;
  bodyTemplate: string;
  responseImagePath: string;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

async function generateCustomModel(
  prompt: string,
  config: CustomModelConfig,
  mode: "generate" | "edit" = "generate",
  referenceImages?: string[]
): Promise<GenerationResult> {
  const startTime = Date.now();
  try {
    if (!config.apiEndpoint) {
      return {
        model: config.id,
        status: "error",
        error: "API 地址未配置",
      };
    }

    let headers: Record<string, string> = {};
    try {
      let headersTemplate = config.headers;
      if (config.apiKey) {
        headersTemplate = headersTemplate.replace(/\{\{apiKey\}\}/g, config.apiKey);
      }
      headers = JSON.parse(headersTemplate);
    } catch {
      headers = {};
    }
    if (config.apiKey && !headers["Authorization"]) {
      if (config.apiKey.startsWith("Bearer ")) {
        headers["Authorization"] = config.apiKey;
      } else {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }
    }

    let bodyTemplate = config.bodyTemplate;
    bodyTemplate = bodyTemplate.replace(/\{\{prompt\}\}/g, prompt);

    let body: unknown;
    try {
      body = JSON.parse(bodyTemplate);

      if (mode === "edit" && referenceImages && referenceImages.length > 0) {
        const imageContents = referenceImages.map((img) => ({ image: img }));
        body = {
          ...body,
          input: {
            messages: [
              {
                role: "user",
                content: [
                  { text: prompt },
                  ...imageContents,
                ],
              },
            ],
          },
        };
      }
    } catch {
      return {
        model: config.id,
        status: "error",
        error: "请求体格式错误",
      };
    }

    console.log(`[${config.name}] 发送请求:`);
    console.log(`  URL: ${config.apiEndpoint}`);
    console.log(`  Headers:`, headers);
    console.log(`  Body:`, JSON.stringify(body, null, 2));

    const response = await fetch(config.apiEndpoint, {
      method: config.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: config.method === "GET" ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        model: config.id,
        status: "error",
        error: `API 错误 ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    console.log(`[${config.name}] 响应:`, JSON.stringify(data, null, 2));
    const imageUrl = getNestedValue(data, config.responseImagePath) as string | undefined;

    if (!imageUrl) {
      return {
        model: config.id,
        status: "error",
        error: "未在响应中找到图片 URL，请检查响应路径配置。当前响应: " + JSON.stringify(data).slice(0, 200),
      };
    }

    return {
      model: config.id,
      status: "success",
      imageUrl,
      generationTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      model: config.id,
      status: "error",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, models: selectedModels, customModels, mode, referenceImages } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one model must be selected" },
        { status: 400 }
      );
    }

    const generationPromises: Promise<GenerationResult>[] = [];
    const customModelMap = new Map<string, CustomModelConfig>();
    if (customModels && Array.isArray(customModels)) {
      for (const cm of customModels) {
        customModelMap.set(cm.id, cm);
      }
    }

    for (const modelId of selectedModels) {
      if (customModelMap.has(modelId)) {
        const config = customModelMap.get(modelId)!;
        generationPromises.push(generateCustomModel(
          prompt,
          config,
          mode || "generate",
          referenceImages
        ));
      } else {
        generationPromises.push(
          Promise.resolve({
            model: modelId,
            status: "error" as const,
            error: "未找到该模型配置",
          })
        );
      }
    }

    const results = await Promise.all(generationPromises);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
