-- ==========================================
-- 新闻AI分类系统数据库架构 (PostgreSQL)
-- 极简版本 - 专为微信小程序云服务设计
-- ==========================================

-- 创建数据库
-- CREATE DATABASE news_db WITH ENCODING 'UTF8';
-- \c news_db;

-- ==========================================
-- 主表：新闻文章表（唯一的表）
-- ==========================================
CREATE TABLE IF NOT EXISTS news_articles (
    -- 主键
    id BIGSERIAL PRIMARY KEY,

    -- 新闻基本信息
    title VARCHAR(500) NOT NULL,
    title_zh VARCHAR(500),  -- 中文翻译标题
    link VARCHAR(1000) NOT NULL UNIQUE,
    article_link VARCHAR(1000) NOT NULL UNIQUE,  -- 文章链接（唯一）
    pub_date TIMESTAMP,

    -- AI处理结果
    category VARCHAR(50) NOT NULL DEFAULT '其他',
    summary_zh TEXT,  -- 中文摘要
    keywords VARCHAR(500),

    -- 元数据
    source VARCHAR(200),  -- 在workflow中直接设置，如 'BBC News', 'CNN', 'TechCrunch' 等
    image_url VARCHAR(1000),

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 创建索引
-- ==========================================
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_source ON news_articles(source);
CREATE INDEX idx_news_pub_date ON news_articles(pub_date);
CREATE INDEX idx_news_created_at ON news_articles(created_at);

-- 全文搜索索引（PostgreSQL GIN索引）
CREATE INDEX idx_news_fulltext ON news_articles
USING gin(to_tsvector('simple',
    coalesce(title, '') || ' ' ||
    coalesce(title_zh, '') || ' ' ||
    coalesce(summary_zh, '')
));

-- ==========================================
-- 创建注释
-- ==========================================
COMMENT ON TABLE news_articles IS '新闻文章主表 - 唯一的数据表';
COMMENT ON COLUMN news_articles.title IS '新闻标题（英文原文）';
COMMENT ON COLUMN news_articles.title_zh IS 'AI翻译的中文标题';
COMMENT ON COLUMN news_articles.link IS '新闻链接（唯一约束）';
COMMENT ON COLUMN news_articles.pub_date IS '新闻发布时间';
COMMENT ON COLUMN news_articles.category IS 'AI分类：科技/财经/政治/体育/娱乐/健康/社会/其他';
COMMENT ON COLUMN news_articles.summary_zh IS 'AI生成的中文摘要';
COMMENT ON COLUMN news_articles.keywords IS '关键词（逗号分隔）';
COMMENT ON COLUMN news_articles.source IS '新闻来源（在workflow中配置，如 BBC News, CNN 等）';
COMMENT ON COLUMN news_articles.image_url IS '封面图片URL';

-- ==========================================
-- 触发器：自动更新 updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 常用查询示例
-- ==========================================

-- 1. 查询最新新闻（按分类）
-- SELECT * FROM news_articles WHERE category = '科技' ORDER BY created_at DESC LIMIT 20;

-- 2. 查询指定来源的新闻
-- SELECT * FROM news_articles WHERE source = 'BBC News' ORDER BY created_at DESC LIMIT 20;

-- 3. 全文搜索
-- SELECT * FROM news_articles
-- WHERE to_tsvector('simple', title || ' ' || coalesce(title_zh, '') || ' ' || coalesce(summary_zh, ''))
--       @@ to_tsquery('simple', '人工智能')
-- ORDER BY created_at DESC;

-- 4. 关键词搜索
-- SELECT * FROM news_articles WHERE keywords LIKE '%AI%' ORDER BY created_at DESC;

-- 5. 分类统计
-- SELECT category, COUNT(*) as count FROM news_articles GROUP BY category ORDER BY count DESC;

-- 6. 来源统计
-- SELECT source, COUNT(*) as count FROM news_articles GROUP BY source ORDER BY count DESC;

-- 7. 清理30天前的旧新闻
-- DELETE FROM news_articles WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ==========================================
-- 性能优化建议
-- ==========================================

-- 1. 定期清理旧数据（可以设置定时任务）
-- 2. 定期执行 VACUUM 优化表
-- VACUUM ANALYZE news_articles;

-- 3. 查看表大小
-- SELECT pg_size_pretty(pg_total_relation_size('news_articles')) AS table_size;

-- ==========================================
-- 分类说明
-- ==========================================
-- AI会将新闻分为以下固定分类（在workflow的Gemini提示词中定义）：
-- - 科技 (technology)
-- - 财经 (finance)
-- - 政治 (politics)
-- - 体育 (sports)
-- - 娱乐 (entertainment)
-- - 健康 (health)
-- - 社会 (society)
-- - 其他 (other)

-- ==========================================
-- 如何添加新的RSS源
-- ==========================================
-- 直接在n8n workflow中：
-- 1. 添加新的RSS Reader节点，配置URL
-- 2. 在"格式化数据"节点中设置对应的source名称
-- 例如：source: 'TechCrunch', source: 'CNN', source: 'Reuters' 等
-- 无需修改数据库！
