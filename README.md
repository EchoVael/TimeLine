# TimeMagic

TimeMagic 是一款以本地存储为主的个人规划应用，通过时间线、日历、项目分组和 Markdown 笔记管理长期目标。

目前支持以下工作流程：

- 将重要截止日期设为时间线上的里程碑。
- 按项目组织里程碑。
- 归档和恢复项目，保留项目数据。
- 在月历中查看里程碑。
- 撰写每日 Markdown 笔记，并将当天关联到一个或多个项目。
- 展开笔记编辑器，在纯编辑、实时分栏预览和纯预览之间切换。
- 选中时间线上的里程碑后切换到日历，直接打开该里程碑所在的月份。

## 界面布局

TimeMagic 的主界面分为三个区域：

- **项目栏**：查看活跃和已归档的项目分组，切换可见性，编辑项目信息。
- **时间线 / 日历**：切换主视图，用于安排里程碑和按月回顾。
- **详情栏**：查看或编辑选中的项目、里程碑或每日笔记。

时间线采用紧凑布局：里程碑按日期纵向排列，显示简短日期、项目标签和状态，仅在跨年处显示年份分隔标记。

日历使用六周网格展示月份，支持直接选择年份和月份，显示里程碑摘要、项目颜色标记和每日笔记标记，也可以快速为某一天添加里程碑。

### 时间线

![TimeMagic 时间线视图](imgs/timeline-desktop.png)

### 日历与每日笔记

![TimeMagic 日历与每日笔记详情](imgs/daily-details-desktop.png)

## 技术栈

- 单仓多包管理：`pnpm` workspaces
- 前端：React、Vite、TanStack Query、Testing Library
- 服务端：Fastify、Drizzle ORM、better-sqlite3
- 前后端共享的数据契约：TypeScript + Zod
- 端到端测试：Playwright

## 仓库结构

```text
apps/
  server/       Fastify API、SQLite 持久化和文档存储
  web/          React 前端应用
packages/
  shared/       共享数据结构、日期和日历工具
tests/
  e2e/          Playwright 端到端测试
docs/
  design/       API 和领域设计说明
  superpowers/  功能规格和实施计划
data/           本地开发数据库和 Markdown 文档
```

## 本地开发

以下命令均在仓库根目录执行。项目使用 pnpm 11.1.2，工作区通过 pnpm 固定使用 Node.js 24.20.0。首次安装时，pnpm 会将该运行时下载到自己的存储目录，并用它执行项目脚本。此过程不会替换 Homebrew 或系统安装的 Node，也不会修改 shell 的 `PATH`。

安装依赖：

```bash
pnpm install
```

首次运行端到端测试前，安装 Playwright 浏览器：

```bash
pnpm exec playwright install
```

启动前，检查项目运行时和 SQLite 原生扩展：

```bash
pnpm exec node -v
pnpm check:native
```

预期 Node 版本为 `v24.20.0`。运行 `pnpm dev` 前会自动执行原生扩展检查；如果主动升级运行时导致 Node ABI 变化，请使用 `pnpm rebuild better-sqlite3` 重新构建扩展。

启动应用：

```bash
pnpm dev
```

默认开发命令会启动：

- API 服务：`http://127.0.0.1:4317`
- Web 应用：`http://localhost:4318`

在浏览器中打开：

```text
http://localhost:4318/#token=timemagic-dev
```

启动令牌用于保护本地 API 路由。开发环境下，`pnpm dev` 会设置：

```bash
TIMEMAGIC_STARTUP_TOKEN=timemagic-dev
TIMEMAGIC_DATA_ROOT=../../data
```

如果需要分别启动，在两个终端中从仓库根目录执行：

```bash
# 终端一：启动 API，使用当前仓库的数据目录
TIMEMAGIC_STARTUP_TOKEN=timemagic-dev \
TIMEMAGIC_DATA_ROOT="$PWD/data" \
pnpm --filter @timemagic/server dev

# 终端二：启动前端
pnpm --filter @timemagic/web dev
```

这两个环境变量由服务端读取。前端开发服务器默认将 API 请求转发到本机的 API 端口。如果更换启动令牌，请在浏览器地址的 `#token=` 后填入相同的值。

## 数据存储

本地数据默认保存在 `data/` 下，服务端启动时会自动创建数据库和表结构，无须手动运行迁移命令：

- SQLite 数据库 `data/app.db`：保存应用记录、项目分组、里程碑和文档元数据。
- Markdown 文档：保存每日笔记和里程碑相关文档。

Markdown 正文独立保存在文件中，清空数据库不会自动删除这些文件。未保存的每日笔记草稿还可能保存在浏览器本地存储中。

每日笔记按日期组织，路径格式如下：

```text
data/docs/daily/YYYY/MM/YYYY-MM-DD.md
```

**在 git worktree 中运行时，请留意数据目录。** 直接执行 `pnpm dev` 可能会使用该 worktree 自己的 `data/`。如果要使用原工作区的数据，请通过绝对路径指定数据根目录。将下面的示例路径替换为实际路径，并直接启动两个服务；`pnpm dev` 会使用脚本内预设的数据目录：

```bash
TIMEMAGIC_STARTUP_TOKEN=timemagic-dev \
TIMEMAGIC_DATA_ROOT="/absolute/path/to/TimeMagic/data" \
pnpm exec concurrently -k -n server,web \
  "pnpm --filter @timemagic/server dev" \
  "pnpm --filter @timemagic/web dev"
```

## 常用命令

```bash
pnpm build          # 构建共享包、服务端和前端
pnpm check:native   # 检查 SQLite 原生扩展
pnpm typecheck      # 检查全部工作区的 TypeScript 类型
pnpm test           # 运行共享包、服务端和前端测试
pnpm test:e2e       # 运行桌面和移动布局的浏览器测试
```

`pnpm build` 只构建产物，不启动应用；本地使用 `pnpm dev`。

**运行端到端测试前，请停止正在运行的开发服务。** 测试会自行启动服务端和前端，需要占用 4317、4318 端口，且不会复用已有服务。测试数据位于 `test-results/e2e-data/`，每次运行前会清空该测试目录。

按模块或测试文件运行：

```bash
pnpm --filter @timemagic/web test
pnpm --filter @timemagic/server test
pnpm --filter @timemagic/web exec vitest run src/app/App.test.tsx
```