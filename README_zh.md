# PromptPic

AI 生图对比工具 - 输入一段 prompt，选择多个 AI 生图模型，同时生成并对比各模型的输出效果。

[English](./README.md)

## 功能特性

- **多模型支持**：添加并对比多个 AI 生图模型的输出
- **自定义提供商**：支持任何符合 API 规范的图像生成服务
- **自定义模型**：通过自定义 API 端点配置你自己的模型
- **导入/导出**：通过 JSON 文件分享你的模型配置
- **双语支持**：支持中文和英文界面

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)

### 配置

在项目根目录创建 `.env.local` 文件，配置你的 API 密钥（如需要）：

```env
# 提供商 API 密钥（如使用自定义提供商）
# 大多数自定义提供商需要在提供商设置中配置自己的 API 密钥

# Umami 统计（可选）
NEXT_PUBLIC_UMAMI_URL=https://your-umami-url.com/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
```

## 使用指南

### 添加自定义提供商

1. 点击"导入配置"或手动创建新的提供商
2. 新建提供商，点击"+ 新建提供商"
3. 填写提供商信息：
   - **提供商名称**：如"OpenAI"、"阿里云万相"
   - **API 地址**：API 端点 URL
   - **API Key**：你的 API 认证密钥
   - **默认请求头**：JSON 格式，如 `{"Content-Type": "application/json"}`

### 添加自定义模型

1. 点击"添加自定义模型"
2. 从下拉框选择提供商（或新建一个）
3. 填写模型信息：
   - **模型名称**：如"DALL-E 3"、"Wan2.7 Image"
   - **API 地址**：API 端点（选择提供商后会自动填充）
   - **请求体**：JSON 格式，必须包含 `{{prompt}}` 占位符
   - **响应图片路径**：提取图片 URL 的 JSON 路径，如 `output.choices.0.message.content.0.image`

### 示例：阿里云 Wan2.7-image 配置

```
提供商：
  名称：阿里云万相
  API：https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
  请求头：{"Content-Type": "application/json", "Authorization": "Bearer {{apiKey}}"}

模型：
  名称：Wan2.7-image
  请求体：
  {
    "model": "wan2.7-image",
    "input": {
      "messages": [
        {
          "role": "user",
          "content": [
            {"text": "{{prompt}}"}
          ]
        }
      ]
    },
    "parameters": {
      "size": "2K",
      "n": 1,
      "watermark": false
    }
  }
  响应路径：output.choices.0.message.content.0.image
```

## 项目结构

```
src/
├── app/
│   ├── api/generate/route.ts   # 图片生成 API
│   ├── globals.css             # 全局样式
│   ├── layout.tsx              # 根布局
│   └── page.tsx               # 主页面 UI
└── lib/
    ├── i18n.ts                 # 翻译文件 (zh/en)
    ├── LanguageContext.tsx     # 语言切换 Context
    ├── models.ts               # 模型配置类型
    └── utils.ts                # 工具函数
```

## 可用命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint

## 技术栈

- [Next.js 15](https://nextjs.org/) - React 框架
- [React 18](https://react.dev/) - UI 库
- [Tailwind CSS](https://tailwindcss.com/) - 样式
- [TypeScript](https://www.typescriptlang.org/) - 类型安全

## 开源协议

MIT
