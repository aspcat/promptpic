export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  requiresUserKey: boolean;
  icon?: string;
}

export const models: ModelConfig[] = [];

export function getModelById(id: string): ModelConfig | undefined {
  return models.find((m) => m.id === id);
}
