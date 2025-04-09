const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const config = {
  postsDir: './posts',
  sitemapPath: './public/sitemap.xml',
  baseUrl: 'https://gaoze1998.win'
};

// 获取所有文章文件
function getPosts() {
  return glob.sync(path.join(config.postsDir, '**/*.md'));
}

// 生成sitemap XML
function generateSitemap(posts) {
  const now = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  posts.forEach(post => {
    const postPath = post.replace(config.postsDir, '').replace('.md', '');
    xml += `
  <url>
    <loc>${config.baseUrl}${postPath}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += '\n</urlset>';
  return xml;
}

// 主函数
function updateSitemap() {
  try {
    const posts = getPosts();
    const sitemap = generateSitemap(posts);
    
    fs.writeFileSync(config.sitemapPath, sitemap);
    console.log('✅ Sitemap updated successfully!');
  } catch (error) {
    console.error('❌ Error updating sitemap:', error);
  }
}

// 执行更新
updateSitemap(); 