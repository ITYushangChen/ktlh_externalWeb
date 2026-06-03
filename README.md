# 开拓隆海送货引导

厂区固定二维码 → 司机扫码查看 **厂区平面图**、**统一送货流程**、**各送货类型对接人电话**。

## 司机端 `/`

- 显示厂区平面图（`public/factory-map.png`）
- 旁侧显示管理员配置的全局送货流程（每行一步）
- 下方列出所有送货类型、接货负责人、手机号（一键拨号）

## 管理端 `/admin`

默认**无需密码**即可进入。若要启用登录：在 Vercel / `.env.local` 设置 `ADMIN_REQUIRE_AUTH=true` 并配置 `ADMIN_SECRET`，然后 Redeploy。

1. **送货流程**：全类型共用，每行写一步
2. **送货类型**：类型名称、接货负责人、手机号
3. 下载固定二维码打印张贴

## 数据库

在 Supabase SQL Editor 执行：

```text
supabase/migrations/003_simplified.sql
```

（若从未建表，可先执行 `001_initial.sql`，但本版功能仅依赖 `003` 中的 `site_settings` 与 `delivery_types` 表。）

## 本地开发

```bash
cp .env.example .env.local
# 填入 Supabase 密钥与 ADMIN_SECRET

npm install
npm run dev
```

访问 http://localhost:3999

## 部署 Vercel

配置环境变量后 Redeploy。`NEXT_PUBLIC_APP_URL` 填生产域名（二维码链接用），例如 `https://ktlhweb.xyz`。

预生成二维码：`public/qr-ktlhweb.xyz.png`（与 `NEXT_PUBLIC_APP_URL` 一致时需重新生成）。

更换平面图：替换 `public/factory-map.png` 后重新部署。
