# GrowthOS V0.1

## 本地运行
1. 将全部文件复制到 `D:\Projects\growthos`
2. 在该目录打开终端
3. 执行 `npm install`
4. 执行 `npm run dev`
5. 打开 `http://localhost:3000`

## Supabase
1. 打开 Supabase 项目 → SQL Editor
2. 粘贴并执行 `supabase.sql`
3. 项目 Settings → API，复制 URL 和 anon key
4. 将 `.env.example` 复制为 `.env.local` 并填写
5. 后台地址：`/admin`

## Vercel
1. 将代码提交并推送到 GitHub
2. Vercel Import Git Repository
3. 添加与 `.env.local` 相同的环境变量
4. Deploy

## 上线前修改
- `app/report/page.tsx` 中的预约电话 `13800000000`
- 首页和报告页品牌文案
