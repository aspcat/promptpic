# PromptPic

AI Image Generation Comparison Tool - Enter a prompt, select multiple AI image generation models, generate and compare their outputs.

[中文](./README_zh.md)

## Features

- **Multi-Model Support**: Add and compare outputs from multiple AI image generation models
- **Custom Providers**: Support for any API-compliant image generation service
- **Custom Models**: Configure your own models with custom API endpoints
- **Import/Export**: Share your model configurations via JSON files
- **Bilingual**: Supports Chinese and English interface

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

Create a `.env.local` file in the project root with your API keys:

```env
# Provider API keys (if using custom providers)
# Most custom providers will require their own API key configured in the provider settings

# Umami Analytics (optional)
NEXT_PUBLIC_UMAMI_URL=https://your-umami-url.com/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
```

## Usage

### Adding a Custom Provider

1. Click "Import Config" or create a new provider manually
2. For a new provider, click "+ New Provider"
3. Fill in the provider details:
   - **Provider Name**: e.g., "OpenAI", "Alibaba Wan"
   - **API Address**: The API endpoint URL
   - **API Key**: Your API authentication key
   - **Default Headers**: JSON format, e.g., `{"Content-Type": "application/json"}`

### Adding a Custom Model

1. Click "Add Custom Model"
2. Select a provider from the dropdown (or create a new one)
3. Fill in the model details:
   - **Model Name**: e.g., "DALL-E 3", "Wan2.7 Image"
   - **API Address**: The API endpoint (auto-filled if provider is selected)
   - **Request Body**: JSON format with `{{prompt}}` placeholder
   - **Response Image Path**: JSON path to extract image URL, e.g., `output.choices.0.message.content.0.image`

### Example: Alibaba Wan2.7-image Configuration

```
Provider:
  Name: Alibaba Wan
  API: https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
  Headers: {"Content-Type": "application/json", "Authorization": "Bearer {{apiKey}}"}

Model:
  Name: Wan2.7-image
  Request Body:
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
  Response Path: output.choices.0.message.content.0.image
```

## Project Structure

```
src/
├── app/
│   ├── api/generate/route.ts   # Image generation API
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page UI
└── lib/
    ├── i18n.ts                 # Translations (zh/en)
    ├── LanguageContext.tsx     # Language switcher context
    ├── models.ts               # Model configuration types
    └── utils.ts                # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [React 18](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## License

MIT
