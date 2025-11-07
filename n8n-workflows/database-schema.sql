-- ==========================================
-- 新闻AI分类系统数据库架构 (PostgreSQL)
-- 简化版本 - 专为微信小程序云服务设计
-- ==========================================

-- 创建数据库
-- CREATE DATABASE news_db WITH ENCODING 'UTF8';
-- \c news_db;

-- ==========================================
-- 主表：新闻文章表
-- ==========================================
CREATE TABLE IF NOT EXISTS news_articles (
    -- 主键
    id BIGSERIAL PRIMARY KEY,

    -- 新闻基本信息
    title VARCHAR(500) NOT NULL,
    description TEXT,
    link VARCHAR(1000) NOT NULL UNIQUE,
    pub_date TIMESTAMP,

    -- AI处理结果
    category VARCHAR(50) NOT NULL DEFAULT '其他',
    summary TEXT,
    summary_zh TEXT,  -- 中文翻译摘要
    keywords VARCHAR(500),

    -- 元数据
    source VARCHAR(200),
    image_url VARCHAR(1000),

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_pub_date ON news_articles(pub_date);
CREATE INDEX idx_news_created_at ON news_articles(created_at);

-- 全文搜索索引（PostgreSQL使用GIN索引）
CREATE INDEX idx_news_fulltext ON news_articles USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary_zh, '')));

-- 创建注释
COMMENT ON TABLE news_articles IS '新闻文章主表';
COMMENT ON COLUMN news_articles.title IS '新闻标题';
COMMENT ON COLUMN news_articles.description IS '新闻描述/内容';
COMMENT ON COLUMN news_articles.link IS '新闻链接（唯一）';
COMMENT ON COLUMN news_articles.pub_date IS '发布时间';
COMMENT ON COLUMN news_articles.category IS '新闻分类';
COMMENT ON COLUMN news_articles.summary IS 'AI生成的英文摘要';
COMMENT ON COLUMN news_articles.summary_zh IS 'AI生成的中文摘要';
COMMENT ON COLUMN news_articles.keywords IS '关键词（逗号分隔）';
COMMENT ON COLUMN news_articles.source IS '新闻来源';
COMMENT ON COLUMN news_articles.image_url IS '封面图片URL';

-- ==========================================
-- 分类表：新闻分类定义
-- ==========================================
CREATE TABLE IF NOT EXISTS news_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(50),
    description VARCHAR(500),
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_categories_sort ON news_categories(sort_order);

COMMENT ON TABLE news_categories IS '新闻分类表';

-- 插入默认分类
INSERT INTO news_categories (name, name_en, description, icon, sort_order) VALUES
('科技', 'technology', '科技、互联网、AI、数码产品等', '💻', 1),
('财经', 'finance', '金融、经济、股市、企业等', '💰', 2),
('政治', 'politics', '政府、政策、国际关系等', '🏛️', 3),
('体育', 'sports', '体育赛事、运动员等', '⚽', 4),
('娱乐', 'entertainment', '影视、音乐、明星等', '🎬', 5),
('健康', 'health', '医疗、养生、疾病等', '🏥', 6),
('社会', 'society', '民生、社会事件等', '👥', 7),
('其他', 'other', '无法归类的内容', '📰', 99)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- RSS源配置表
-- ==========================================
CREATE TABLE IF NOT EXISTS rss_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(1000) NOT NULL UNIQUE,
    category VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    fetch_interval INTEGER DEFAULT 120,
    last_fetch_at TIMESTAMP,
    fetch_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_rss_is_active ON rss_sources(is_active);
CREATE INDEX idx_rss_last_fetch ON rss_sources(last_fetch_at);

COMMENT ON TABLE rss_sources IS 'RSS源配置表';

-- 插入默认RSS源（英文新闻源，需要翻译）
INSERT INTO rss_sources (name, url, category, language, fetch_interval) VALUES
('BBC News', 'http://feeds.bbci.co.uk/news/rss.xml', '综合', 'en', 120),
('CNN Top Stories', 'http://rss.cnn.com/rss/edition.rss', '综合', 'en', 120),
('TechCrunch', 'https://techcrunch.com/feed/', '科技', 'en', 60),
('The Verge', 'https://www.theverge.com/rss/index.xml', '科技', 'en', 60),
('Reuters', 'https://www.reutersagency.com/feed/', '财经', 'en', 90)
ON CONFLICT (url) DO NOTHING;

-- ==========================================
-- 视图：最新新闻
-- ==========================================
CREATE OR REPLACE VIEW latest_news AS
SELECT
    id,
    title,
    summary_zh as summary,
    category,
    link,
    image_url,
    pub_date,
    created_at
FROM news_articles
ORDER BY created_at DESC
LIMIT 100;

-- ==========================================
-- 视图：分类统计
-- ==========================================
CREATE OR REPLACE VIEW category_stats AS
SELECT
    c.name AS category_name,
    c.name_en,
    c.icon,
    COUNT(a.id) AS article_count
FROM news_categories c
LEFT JOIN news_articles a ON c.name = a.category
GROUP BY c.id, c.name, c.name_en, c.icon
ORDER BY c.sort_order;

-- ==========================================
-- 函数：更新 updated_at 时间戳
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建触发器
CREATE TRIGGER update_news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_categories_updated_at
    BEFORE UPDATE ON news_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rss_sources_updated_at
    BEFORE UPDATE ON rss_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 常用查询示例
-- ==========================================

-- 1. 查询最新新闻（按分类）
-- SELECT * FROM news_articles WHERE category = '科技' ORDER BY created_at DESC LIMIT 20;

-- 2. 全文搜索（PostgreSQL）
-- SELECT * FROM news_articles
-- WHERE to_tsvector('simple', title || ' ' || summary_zh) @@ to_tsquery('simple', '人工智能')
-- ORDER BY created_at DESC;

-- 3. 关键词搜索
-- SELECT * FROM news_articles WHERE keywords LIKE '%AI%' ORDER BY created_at DESC;

-- 4. 按分类统计
-- SELECT * FROM category_stats;

-- 5. 清理30天前的旧新闻
-- DELETE FROM news_articles WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ==========================================
-- 性能优化建议
-- ==========================================

-- 1. 定期清理旧数据（可以设置定时任务）
-- 2. 使用VACUUM命令优化表
-- VACUUM ANALYZE news_articles;

-- 3. 查看表大小
-- SELECT
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
