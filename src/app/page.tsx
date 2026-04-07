"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { getModelById } from "@/lib/models";
import { useLanguage } from "@/lib/LanguageContext";

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

interface GenerationResult {
  model: string;
  status: "success" | "error";
  imageUrl?: string;
  generationTime?: number;
  error?: string;
}

const CUSTOM_MODELS_KEY = "promptpic_custom_models";
const CUSTOM_PROVIDERS_KEY = "promptpic_custom_providers";

interface CustomProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;
  headers: string;
}

function loadCustomModels(): CustomModelConfig[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function loadCustomProviders(): CustomProvider[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CUSTOM_PROVIDERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveCustomModels(customModels: CustomModelConfig[]) {
  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(customModels));
}

function saveCustomProviders(providers: CustomProvider[]) {
  localStorage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(providers));
}

export default function Home() {
  const { t, lang, setLang } = useLanguage();
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customModels, setCustomModels] = useState<CustomModelConfig[]>([]);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<CustomModelConfig | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CustomProvider | null>(null);
  const [providerFormData, setProviderFormData] = useState({
    name: "",
    apiEndpoint: "",
    apiKey: "",
    headers: '{"Content-Type": "application/json"}',
  });
  const [formData, setFormData] = useState({
    name: "",
    provider: "",
    apiEndpoint: "",
    apiKey: "",
    method: "POST",
    headers: "{}",
    bodyTemplate: JSON.stringify({ prompt: "{{prompt}}", n: 1 }, null, 2),
    responseImagePath: "output.image_url",
  });
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");

  useEffect(() => {
    setCustomModels(loadCustomModels());
    setCustomProviders(loadCustomProviders());

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          const maxSize = 10 * 1024 * 1024;
          if (file.size > maxSize) {
            alert(t("alert.imageTooLarge"));
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setReferenceImages((prev) => [...prev, base64]);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [t]);

  const allModels = customModels;
  const allProviders = customProviders;

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024;

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        alert(t("alert.imageTooLarge"));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setReferenceImages((prev) => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError(t("pleaseEnterPrompt"));
      return;
    }

    if (selectedModels.length === 0) {
      setError(t("pleaseSelectModel"));
      return;
    }

    if (mode === "edit" && referenceImages.length === 0) {
      setError(t("error.noReferenceImage"));
      return;
    }

    const totalImageSize = referenceImages.reduce((acc, img) => acc + img.length, 0);
    if (totalImageSize > 10 * 1024 * 1024) {
      setError(t("error.imageTooLarge"));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          models: selectedModels,
          customModels: customModels,
          mode,
          referenceImages: mode === "edit" ? referenceImages : undefined,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`服务器返回格式错误: ${text.slice(0, 200)}`);
        setIsGenerating(false);
        return;
      }

      if (!data.success) {
        setError(data.error || t("error.generationFailed"));
        setIsGenerating(false);
        return;
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.networkError"));
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedModels, customModels, mode, referenceImages]);

  const handleDownload = (imageUrl: string) => {
    window.open(imageUrl, "_blank");
  };

  const getProcessingCount = () => {
    return selectedModels.length;
  };

  const openAddModal = () => {
    setEditingModel(null);
    setSelectedProviderId("");
    setFormData({
      name: "",
      provider: "",
      apiEndpoint: "",
      apiKey: "",
      method: "POST",
      headers: "{}",
      bodyTemplate: JSON.stringify({ prompt: "{{prompt}}", n: 1 }, null, 2),
      responseImagePath: "output.image_url",
    });
    setShowAddModal(true);
  };

  const openEditModal = (model: CustomModelConfig) => {
    setEditingModel(model);
    setSelectedProviderId(model.provider);
    setFormData({
      name: model.name,
      provider: model.provider,
      apiEndpoint: model.apiEndpoint,
      apiKey: model.apiKey,
      method: model.method,
      headers: model.headers,
      bodyTemplate: model.bodyTemplate,
      responseImagePath: model.responseImagePath,
    });
    setShowAddModal(true);
  };

  const handleSaveModel = () => {
    if (!formData.name || !formData.apiEndpoint) {
      setError(t("error.modelNameRequired"));
      return;
    }

    let parsedHeaders;
    try {
      parsedHeaders = JSON.parse(formData.headers);
    } catch {
      setError(t("error.headersFormatError") || "Invalid headers JSON format");
      return;
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(formData.bodyTemplate);
      if (!formData.bodyTemplate.includes("{{prompt}}")) {
        setError(t("promptPlaceholderTip"));
        return;
      }
    } catch {
      setError(t("error.bodyFormatError") || "Invalid request body JSON format");
      return;
    }

    const newModel: CustomModelConfig = {
      id: editingModel?.id || `custom-${Date.now()}`,
      name: formData.name,
      provider: formData.provider || "自定义",
      requiresUserKey: true,
      apiEndpoint: formData.apiEndpoint,
      apiKey: formData.apiKey,
      method: formData.method,
      headers: formData.headers,
      bodyTemplate: formData.bodyTemplate,
      responseImagePath: formData.responseImagePath,
    };

    let updatedModels;
    if (editingModel) {
      updatedModels = customModels.map((m) =>
        m.id === editingModel.id ? newModel : m
      );
    } else {
      updatedModels = [...customModels, newModel];
    }

    setCustomModels(updatedModels);
    saveCustomModels(updatedModels);
    setShowAddModal(false);
    setError(null);
  };

  const handleDeleteModel = (modelId: string) => {
    const updatedModels = customModels.filter((m) => m.id !== modelId);
    setCustomModels(updatedModels);
    saveCustomModels(updatedModels);
    setSelectedModels((prev) => prev.filter((id) => id !== modelId));
  };

  const handleCloneModel = (model: CustomModelConfig) => {
    const clonedModel: CustomModelConfig = {
      ...model,
      id: `custom-${Date.now()}`,
      name: `${model.name} (copy)`,
    };
    const updatedModels = [...customModels, clonedModel];
    setCustomModels(updatedModels);
    saveCustomModels(updatedModels);
  };

  const handleExportConfig = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      models: customModels,
      providers: customProviders,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promptpic-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.models && Array.isArray(data.models)) {
          const mergedModels = [...customModels];
          for (const model of data.models) {
            if (!mergedModels.find((m) => m.id === model.id)) {
              mergedModels.push({ ...model, id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}` });
            }
          }
          setCustomModels(mergedModels);
          saveCustomModels(mergedModels);
        }
        if (data.providers && Array.isArray(data.providers)) {
          const mergedProviders = [...customProviders];
          for (const provider of data.providers) {
            if (!mergedProviders.find((p) => p.id === provider.id)) {
              mergedProviders.push({ ...provider, id: `provider-${Date.now()}-${Math.random().toString(36).slice(2)}` });
            }
          }
          setCustomProviders(mergedProviders);
          saveCustomProviders(mergedProviders);
        }
        alert(t("alert.importSuccess"));
      } catch {
        alert(t("alert.importFailed"));
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const openProviderModal = (provider?: CustomProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setProviderFormData({
        name: provider.name,
        apiEndpoint: provider.apiEndpoint,
        apiKey: provider.apiKey,
        headers: provider.headers,
      });
    } else {
      setEditingProvider(null);
      setProviderFormData({
        name: "",
        apiEndpoint: "",
        apiKey: "",
        headers: '{"Content-Type": "application/json"}',
      });
    }
    setShowProviderModal(true);
  };

  const handleSaveProvider = () => {
    if (!providerFormData.name || !providerFormData.apiEndpoint) {
      setError(t("error.providerNameRequired"));
      return;
    }

    const newProvider: CustomProvider = {
      id: editingProvider?.id || `provider-${Date.now()}`,
      name: providerFormData.name,
      apiEndpoint: providerFormData.apiEndpoint,
      apiKey: providerFormData.apiKey,
      headers: providerFormData.headers,
    };

    let updatedProviders;
    if (editingProvider) {
      updatedProviders = customProviders.map((p) =>
        p.id === editingProvider.id ? newProvider : p
      );
    } else {
      updatedProviders = [...customProviders, newProvider];
    }

    setCustomProviders(updatedProviders);
    saveCustomProviders(updatedProviders);
    setShowProviderModal(false);
    setError(null);
  };

  const handleDeleteProvider = (providerId: string) => {
    const updatedProviders = customProviders.filter((p) => p.id !== providerId);
    setCustomProviders(updatedProviders);
    saveCustomProviders(updatedProviders);
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = allProviders.find((p) => p.id === providerId);
    if (provider) {
      setFormData((prev) => ({
        ...prev,
        provider: provider.name,
        apiEndpoint: provider.apiEndpoint,
        headers: provider.headers || "{}",
        bodyTemplate: JSON.stringify({ prompt: "{{prompt}}" }, null, 2),
        responseImagePath: "output.image_url",
      }));
    }
  };

  const getModelDisplayName = (modelId: string) => {
    const model = getModelById(modelId);
    if (model) return model.name;
    const custom = customModels.find((m) => m.id === modelId);
    return custom?.name || modelId;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">PromptPic</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{t("appSubtitle")}</span>
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setLang("zh")}
                className={`px-2 py-1 text-xs rounded ${
                  lang === "zh" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-1 text-xs rounded ${
                  lang === "en" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <section className="mb-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setMode("generate")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "generate"
                  ? "bg-white text-primary shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("modeGenerate")}
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "edit"
                  ? "bg-white text-primary shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("modeEdit")}
            </button>
          </div>
        </section>

        {mode === "edit" && (
          <section className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-1">{t("referenceImages")}</h3>
            <div className="flex gap-4 text-xs text-gray-500 mb-2">
              <span>{t("referenceImagesTip")}</span>
              <span>{t("pasteImageTip")}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {referenceImages.map((img, index) => (
                <div key={index} className="relative w-24 h-24 border border-gray-200 rounded-lg overflow-hidden">
                  <img src={img} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50">
                <span className="text-gray-400 text-xs">+</span>
                <span className="text-gray-400 text-xs">{t("uploadReferenceImages")}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("promptLabel")}</h2>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "edit" ? t("promptPlaceholderEdit") : t("promptPlaceholder")}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400"
              maxLength={2000}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {prompt.length}/2000
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">{t("selectModels")}</h2>
            <div className="flex gap-2">
              <label className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 cursor-pointer flex items-center gap-1">
                {t("importConfig")}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportConfig}
                  className="hidden"
                />
              </label>
              <button
                onClick={openAddModal}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-1"
              >
                <span>+</span> {t("addCustomModel")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {allModels.map((model) => (
              <label
                key={model.id}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedModels.includes(model.id)
                    ? "border-primary bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelToggle(model.id)}
                  className="mt-1 mr-3 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{model.name}</div>
                  <div className="text-sm text-gray-500">{model.provider}</div>
                  {model.requiresUserKey && (
                    <div className="text-xs text-orange-500 mt-1">{t("requiresUserKey")}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </section>

        {(customModels.length > 0 || customProviders.length > 0) && (
          <details className="mb-8 border border-gray-200 rounded-lg">
            <summary className="p-3 cursor-pointer hover:bg-gray-50 font-medium text-gray-700">
              {t("manageConfig")}
            </summary>
            <div className="p-3 border-t border-gray-200 space-y-4">
              <div className="flex gap-2 pb-2 border-b border-gray-200">
                <button
                  onClick={handleExportConfig}
                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                >
                  {t("exportConfig")}
                </button>
                <label className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 cursor-pointer">
                  {t("importConfig")}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportConfig}
                    className="hidden"
                  />
                </label>
              </div>
              {customModels.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">{t("customModels")}</h4>
                  <div className="space-y-2">
                    {customModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{model.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{model.provider}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCloneModel(model)}
                            className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded text-green-700"
                          >
                            {t("clone")}
                          </button>
                          <button
                            onClick={() => openEditModal(model)}
                            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                          >
                            {t("edit")}
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded text-red-700"
                          >
                            {t("delete")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {customProviders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">{t("customProviders")}</h4>
                  <div className="space-y-2">
                    {customProviders.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{provider.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openProviderModal(provider)}
                            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                          >
                            {t("edit")}
                          </button>
                          <button
                            onClick={() => handleDeleteProvider(provider.id)}
                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded text-red-700"
                          >
                            {t("delete")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}

        <section className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
              isGenerating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary hover:bg-primaryhover"
            }`}
          >
            {isGenerating
              ? t("generatingWithCount").replace("{{count}}", String(getProcessingCount()))
              : t("generate")}
          </button>
        </section>

        {error && (
          <section className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </section>
        )}

        {isGenerating && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedModels.map((modelId) => (
              <div
                key={modelId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-200 border-b border-gray-200 aspect-square flex items-center justify-center">
                  <div className="animate-pulse text-gray-500">生成中...</div>
                </div>
                <div className="p-4">
                  <div className="font-medium text-gray-900">{getModelDisplayName(modelId)}</div>
                  <div className="text-sm text-gray-500">{t("generatingStatus")}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {!isGenerating && results.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result) => (
              <div
                key={result.model}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {result.status === "success" && result.imageUrl ? (
                  <>
                    <div className="relative aspect-square bg-gray-100">
                      <Image
                        src={result.imageUrl}
                        alt={`${getModelDisplayName(result.model)} 生成的图片`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="p-4">
                      <div className="font-medium text-gray-900">{getModelDisplayName(result.model)}</div>
                      {result.generationTime && (
                        <div className="text-sm text-gray-500 mt-1">
                          {t("generationTime")}: {result.generationTime}{t("ms")}
                        </div>
                      )}
                      <button
                        onClick={() => handleDownload(result.imageUrl!)}
                        className="mt-3 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                      >
                        {t("downloadImage")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                    <div className="font-medium text-gray-900">{getModelDisplayName(result.model)}</div>
                    <div className="p-3 bg-red-50 rounded-lg mt-2">
                      <p className="text-red-600 text-sm">
                        {result.error || "生成失败"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingModel ? t("editCustomModelTitle") : t("addCustomModelTitle")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("selectProvider")}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedProviderId}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- {t("selectProvider")} --</option>
                    {allProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => openProviderModal()}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                  >
                    + {t("newProvider")}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modelName")} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: DALL-E 3 Custom"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("apiAddress")} *
                </label>
                <input
                  type="text"
                  value={formData.apiEndpoint}
                  onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                  placeholder="https://api.example.com/v1/generate"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  请求方法
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("requestHeaders")}
                </label>
                <textarea
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  placeholder='{"Content-Type": "application/json"}'
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("requestBody")} * {t("promptPlaceholderTip")}
                </label>
                <textarea
                  value={formData.bodyTemplate}
                  onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                  placeholder='{"prompt": "{{prompt}}"}'
                  rows={6}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("responseImagePath")} (例如: output.image_url 或 data.url)
                </label>
                <input
                  type="text"
                  value={formData.responseImagePath}
                  onChange={(e) => setFormData({ ...formData, responseImagePath: e.target.value })}
                  placeholder="output.image_url"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveModel}
                className="px-4 py-2 text-white bg-primary hover:bg-primaryhover rounded-lg"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingProvider ? t("editProviderTitle") : t("addProviderTitle")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("providerName")} *
                </label>
                <input
                  type="text"
                  value={providerFormData.name}
                  onChange={(e) => setProviderFormData({ ...providerFormData, name: e.target.value })}
                  placeholder="例如: My Custom API"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("apiAddress")} *
                </label>
                <input
                  type="text"
                  value={providerFormData.apiEndpoint}
                  onChange={(e) => setProviderFormData({ ...providerFormData, apiEndpoint: e.target.value })}
                  placeholder="https://api.example.com/v1/images/generations"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("apiKey")}
                </label>
                <input
                  type="password"
                  value={providerFormData.apiKey}
                  onChange={(e) => setProviderFormData({ ...providerFormData, apiKey: e.target.value })}
                  placeholder="sk-... (可选)"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("defaultHeaders")}
                </label>
                <textarea
                  value={providerFormData.headers}
                  onChange={(e) => setProviderFormData({ ...providerFormData, headers: e.target.value })}
                  placeholder='{"Content-Type": "application/json"}'
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowProviderModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveProvider}
                className="px-4 py-2 text-white bg-primary hover:bg-primaryhover rounded-lg"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          {t("footer")}
        </div>
      </footer>
    </div>
  );
}
