# KTLH 送货引导系统

面向外部送货司机的扫码引导：**厂区固定一个二维码**，微信扫一扫进入选货页，司机**选择本次货物**后查看对应的流程、联系人（一键拨号）及场内 2D/3D 路线。

## 功能

| 角色 | 能力 |
|------|------|
| **调度/内勤** | 管理后台维护「货物条目」及各自流程、联系人、路线；下载**固定二维码**打印张贴 |
| **司机** | 微信扫固定码 → `/s` 选货 → 查看该货物的流程、打电话、按节点路线前进 |

## 技术栈

- **前端/后端**：Next.js 15（App Router）
- **数据库**：Supabase（PostgreSQL + RLS 公开读）
- **3D 路线**：Three.js + React Three Fiber（可选）

## 快速开始

### 1. Supabase

1. 新建 [Supabase](https://supabase.com) 项目  
2. 在 **SQL Editor** 依次执行 `supabase/migrations/001_initial.sql` 与 `002_picker_fields.sql`（若已执行过 001，只跑 002 即可）  
3. 在 **Settings → API** 复制 URL、anon key、service_role key  

### 2. 环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 与 ADMIN_SECRET
```

### 3. 安装与运行

```bash
npm install
npm run dev
```

- 首页：http://localhost:3999  
- 管理后台：http://localhost:3999/admin（使用 `ADMIN_SECRET` 登录）  
- 司机选货：http://localhost:3999/s（与固定二维码相同）  

### 4. 部署

推荐 [Vercel](https://vercel.com)：

1. 导入仓库，配置与 `.env.example` 相同的环境变量  
2. `NEXT_PUBLIC_APP_URL` 设为生产域名（二维码才会指向正确地址）  

## 使用建议

1. 在管理后台 **下载固定二维码**，贴在厂区门口（只需贴一次）  
2. **新建货物条目** → 填写选货显示名、流程、联系人 → 可选配置场内路线  
3. 司机扫码 → 选择对应货物 → 查看指引  
4. 送完后 **标记已完成**，该货物从选货列表消失  

### 路线坐标怎么填？

在纸上画出厂区平面轮廓，按像素或米标出关键点位置，填入后台 **X/Y**。点「自动连线」按顺序连接。司机端 **平面图** 为 2D 逐步引导，**3D** 为立体预览（可拖动旋转）。

后续可扩展：上传真实平面图底图、接入高德/腾讯地图室外导航、Supabase Auth 多用户管理。

## 目录结构

```
src/app/s            # 司机选货页（固定二维码入口）
src/app/s/[id]       # 某货物的指引详情
src/app/d/[code]     # 旧链接兼容，重定向到 /s/[id]
src/app/admin/       # 管理后台
src/app/api/         # 管理 API、二维码生成
supabase/migrations/ # 数据库脚本
```
