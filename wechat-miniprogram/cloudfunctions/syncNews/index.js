// 云函数：同步新闻数据到云数据库
// 每小时执行一次，从API拉取新数据

const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();
const _ = db.command;

// 你的API服务器地址（替换为实际地址）
const API_BASE_URL = 'https://your-api-domain.com'; // TODO: 修改为你的实际API地址

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  console.log('开始同步新闻数据...');

  const startTime = Date.now();
  const result = {
    success: false,
    message: '',
    syncTime: new Date(),
    stats: {
      total: 0,
      new: 0,
      existed: 0,
      failed: 0
    }
  };

  try {
    // 1. 获取云数据库中最新新闻的时间戳（用于增量同步）
    const latestNews = await db.collection('news')
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    const lastSyncTime = latestNews.data.length > 0
      ? new Date(latestNews.data[0].created_at).getTime()
      : 0;

    console.log('上次同步时间:', new Date(lastSyncTime).toISOString());

    // 2. 从API获取最新新闻（分页获取，最多获取100条）
    const newsList = await fetchNewsFromAPI(1, 100);

    if (!newsList || newsList.length === 0) {
      result.message = '未获取到新闻数据';
      result.success = true;
      return result;
    }

    result.stats.total = newsList.length;
    console.log(`从API获取到 ${newsList.length} 条新闻`);

    // 3. 过滤出新数据（created_at 大于最后同步时间）
    const newItems = newsList.filter(news => {
      const newsTime = new Date(news.created_at).getTime();
      return newsTime > lastSyncTime;
    });

    console.log(`发现 ${newItems.length} 条新数据`);

    // 4. 批量保存到云数据库（避免重复）
    for (const newsItem of newItems) {
      try {
        // 检查是否已存在（通过link唯一标识）
        const existing = await db.collection('news')
          .where({
            link: newsItem.link
          })
          .get();

        if (existing.data.length > 0) {
          // 已存在，跳过不处理
          result.stats.existed++;
          console.log(`跳过已存在新闻: ${newsItem.title_zh}`);
        } else {
          // 新增数据
          await db.collection('news').add({
            data: {
              id: newsItem.id,
              title: newsItem.title,
              title_zh: newsItem.title_zh,
              link: newsItem.link,
              article_link: newsItem.article_link,
              summary_zh: newsItem.summary_zh,
              category: newsItem.category,
              keywords: newsItem.keywords,
              source: newsItem.source,
              image_url: newsItem.image_url,
              pub_date: new Date(newsItem.pub_date),
              created_at: new Date(newsItem.created_at),
              updated_at: db.serverDate()  // 同步到云数据库的时间
            }
          });
          result.stats.new++;
          console.log(`新增新闻: ${newsItem.title_zh}`);
        }
      } catch (err) {
        console.error(`处理新闻失败: ${newsItem.title_zh}`, err);
        result.stats.failed++;
      }
    }

    // 5. 返回同步结果
    const duration = Date.now() - startTime;
    result.success = true;
    result.message = `同步成功！新增 ${result.stats.new} 条，已存在 ${result.stats.existed} 条，失败 ${result.stats.failed} 条，耗时 ${duration}ms`;

    console.log(result.message);
    return result;

  } catch (error) {
    console.error('同步新闻失败:', error);
    result.success = false;
    result.message = error.message || '同步失败';
    return result;
  }
};

/**
 * 从API获取新闻列表
 */
async function fetchNewsFromAPI(page = 1, pageSize = 100) {
  try {
    const url = `${API_BASE_URL}/api/news/latest?page=${page}&pageSize=${pageSize}`;
    console.log('请求API:', url);

    // 使用 axios 发送 HTTP 请求
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data.success) {
      return response.data.data;
    } else {
      console.error('API返回错误:', response.status, response.data);
      return [];
    }
  } catch (error) {
    console.error('请求API失败:', error.message);
    throw error;
  }
}
