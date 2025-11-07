# 快速开始指南

本指南将帮助你在15分钟内搭建完整的新闻AI翻译系统，专为**微信小程序**设计。

## 系统要求

- Node.js 18+ 或 Docker
- PostgreSQL 12+
- Google Gemini API Key（免费）

---

## 步骤1：获取Google Gemini API Key

### 免费获取

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用Google账号登录
3. 点击 "Get API Key" 或 "Create API Key"
4. 复制API密钥并保存

**优势：**
- 完全免费（有配额）
- 每分钟60次请求
- 支持多语言翻译
- 质量与GPT-4相当

---

## 步骤2：安装PostgreSQL

### macOS

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows

下载安装包：https://www.postgresql.org/download/windows/

### Docker（推荐）

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=news_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15
```

---

## 步骤3：创建数据库

```bash
# 连接到PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE news_db;

# 连接到新数据库
\c news_db

# 执行schema文件
\i /path/to/database-schema.sql

# 或者使用命令行
psql -U postgres -d news_db -f database-schema.sql
```

验证：
```sql
\dt  -- 查看所有表
SELECT * FROM news_categories;  -- 应该看到8个分类
```

---

## 步骤4：安装和配置n8n

### 方式A：使用npm

```bash
# 全局安装n8n
npm install n8n -g

# 启动n8n
n8n start

# 访问 http://localhost:5678
```

### 方式B：使用Docker

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

---

## 步骤5：导入工作流

1. 打开浏览器访问 http://localhost:5678
2. 首次访问需要设置账号密码
3. 点击右上角 "+" 或 "Import Workflow"
4. 选择 `news-ai-classification-workflow.json` 文件
5. 点击 "Import"

---

## 步骤6：配置数据库凭证

1. 在工作流中找到任意PostgreSQL节点（如"检查重复新闻"）
2. 点击节点
3. 在右侧面板中找到 "Credential to connect with"
4. 点击 "Create New Credential"
5. 填写以下信息：
   ```
   Host: localhost
   Database: news_db
   User: postgres
   Password: your_password
   Port: 5432
   SSL: Disabled (本地开发)
   ```
6. 点击 "Save"
7. 同样的凭证会自动应用到其他PostgreSQL节点

---

## 步骤7：配置Gemini API

1. 找到 "Gemini AI分类和翻译" 节点
2. 这是一个HTTP Request节点
3. 在URL参数中找到 `key` 参数
4. 将 `{{ $credentials.apiKey }}` 替换为你的Gemini API Key

   或者创建凭证：
   - 点击 "Credential to connect with"
   - 选择 "Google PaLM API" 或 "Generic Credential"
   - 输入你的Gemini API Key

---

## 步骤8：测试工作流

### 手动测试

1. 点击工作流右上角的 "Execute Workflow" 按钮
2. 等待执行完成（可能需要1-2分钟）
3. 检查每个节点的输出：
   - ✅ 绿色：成功
   - ❌ 红色：失败（查看错误信息）
   - ⚪ 灰色：未执行

### 验证数据库

```sql
-- 查看保存的新闻
SELECT id, title, category, summary_zh FROM news_articles LIMIT 5;

-- 应该能看到带中文摘要的新闻数据
```

---

## 步骤9：激活自动运行

1. 确认测试成功后
2. 点击右上角的 "Inactive" 开关
3. 切换为 "Active"
4. 工作流将每2小时自动运行一次

---

## 步骤10：部署API服务

### 安装依赖

```bash
cd n8n-workflows
npm install
```

### 配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用你喜欢的编辑器

# 填入以下内容：
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=news_db
GEMINI_API_KEY=your_gemini_key
PORT=3000
```

### 启动API服务

```bash
# 开发模式（支持热重载）
npm run dev

# 或生产模式
npm start
```

### 测试API

```bash
# 健康检查
curl http://localhost:3000/health

# 获取最新新闻
curl http://localhost:3000/api/news/latest

# 搜索新闻
curl "http://localhost:3000/api/news/search?keyword=AI"

# 获取分类
curl http://localhost:3000/api/categories
```

---

## 微信小程序集成

### 在小程序中调用API

```javascript
// app.js 或 config.js
const API_BASE_URL = 'https://your-domain.com';  // 生产环境
// const API_BASE_URL = 'http://localhost:3000';  // 开发环境

// pages/news/news.js
Page({
  data: {
    newsList: [],
    loading: false,
    page: 1,
    category: null
  },

  onLoad() {
    this.loadNews();
  },

  loadNews() {
    this.setData({ loading: true });

    wx.request({
      url: `${API_BASE_URL}/api/news/latest`,
      data: {
        page: this.data.page,
        pageSize: 20,
        category: this.data.category
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({
            newsList: this.data.newsList.concat(res.data.data),
            loading: false
          });
        }
      },
      fail: (err) => {
        console.error('加载新闻失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  }
});
```

---

## 常见问题

### Q1: Gemini API调用失败

**问题**：`Error: Request failed with status code 403`

**解决方案**：
1. 检查API Key是否正确
2. 确认API Key有效（未过期）
3. 检查网络连接（中国大陆可能需要代理）

### Q2: PostgreSQL连接失败

**问题**：`Error: connect ECONNREFUSED`

**解决方案**：
1. 确认PostgreSQL服务正在运行
   ```bash
   # macOS/Linux
   sudo systemctl status postgresql

   # 或检查进程
   ps aux | grep postgres
   ```
2. 检查端口是否正确（默认5432）
3. 验证用户名和密码

### Q3: RSS源无法访问

**问题**：`Error: 404 Not Found`

**解决方案**：
1. 更换RSS源URL
2. 检查网络连接
3. 配置代理（如果在中国大陆）

### Q4: 工作流执行缓慢

**原因**：Gemini API可能较慢

**解决方案**：
1. 减少每次处理的新闻数量
2. 增加HTTP Request节点的超时时间
3. 考虑使用其他更快的AI服务

### Q5: 翻译质量不佳

**解决方案**：
1. 调整Gemini的temperature参数（0.1-0.5）
2. 优化提示词，提供更多上下文
3. 增加maxOutputTokens参数

---

## 生产环境部署

### 使用Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: news_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - WEBHOOK_URL=https://your-domain.com
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    restart: unless-stopped

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=news_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NODE_ENV=production
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
  n8n_data:
```

启动：
```bash
# 创建.env文件
echo "DB_PASSWORD=your_db_password" > .env
echo "N8N_PASSWORD=your_n8n_password" >> .env
echo "GEMINI_API_KEY=your_gemini_key" >> .env

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 下一步

✅ **基础配置完成**

现在你可以：
- [ ] 添加更多RSS源
- [ ] 自定义分类标准
- [ ] 调整AI提示词
- [ ] 配置Nginx反向代理
- [ ] 设置HTTPS
- [ ] 部署到云服务器

---

## 性能监控

### 查看n8n执行历史

1. 访问 http://localhost:5678
2. 点击左侧 "Executions"
3. 查看所有执行记录
4. 点击查看详细日志

### 查看数据库统计

```sql
-- 查看新闻总数
SELECT COUNT(*) FROM news_articles;

-- 按分类统计
SELECT category, COUNT(*) as count
FROM news_articles
GROUP BY category
ORDER BY count DESC;

-- 今日新增
SELECT COUNT(*) FROM news_articles
WHERE DATE(created_at) = CURRENT_DATE;
```

---

## 获取帮助

- 查看完整文档：[README.md](./README.md)
- n8n官方文档：https://docs.n8n.io/
- Google Gemini文档：https://ai.google.dev/docs
- PostgreSQL文档：https://www.postgresql.org/docs/

---

**恭喜！你已经成功搭建了新闻AI翻译系统！** 🎉

现在微信小程序可以调用API获取翻译后的新闻数据了。
