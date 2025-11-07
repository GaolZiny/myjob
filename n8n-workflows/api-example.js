/**
 * 新闻API示例代码
 * 用于在应用中查询和使用新闻数据
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'news_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

/**
 * 新闻API类
 */
class NewsAPI {
    /**
     * 获取最新新闻列表
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     * @param {string} category - 分类（可选）
     */
    static async getLatestNews(page = 1, pageSize = 20, category = null) {
        const offset = (page - 1) * pageSize;

        let sql = `
            SELECT
                id, title, summary, category, link, image_url,
                view_count, like_count, share_count,
                pub_date, created_at
            FROM news_articles
            WHERE 1=1
        `;

        const params = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        const [rows] = await pool.query(sql, params);

        // 获取总数
        let countSql = 'SELECT COUNT(*) as total FROM news_articles WHERE 1=1';
        const countParams = [];

        if (category) {
            countSql += ' AND category = ?';
            countParams.push(category);
        }

        const [countResult] = await pool.query(countSql, countParams);
        const total = countResult[0].total;

        return {
            data: rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    /**
     * 获取热门新闻
     * @param {number} limit - 数量限制
     * @param {number} days - 时间范围（天）
     */
    static async getHotNews(limit = 10, days = 7) {
        const sql = `
            SELECT
                id, title, summary, category, link, image_url,
                view_count, like_count, share_count,
                (view_count * 1 + like_count * 5 + share_count * 10) AS hot_score,
                pub_date, created_at
            FROM news_articles
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY hot_score DESC
            LIMIT ?
        `;

        const [rows] = await pool.query(sql, [days, limit]);
        return rows;
    }

    /**
     * 搜索新闻
     * @param {string} keyword - 搜索关键词
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     */
    static async searchNews(keyword, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;

        const sql = `
            SELECT
                id, title, summary, category, link, image_url,
                view_count, like_count, share_count,
                pub_date, created_at,
                MATCH(title, summary) AGAINST(? IN NATURAL LANGUAGE MODE) AS relevance
            FROM news_articles
            WHERE MATCH(title, summary) AGAINST(? IN NATURAL LANGUAGE MODE)
               OR keywords LIKE ?
            ORDER BY relevance DESC, created_at DESC
            LIMIT ? OFFSET ?
        `;

        const keywordPattern = `%${keyword}%`;
        const [rows] = await pool.query(sql, [keyword, keyword, keywordPattern, pageSize, offset]);

        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM news_articles
            WHERE MATCH(title, summary) AGAINST(? IN NATURAL LANGUAGE MODE)
               OR keywords LIKE ?
        `;

        const [countResult] = await pool.query(countSql, [keyword, keywordPattern]);
        const total = countResult[0].total;

        return {
            data: rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    /**
     * 获取新闻详情
     * @param {number} id - 新闻ID
     */
    static async getNewsDetail(id) {
        const sql = `
            SELECT
                id, title, description, summary, category, link, image_url,
                keywords, source, author,
                view_count, like_count, share_count,
                pub_date, created_at, updated_at
            FROM news_articles
            WHERE id = ?
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return null;
        }

        // 更新浏览量
        await pool.query('CALL update_view_count(?)', [id]);

        return rows[0];
    }

    /**
     * 获取分类列表
     */
    static async getCategories() {
        const sql = `
            SELECT * FROM category_stats
            ORDER BY article_count DESC
        `;

        const [rows] = await pool.query(sql);
        return rows;
    }

    /**
     * 点赞新闻
     * @param {number} id - 新闻ID
     */
    static async likeNews(id) {
        await pool.query('CALL update_like_count(?)', [id]);

        const [rows] = await pool.query(
            'SELECT like_count FROM news_articles WHERE id = ?',
            [id]
        );

        return rows[0]?.like_count || 0;
    }

    /**
     * 分享新闻
     * @param {number} id - 新闻ID
     */
    static async shareNews(id) {
        await pool.query(
            'UPDATE news_articles SET share_count = share_count + 1 WHERE id = ?',
            [id]
        );

        const [rows] = await pool.query(
            'SELECT share_count FROM news_articles WHERE id = ?',
            [id]
        );

        return rows[0]?.share_count || 0;
    }

    /**
     * 收藏新闻
     * @param {number} userId - 用户ID
     * @param {number} articleId - 文章ID
     */
    static async favoriteNews(userId, articleId) {
        try {
            await pool.query(
                'INSERT INTO user_favorites (user_id, article_id) VALUES (?, ?)',
                [userId, articleId]
            );
            return { success: true, message: '收藏成功' };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { success: false, message: '已经收藏过了' };
            }
            throw error;
        }
    }

    /**
     * 取消收藏
     * @param {number} userId - 用户ID
     * @param {number} articleId - 文章ID
     */
    static async unfavoriteNews(userId, articleId) {
        await pool.query(
            'DELETE FROM user_favorites WHERE user_id = ? AND article_id = ?',
            [userId, articleId]
        );
        return { success: true, message: '取消收藏成功' };
    }

    /**
     * 获取用户收藏列表
     * @param {number} userId - 用户ID
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     */
    static async getUserFavorites(userId, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;

        const sql = `
            SELECT
                a.id, a.title, a.summary, a.category, a.link, a.image_url,
                a.view_count, a.like_count, a.share_count,
                a.pub_date, f.created_at as favorited_at
            FROM news_articles a
            INNER JOIN user_favorites f ON a.id = f.article_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query(sql, [userId, pageSize, offset]);

        // 获取总数
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM user_favorites WHERE user_id = ?',
            [userId]
        );
        const total = countResult[0].total;

        return {
            data: rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    /**
     * 记录阅读历史
     * @param {number} userId - 用户ID
     * @param {number} articleId - 文章ID
     * @param {number} readDuration - 阅读时长（秒）
     * @param {number} readProgress - 阅读进度（百分比）
     */
    static async recordReadingHistory(userId, articleId, readDuration = 0, readProgress = 0) {
        const sql = `
            INSERT INTO user_reading_history
            (user_id, article_id, read_duration, read_progress)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                read_duration = read_duration + VALUES(read_duration),
                read_progress = GREATEST(read_progress, VALUES(read_progress)),
                updated_at = CURRENT_TIMESTAMP
        `;

        await pool.query(sql, [userId, articleId, readDuration, readProgress]);
        return { success: true };
    }

    /**
     * 获取用户阅读历史
     * @param {number} userId - 用户ID
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     */
    static async getUserReadingHistory(userId, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;

        const sql = `
            SELECT
                a.id, a.title, a.summary, a.category, a.link, a.image_url,
                h.read_duration, h.read_progress, h.updated_at as last_read_at
            FROM news_articles a
            INNER JOIN user_reading_history h ON a.id = h.article_id
            WHERE h.user_id = ?
            ORDER BY h.updated_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query(sql, [userId, pageSize, offset]);

        // 获取总数
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM user_reading_history WHERE user_id = ?',
            [userId]
        );
        const total = countResult[0].total;

        return {
            data: rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    /**
     * 获取推荐新闻（基于用户阅读历史）
     * @param {number} userId - 用户ID
     * @param {number} limit - 数量限制
     */
    static async getRecommendedNews(userId, limit = 10) {
        // 获取用户最常阅读的分类
        const categorySql = `
            SELECT a.category, COUNT(*) as count
            FROM user_reading_history h
            INNER JOIN news_articles a ON h.article_id = a.id
            WHERE h.user_id = ?
            GROUP BY a.category
            ORDER BY count DESC
            LIMIT 3
        `;

        const [categories] = await pool.query(categorySql, [userId]);

        if (categories.length === 0) {
            // 如果没有阅读历史，返回热门新闻
            return await this.getHotNews(limit);
        }

        const categoryList = categories.map(c => c.category);
        const placeholders = categoryList.map(() => '?').join(',');

        // 推荐同类别的未读新闻
        const sql = `
            SELECT
                a.id, a.title, a.summary, a.category, a.link, a.image_url,
                a.view_count, a.like_count, a.share_count,
                a.pub_date, a.created_at
            FROM news_articles a
            WHERE a.category IN (${placeholders})
              AND a.id NOT IN (
                  SELECT article_id FROM user_reading_history WHERE user_id = ?
              )
              AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY a.created_at DESC
            LIMIT ?
        `;

        const [rows] = await pool.query(sql, [...categoryList, userId, limit]);
        return rows;
    }

    /**
     * 获取统计数据
     */
    static async getStatistics() {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM news_articles) as total_articles,
                (SELECT COUNT(*) FROM news_articles WHERE DATE(created_at) = CURDATE()) as today_articles,
                (SELECT SUM(view_count) FROM news_articles) as total_views,
                (SELECT SUM(like_count) FROM news_articles) as total_likes,
                (SELECT COUNT(DISTINCT user_id) FROM user_favorites) as total_users
        `;

        const [rows] = await pool.query(sql);
        return rows[0];
    }
}

// ==========================================
// Express API 路由示例
// ==========================================

const express = require('express');
const app = express();

app.use(express.json());

// 获取最新新闻
app.get('/api/news/latest', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, category } = req.query;
        const result = await NewsAPI.getLatestNews(
            parseInt(page),
            parseInt(pageSize),
            category
        );
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取热门新闻
app.get('/api/news/hot', async (req, res) => {
    try {
        const { limit = 10, days = 7 } = req.query;
        const data = await NewsAPI.getHotNews(parseInt(limit), parseInt(days));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 搜索新闻
app.get('/api/news/search', async (req, res) => {
    try {
        const { keyword, page = 1, pageSize = 20 } = req.query;
        if (!keyword) {
            return res.status(400).json({ success: false, message: '请提供搜索关键词' });
        }
        const result = await NewsAPI.searchNews(keyword, parseInt(page), parseInt(pageSize));
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取新闻详情
app.get('/api/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await NewsAPI.getNewsDetail(parseInt(id));
        if (!data) {
            return res.status(404).json({ success: false, message: '新闻不存在' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取分类列表
app.get('/api/categories', async (req, res) => {
    try {
        const data = await NewsAPI.getCategories();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 点赞新闻
app.post('/api/news/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const likeCount = await NewsAPI.likeNews(parseInt(id));
        res.json({ success: true, likeCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 分享新闻
app.post('/api/news/:id/share', async (req, res) => {
    try {
        const { id } = req.params;
        const shareCount = await NewsAPI.shareNews(parseInt(id));
        res.json({ success: true, shareCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 收藏新闻
app.post('/api/news/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const result = await NewsAPI.favoriteNews(userId, parseInt(id));
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取用户收藏
app.get('/api/user/:userId/favorites', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, pageSize = 20 } = req.query;
        const result = await NewsAPI.getUserFavorites(
            parseInt(userId),
            parseInt(page),
            parseInt(pageSize)
        );
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 记录阅读历史
app.post('/api/news/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, readDuration, readProgress } = req.body;
        const result = await NewsAPI.recordReadingHistory(
            userId,
            parseInt(id),
            readDuration,
            readProgress
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取推荐新闻
app.get('/api/user/:userId/recommended', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10 } = req.query;
        const data = await NewsAPI.getRecommendedNews(parseInt(userId), parseInt(limit));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
    try {
        const data = await NewsAPI.getStatistics();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`新闻API服务运行在端口 ${PORT}`);
});

module.exports = NewsAPI;
