# 遇见神鲸 · MeetWhale

遇见神鲸（MeetWhale）是一款开源的 Minecraft 桌面启动器：管理实例与整合包、浏览并安装社区内容、切换账号与皮肤、查看日志与诊断，并内置了一批本地运行的创作工具。

> 本项目是基于 GPL-3.0 开源项目 Modrinth App 代码库的分支；产品已更名并重构了界面与信息架构，上游版权与第三方归因保持原样。详见[许可证与来源](#许可证与来源)。

## 亮点

- **全窗口玻璃背景**：自定义背景图可铺满整个窗口，标题栏、侧栏与卡片按面板透明度呈现毛玻璃质感，并可分别调节背景模糊与面板浓度。
- **PCL 式下载流程**：先选 Minecraft 版本，再选加载器（Fabric / Forge / NeoForge / Quilt / OptiFine），最后选具体加载器构建，与原版直装并列。
- **内置 Blockbench 皮肤编辑器**：基于 Blockbench 的独立皮肤编辑版本随启动器分发，打开即用，不需要再装一套建模工具。
- **内置 MC 汉化工坊**：以独立进程方式调用 [MC Content Localizer](https://github.com/adssadax-1/mc-content-localizer)（MIT），把 Mod 语言文件翻译成中文，不修改工具本体。
- **便携分发**：主程序为单个可执行文件，另提供解压即用的 portable 包；设置、实例与缓存都集中在可重定向的数据目录中。

## 功能

### 启动与实例

- Microsoft、第三方认证与离线账号；账号切换与皮肤管理。
- 实例库、实例搜索与分组、复制与删除、实例设置（Java、内存、加载器、启动参数）。
- 一键启动、运行中实例的日志查看、崩溃分析与日志导出。
- 整合包导入与实例迁移；启动器数据目录迁移与实例同步。

### 下载与资源

- 原版游戏安装：正式版、快照、远古版本与愚人节版本。
- 加载器安装：Fabric、Forge、NeoForge、Quilt、OptiFine，按 Minecraft 版本拉取加载器元数据。
- 社区资源：Mod、整合包、数据包、资源包、光影包、地图与服务端的搜索、筛选、排序、分页、详情与安装。
- 下载中心：任务进度、速度与失败重试、依赖解析、文件缺失修复、下载历史。
- 内容更新：实例内容检查更新、依赖冲突提示与一键更新。

### 个性化

- 主题：浅色、深色、OLED、跟随系统。
- 强调色与界面缩放；PCL2 风格标题栏、侧栏与状态栏皮肤。
- 自定义背景：窗口背景图、全窗口玻璃模式、面板透明度与背景模糊；自动取色。
- 启动页与侧栏入口可配置；内置多语言界面与翻译工作流。

### 实验室（7 个工具）

- **皮肤编辑器**：基于 Blockbench 的本地皮肤编辑与 3D 预览。
- **渐变文字生成器**：生成可复制的渐变文字与颜色代码。
- **配方生成器**：可视化编辑合成配方并导出数据包。
- **种子地图**：基于 xpple/cubiomes 在本地计算生物群系、结构与出生点，不依赖外部地图服务。
- **原理图工坊**：本地预览 `.litematic`、`.schematic` 等结构文件。
- **Mod 汉化**：调用内置的 MC 汉化工坊（MC Content Localizer）批量翻译 Mod 语言文件。
- **命令生成器**：图形化拼装 Minecraft 命令并复制。

### 设置与维护

- 界面外观、Java 与内存、实例同步、内容与下载、网络、数据与隐私、更新与诊断等分组设置。
- 更新通道（正式版 / Beta）、自动更新、更新公告与更新日志。
- 日志与诊断信息导出；崩溃报告提交前可预览并移除敏感内容。
- 数据库迁移与回退工具（仅维护者与开发者使用，详见 [CONTRIBUTING.md](CONTRIBUTING.md)）。

## 截图

截图尚未随仓库发布。计划中的图片放在 [`docs/screenshots/`](docs/screenshots/README.md)，文件名与内容见该目录的说明；维护者补充 `*.png` 后再在本文档中引用，避免出现失效图片。

## 目录结构

- `apps/app-frontend`：桌面端 Vue 3 前端
- `apps/app`：Tauri 2 外壳（窗口、托盘、打包、IPC）
- `packages/app-lib`：桌面运行时（实例、安装、数据库等）
- `packages/ui`、`packages/assets`、`packages/utils`：共享组件、主题与工具
- `packages/api-client`：内容服务 API 客户端
- `packages/daedalus`、`packages/ariadne`、`packages/async-minecraft-ping`：Minecraft 元数据、社交/隧道协议、服务器 ping
- `third-party/blockbench`：Blockbench 皮肤编辑器的独立构建版本（Git 子模块）
- `apps/app/resources/tools/mc-content-localizer`：内置 MC 汉化工坊的许可证、说明与版本记录（主程序不入 git，由脚本下载）

## 构建

### 环境要求

| 依赖      | 说明                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| Node.js   | 以 [`.nvmrc`](.nvmrc) 为准（当前 `24.15.0`）                                              |
| pnpm      | 以根目录 [`package.json`](package.json) 的 `packageManager` 为准，推荐 `corepack enable`  |
| Rust      | 以 [`rust-toolchain.toml`](rust-toolchain.toml) 为准（当前 `1.95.0`）                     |
| MSVC      | Visual Studio Build Tools，勾选「使用 C++ 的桌面开发」与 Windows SDK                      |
| WebView2  | Windows 10/11 通常已内置；旧系统需安装 Evergreen Runtime                                  |
| JDK 17    | 构建 Java 资源（`theseus.jar`、`authlib-injector.jar`）需要                               |
| MinGW GCC | 编译种子地图原生库；通过 `MCL_CUBIOMES_CC` 指定 `gcc.exe` 的绝对路径                      |
| 7-Zip     | `scripts/fetch-tools.mjs` 解包内置工具时需要；也可用脚本的 `--seven-zip` 参数指定路径     |
| Git       | 构建脚本依赖 `git diff` / `git ls-tree` 与子模块，**请使用 `git clone` 而不是源码压缩包** |

### 构建步骤（Windows）

```powershell
# 1. 子模块与依赖
git submodule update --init --recursive
corepack enable
pnpm install --frozen-lockfile

# 2. 下载内置工具（MC 汉化工坊主程序，约 18 MB，不入 git）
node scripts/fetch-tools.mjs

# 3. 准备跨平台构建资源（Java 资源、Blockbench 皮肤编辑器、贡献者名单）
node scripts/mcl/prepare-build-resources.mjs

# 4. 编译桌面端（release）
node scripts/mcl/build-desktop.mjs --profile release

# 5. 生成 Windows 安装包与便携包
node scripts/mcl/package-windows.mjs --profile release --output target/release-assets/upload
```

产物位于 `target/release-assets/upload/`：`遇见神鲸_<version>_x64_modern-setup.exe`、`遇见神鲸_<version>_x64_nsis-setup.exe` 与 `遇见神鲸_<version>_x64_portable.zip`。签名与更新清单由发布工作流生成；本地构建未签名，可正常安装，但会触发 SmartScreen 提示。

开发模式：

```powershell
pnpm app:dev
# 建议隔离开发数据目录，避免改动已安装版本使用的数据库
$env:THESEUS_CONFIG_DIR = "$PWD\.dev-data"
```

只构建桌面端而不打安装包时，也可以用根目录的 `pnpm app:build`（直接调用 `tauri build`，不会自动准备构建资源）。

### Windows 路径与 `CARGO_TARGET_DIR`

Rust / Tauri / NSIS 在 Windows 上对路径很敏感：

- 仓库路径包含中文、空格或过长（例如 `D:\浏览器下载\Axolotl-1.10.2`）时，`cargo`、`tauri` 或 NSIS 打包可能因为路径长度或非 ASCII 字符失败。
- 首选把仓库放在短 ASCII 路径下（例如 `C:\mcl`）再构建。
- 无法移动仓库时，可在构建前把 Cargo 目标目录指向短路径：`$env:CARGO_TARGET_DIR = "C:\mcl-target"`。**注意**：`scripts/mcl/build-desktop.mjs` 与 `package-windows.mjs` 默认在仓库内的 `target\` 下查找产物；设置外部目录后需要自行调整路径，或用目录联接（`mklink /J target C:\mcl-target`）把两者对齐，否则脚本会报找不到 `遇见神鲸.exe`。
- 切换目标目录会触发一次全量重编译，并且不要与另一份正在进行的 Cargo 构建并行运行。

### 其他平台

`scripts/mcl/build-desktop.mjs --profile release --target <target-triple>` 支持 macOS 与 Linux；macOS 需要两个架构分别编译后合成 universal 包，Linux 需要 WebKitGTK 与系统依赖。CI 的构建矩阵可参考 [`.github/workflows/mcl-release.yml`](.github/workflows/mcl-release.yml)。

## 数据目录与隐私

应用数据（设置、数据库、日志、实例列表）存放在系统应用数据目录下的 `dev.mcl.launcher` 文件夹，Windows 为 `%APPDATA%\dev.mcl.launcher`。设置 `THESEUS_CONFIG_DIR` 可把整个数据目录重定向到任意位置，便携模式即使用该变量。

本分支默认不向任何外部服务器上报遥测：遥测端点留空，网络上报循环不会启动，相关代码结构与开关保留。在线更新端点未配置时，检查更新会直接返回「没有更新」。AI 集成默认关闭，需要用户自行配置服务商与 API Key。

## 许可证与来源

- **本项目是 Modrinth App 代码库的修改版本（fork）**。上游由 Rinth, Inc. 及其贡献者开发，采用 GNU General Public License v3.0 许可。产品已更名，界面与信息架构已重构，修改说明见各包目录下的 `COPYING.md`。
- 桌面端源码许可是 **GPL-3.0-only**；完整许可证文本见根目录 [LICENSE](LICENSE)，以及 `apps/app/LICENSE`、`apps/app-frontend/LICENSE`、`packages/*/LICENSE`。
- 第三方组件、数据与素材的许可与来源汇总在 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)；逐字许可证副本在 [`third-party/licenses/`](third-party/licenses/)，Blockbench 的许可证在 [`third-party/blockbench/LICENSE.MD`](third-party/blockbench/LICENSE.MD)。
- **内置 MC 汉化工坊（MC Content Localizer）** 采用 MIT 许可证，版本与哈希记录在 `apps/app/resources/tools/mc-content-localizer/` 的 [`NOTICE.txt`](apps/app/resources/tools/mc-content-localizer/NOTICE.txt)、[`LICENSE-MC-Content-Localizer.txt`](apps/app/resources/tools/mc-content-localizer/LICENSE-MC-Content-Localizer.txt) 与 [`VERSION.txt`](apps/app/resources/tools/mc-content-localizer/VERSION.txt)。该工具以独立进程运行，启动器不修改其代码。
- 中文内容搜索包含 Plain Craft Launcher 的 `WikiEntries.txt` 快照，其归属与许可说明见 [COPYING.md](COPYING.md)。
- Modrinth 名称与商标归 Rinth, Inc. 所有；本项目仅用其描述 API 兼容性，未获得 Rinth, Inc. 的认可或背书。

## 免责声明

- 本项目是独立、非官方的第三方客户端，与 Mojang Studios、Microsoft 无关联，也未获得其认可；Minecraft 是 Mojang Synergies AB 的商标。
- 与 Plain Craft Launcher（PCL）无关联，也未获得其认可；仅在中文内容搜索中使用其公开的 `WikiEntries.txt` 快照。
- 与 Modrinth、Rinth, Inc. 无关联，也未获得其认可。
- 内置的 AI / LogAgent 集成默认关闭，需要用户自行配置第三方服务商与 API Key；本项目与 DeepSeek 及其他 AI 服务商无关联，也未获得其认可，相关使用受各自服务条款约束。
- 本项目分发的 Windows 安装包没有代码签名证书。首次运行时 Windows SmartScreen 会提示「Windows 已保护你的电脑」，可核对发布页提供的 SHA-256 后选择「更多信息 → 仍要运行」。请只从官方发布页下载。

## 参与贡献

- 提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
- 安全问题请按 [SECURITY.md](SECURITY.md) 的私密渠道报告，不要公开贴 PoC 或漏洞细节。
- 更新记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## MeetWhale (English)

MeetWhale is an open-source Minecraft desktop launcher built with Vue 3 and Tauri 2. It manages instances and modpacks, installs community content, supports Microsoft/third-party/offline accounts, and ships local creative tools: a Blockbench skin editor, a seed map, a schematic previewer, a recipe/command generator, a gradient text generator, and a bundled Mod localization tool (MC Content Localizer, MIT).

Highlights: a full-window glass background, a PCL-style "game version → loader → loader build" install flow, and a portable distribution with a redirectable data directory.

Build requirements: Node.js (see `.nvmrc`), pnpm, Rust (see `rust-toolchain.toml`) with MSVC, JDK 17, MinGW GCC for the seed-map library, and 7-Zip. Clone with submodules, run `pnpm install --frozen-lockfile`, then `node scripts/fetch-tools.mjs` before `node scripts/mcl/prepare-build-resources.mjs` and `node scripts/mcl/build-desktop.mjs --profile release`. On Windows, avoid non-ASCII or long repository paths, or point `CARGO_TARGET_DIR` at a short ASCII path (see the Chinese section above for the caveat about `target/`-relative packaging scripts).

License: GPL-3.0-only. This project is a modified fork of Modrinth App (Copyright Rinth, Inc. and contributors); see [LICENSE](LICENSE), [COPYING.md](COPYING.md), and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Not affiliated with or endorsed by Mojang, Microsoft, Rinth, PCL, or DeepSeek.
