# 快速开始指南

本指南将帮助你在15分钟内搭建完整的新闻AI分类系统。

## 目录

- [系统要求](#系统要求)
- [步骤1：安装n8n](#步骤1安装n8n)
- [步骤2：配置数据库](#步骤2配置数据库)
- [步骤3：获取OpenAI API密钥](#步骤3获取openai-api密钥)
- [步骤4：导入工作流](#步骤4导入工作流)
- [步骤5：配置凭证](#步骤5配置凭证)
- [步骤6：测试工作流](#步骤6测试工作流)
- [步骤7：部署API服务](#步骤7部署api服务)
- [常见问题](#常见问题)

---

## 系统要求

- Node.js 18+ 或 Docker
- MySQL 8.0+ 或 PostgreSQL 12+
- OpenAI API 账号（或其他AI服务）
- 至少 2GB 可用内存

---

## 步骤1：安装n8n

### 方式A：使用npm（推荐）

```bash
# 全局安装n8n
npm install n8n -g

# 启动n8n
n8n start

# n8n将在 http://localhost:5678 启动
```

### 方式B：使用Docker

```bash
# 拉取并运行n8n容器
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 访问 http://localhost:5678
```

### 方式C：使用Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_password
    volumes:
      - ~/.n8n:/home/node/.n8n

  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: your_root_password
      MYSQL_DATABASE: news_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

启动：
```bash
docker-compose up -d
```

---

## 步骤2：配置数据库

### 创建数据库和表

```bash
# 登录MySQL
mysql -u root -p

# 执行schema文件
mysql -u root -p < database-schema.sql

# 或者手动执行
mysql -u root -p
> source /path/to/database-schema.sql
```

### 验证数据库

```sql
USE news_db;
SHOW TABLES;

-- 应该看到以下表：
-- news_articles
-- news_categories
-- news_keywords
-- user_favorites
-- user_reading_history
-- rss_sources
-- daily_news_stats
```

---

## 步骤3：获取OpenAI API密钥

### 使用OpenAI（推荐）

1. 访问 https://platform.openai.com/signup
2. 注册账号并登录
3. 进入 https://platform.openai.com/api-keys
4. 点击 "Create new secret key"
5. 复制并保存API密钥

**注意：**
- 需要绑定信用卡
- GPT-4o-mini 价格约 $0.15/1M tokens（输入）
- 推荐先充值 $5-10 测试

### 使用国产AI服务（可选）

#### 通义千问（阿里云）
1. 访问 https://dashscope.aliyun.com/
2. 注册并获取API Key
3. 在工作流中修改AI节点配置

#### 文心一言（百度）
1. 访问 https://cloud.baidu.com/product/wenxinworkshop
2. 注册并创建应用
3. 获取 API Key 和 Secret Key

#### 智谱AI（ChatGLM）
1. 访问 https://open.bigmodel.cn/
2. 注册并获取API Key
3. 成本更低，约 ¥0.005/千tokens

---

## 步骤4：导入工作流

1. 打开 n8n 界面：http://localhost:5678
2. 首次访问需要创建账号
3. 点击右上角 "+" 按钮
4. 选择 "Import from File"
5. 选择 `news-ai-classification-workflow.json`
6. 点击 "Import"

---

## 步骤5：配置凭证

### 5.1 配置MySQL凭证

1. 点击任意MySQL节点（如 "保存到MySQL数据库"）
2. 在 "Credential to connect with" 下拉框中选择 "Create New"
3. 填写数据库信息：
   - **Connection**: MySQL
   - **Host**: localhost（或数据库地址）
   - **Database**: news_db
   - **User**: your_username
   - **Password**: your_password
   - **Port**: 3306
4. 点击 "Test" 测试连接
5. 保存凭证

### 5.2 配置OpenAI凭证

1. 点击 "AI分类和总结" 节点
2. 在 "Credential to connect with" 下拉框中选择 "Create New"
3. 填写API信息：
   - **API Key**: 你的OpenAI API密钥
   - **Base URL**: https://api.openai.com/v1（默认）
4. 保存凭证

### 5.3 自定义配置（可选）

#### 修改RSS源

1. 点击 "读取RSS新闻源" 节点
2. 修改 URL 为你想要的新闻源：
   - Google新闻：`https://news.google.com/rss?hl=zh-CN`
   - BBC中文：`https://feeds.bbci.co.uk/zhongwen/simp/rss.xml`
   - 36氪：`https://36kr.com/feed`
   - 虎嗅网：`https://www.huxiu.com/rss/0.xml`

#### 修改触发频率

1. 点击 "定时触发器" 节点
2. 修改 "Hours Interval" 为你想要的频率（小时）

#### 自定义AI提示词

1. 点击 "AI分类和总结" 节点
2. 修改 System Message 中的分类标准和输出格式

---

## 步骤6：测试工作流

### 手动测试

1. 点击右上角 "Execute Workflow" 按钮
2. 观察每个节点的执行状态
3. 查看节点输出数据：
   - 绿色：成功
   - 红色：失败
   - 灰色：未执行

### 检查数据库

```sql
USE news_db;

-- 查看保存的新闻
SELECT * FROM news_articles ORDER BY created_at DESC LIMIT 5;

-- 查看分类统计
SELECT category, COUNT(*) as count FROM news_articles GROUP BY category;
```

### 常见错误处理

**错误1：RSS源无法访问**
```
Error: Request failed with status code 403
```
解决：更换RSS源或添加User-Agent头部

**错误2：OpenAI API超时**
```
Error: Request timeout
```
解决：检查网络连接，或增加超时时间

**错误3：数据库连接失败**
```
Error: ER_ACCESS_DENIED_ERROR
```
解决：检查数据库凭证是否正确

---

## 步骤7：部署API服务

### 7.1 安装依赖

```bash
cd n8n-workflows
npm install
```

### 7.2 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑.env文件，填入你的配置
nano .env
```

### 7.3 启动API服务

```bash
# 开发模式（支持热重载）
npm run dev

# 生产模式
npm start
```

### 7.4 测试API

```bash
# 获取最新新闻
curl http://localhost:3000/api/news/latest

# 获取热门新闻
curl http://localhost:3000/api/news/hot

# 搜索新闻
curl "http://localhost:3000/api/news/search?keyword=AI"

# 获取分类
curl http://localhost:3000/api/categories
```

### 7.5 在应用中使用API

**JavaScript/TypeScript示例：**

```javascript
// 获取最新新闻
async function getLatestNews(page = 1, category = null) {
  const params = new URLSearchParams({ page, pageSize: 20 });
  if (category) params.append('category', category);

  const response = await fetch(`http://localhost:3000/api/news/latest?${params}`);
  const data = await response.json();
  return data;
}

// 搜索新闻
async function searchNews(keyword) {
  const response = await fetch(`http://localhost:3000/api/news/search?keyword=${keyword}`);
  const data = await response.json();
  return data;
}

// 使用
const news = await getLatestNews(1, '科技');
console.log(news);
```

**React示例：**

```jsx
import { useState, useEffect } from 'react';

function NewsList() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/news/latest')
      .then(res => res.json())
      .then(data => {
        setNews(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      {news.map(item => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
          <span>{item.category}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 步骤8：激活工作流（自动运行）

1. 在n8n界面中，点击右上角的 "Inactive" 开关
2. 开关变为 "Active" 表示已激活
3. 工作流将按照设定的频率自动运行
4. 可以在 "Executions" 查看运行历史

---

## 常见问题

### Q1: 工作流执行失败怎么办？

1. 点击失败的节点查看错误信息
2. 检查凭证配置是否正确
3. 验证网络连接
4. 查看n8n日志：`~/.n8n/logs/`

### Q2: 如何添加多个RSS源？

**方式A：在工作流中添加多个RSS节点**
1. 复制 "读取RSS新闻源" 节点
2. 修改每个节点的URL
3. 将所有节点连接到同一个下游节点

**方式B：使用数据库配置**
1. 在 `rss_sources` 表中添加多个源
2. 修改工作流从数据库读取RSS源列表

### Q3: OpenAI API太贵，有替代方案吗？

是的，可以使用：
1. **通义千问**（阿里云）：价格约为OpenAI的1/10
2. **文心一言**（百度）：有免费额度
3. **ChatGLM**（智谱AI）：性价比高
4. **本地部署**：使用Ollama运行开源模型

### Q4: 如何避免重复新闻？

工作流已内置去重逻辑：
1. 通过 `link` 字段检查是否存在
2. 数据库 `link` 字段设置了唯一索引
3. 只处理新增的新闻

### Q5: 如何提高处理速度？

1. 使用更快的AI模型（如GPT-4o-mini）
2. 减少每次拉取的新闻数量
3. 使用批量处理
4. 添加Redis缓存

### Q6: 如何监控工作流状态？

1. 在n8n中查看 "Executions" 历史
2. 配置Webhook通知失败
3. 使用n8n的API监控
4. 添加日志记录

### Q7: 数据库表太大怎么办？

```sql
-- 定期清理旧数据（保留30天）
DELETE FROM news_articles
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 优化表
OPTIMIZE TABLE news_articles;

-- 或者设置自动清理（创建定时任务）
CREATE EVENT clean_old_news
ON SCHEDULE EVERY 1 DAY
DO DELETE FROM news_articles WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## 下一步

✅ **完成基础配置**
- [ ] 添加更多RSS源
- [ ] 自定义分类标准
- [ ] 优化AI提示词

✅ **增强功能**
- [ ] 添加图片下载和存储
- [ ] 添加情感分析
- [ ] 添加相关新闻推荐
- [ ] 添加邮件通知

✅ **性能优化**
- [ ] 添加Redis缓存
- [ ] 实现批量处理
- [ ] 添加CDN加速
- [ ] 数据库索引优化

✅ **部署上线**
- [ ] 使用PM2管理进程
- [ ] 配置Nginx反向代理
- [ ] 设置HTTPS
- [ ] 添加日志监控

---

## 获取帮助

- 查看完整文档：[README.md](./README.md)
- n8n官方文档：https://docs.n8n.io/
- OpenAI文档：https://platform.openai.com/docs/
- 提交Issue：[GitHub Issues]

---

## 许可证

MIT License

---

**恭喜！你已经成功搭建了新闻AI分类系统！** 🎉
