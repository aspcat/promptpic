# PromptPic - AI 生图对比工具

## 产品需求文档 (For Development)

---

### 一、项目概述

**项目名称**: PromptPic  
**项目类型**: 单页工具型 Web 应用  
**核心功能**: 输入一段 prompt，选择多个 AI 生图模型，同时生成并对比各模型的输出效果  
**目标用户**: AI 爱好者、内容创作者、开发者  
**上线地址**: vercel.app / 自定义域名

---

### 二、技术栈

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| 框架 | **Next.js 15** (App Router) | 部署简单，API 路由开箱即用 |
| 语言 | **TypeScript** | 类型安全 |
| 样式 | **Tailwind CSS** | 快速开发 |
| AI SDK | **Replicate SDK** + **OpenAI SDK** | 官方支持 |
| 部署 | **Vercel** | 免费额度够用，自动 HTTPS |
| 域名 | 可选配置 | 初期用 Vercel 子域名即可 |

---

### 三、必须功能 (MVP)

#### 3.1 Prompt 输入区

- 文本输入框，支持多行输入
- 建议 placeholder: "输入你的 prompt (建议使用英文)..."
- 底部显示字符计数

#### 3.2 模型选择区

- 复选框列表，支持多选
- 默认选中 Flux.1 Schnell + DALL-E 3
- 必须显示每个模型的：
  - 模型名称 (如 "Flux.1 Schnell")
  - 提供商 (如 "Replicate")
  - 是否需要用户自填 API Key

**初始接入模型列表**：

| ID | 名称 | 提供商 | 是否平台内置 |
|----|------|--------|------------|
| flux-schnell | Flux.1 Schnell | Replicate | ✅ 是 |
| dall-e-3 | DALL-E 3 | OpenAI | ✅ 是 |
| sdxl | Stable Diffusion XL | Replicate | ✅ 是 |
| ideogram-2 | Ideogram 2.0 | Ideogram | ❌ 需要用户填 Key |

#### 3.3 生成按钮

- 点击后向选中模型发起并行请求
- 按钮状态：默认 / 生成中 (禁用 + 显示文案) / 完成后恢复
- 显示当前正在处理的模型数量

#### 3.4 结果展示区

- 每个模型一张结果卡片，横向排列
- 卡片内容：
  - 生成的图片 (宽度撑满卡片)
  - 模型名称
  - 生成耗时 (ms)
  - 预估成本 ($)
  - 下载按钮 (新窗口打开图片)

#### 3.5 加载状态

- 生成中时显示骨架屏 / Loading 占位
- 每个模型独立显示加载状态
- 某模型失败不影响其他模型展示

#### 3.6 错误处理

- API Key 缺失时报错提示
- 单个模型失败时显示错误信息，不阻塞其他模型
- 网络错误时显示友好提示

---

### 四、不做功能 (本版本不包含)

以下功能本版本不做，后续迭代再考虑：

- ❌ 用户注册 / 登录
- ❌ API Key 管理界面
- ❌ 历史记录 / 收藏
- ❌ 分享社区
- ❌ 订阅付费
- ❌ 数据库存储

---

### 五、页面结构

/ 首页 = 唯一页面
├── Header Logo + 简单导航
├── PromptInput 文本输入区
├── ModelSelector 模型选择复选框
├── GenerateButton 生成按钮
├── ResultsGrid 结果展示网格
└── Footer 版权 + 链接


---

### 六、API 设计

#### POST /api/generate

**请求体**:

```json
{
  "prompt": "A futuristic city at night with neon lights",
  "models": ["flux-schnell", "dall-e-3"]
}
```

**响应体**:
```json

{
  "success": true,
  "results": [
    {
      "model": "flux-schnell",
      "status": "success",
      "imageUrl": "https://replicate.delivery/...",
      "generationTime": 3200
    },
    {
      "model": "dall-e-3",
      "status": "success",
      "imageUrl": "https://oaidalleap...png",
      "generationTime": 12500
    }
  ]
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "API key not configured"
}
```

### 七、代码结构

/
├── app/
│   ├── page.tsx              # 首页 (所有UI)
│   ├── layout.tsx            # 布局
│   ├── globals.css           # 全局样式
│   └── api/
│       └── generate/
│           └── route.ts     # 生成API
├── lib/
│   └── models.ts            # 模型配置
├── .env.local               # 环境变量 (不提交)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts

---

### 八、响应式设计

| 断点 | 布局 |
|------|------|
| < 640px (手机) | 单列，结果卡片纵向堆叠 |
| 640-1024px (平板) | 两列网格 |
| > 1024px (桌面) | 三列网格 |

---

### 九、验收标准

开发完成后需满足：

| # | 标准 |
|---|------|
| 1 | 输入任意英文 prompt，选择至少 2 个模型，点击生成后能正确显示结果 |
| 2 | 生成过程中显示 Loading 状态 |
| 3 | 单个模型失败不影响其他模型展示 |
| 4 | 页面在手机端可正常访问 |
| 5 | Vercel 部署后可直接访问 |
| 6 | 无 console.error (警告可以) |

---

### 十、参考样式

- **整体风格**: 简洁、现代、无多余装饰
- **配色**: 白底 + 蓝灰文字 + 蓝色按钮 (参考 Vercel)
- **字体**: 系统字体栈
- **圆角**: 8px
- **间距**: 8px 基准单位

---

### 十一、部署流程
```
# 1. 本地开发测试
npm run dev

# 2. 提交代码到 GitHub
git init
git add .
git commit -m "feat: MVP - AI image generation comparison"
git push

# 3. Vercel 导入项目
# 访问 vercel.com -> Import Git Repository -> 选择仓库

# 4. 配置环境变量
# Vercel Dashboard -> Settings -> Environment Variables
# 添加 REPLICATE_API_TOKEN 和 OPENAI_API_KEY

# 5. 部署完成，获取访问地址
```

---

### 十二、注意事项

- API Key 安全: 不要把真实 Key 提交到 GitHub，所有 Key 走环境变量
- 成本控制: 初期只接入平台内置 Key，用户不填 Key 时最多 3 个模型可选
- 生成时间: DALL-E 3 等模型生成较慢 (10-20s)，需优化 Loading UX
- 图片加载: 部分图片 URL 有时效性，下载按钮直接跳转原地址




