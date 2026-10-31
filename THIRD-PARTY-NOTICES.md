# 第三方归因与许可证（Third-Party Notices）

本文件汇总仓库中**随产品分发或包含第三方作品**的组件及其许可证。逐字许可证副本在 [`third-party/licenses/`](third-party/licenses/) 和各包目录；本文件不替代那些许可证文本。

本启动器是 Modrinth App 代码库的修改版本（GPL-3.0-only）。所有上游版权声明与归因保持原样；修改部分的版权与许可见对应包的 `COPYING.md`。

## 运行时分发组件

| 组件                                              | 许可证                                   | 位置 / 链接                                                                                                                                                                                                        |
| ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modrinth App（上游项目，Rinth, Inc. 及贡献者）    | GPL-3.0-only                             | <https://github.com/modrinth/code>；根 [LICENSE](LICENSE)、各包 `LICENSE`/`COPYING.md`                                                                                                                             |
| Modrinth 名称与商标                               | 商标，非开源许可                         | 商标归 Rinth, Inc.；仅用于说明 API 与文件格式兼容，参见 [COPYING.md](COPYING.md)                                                                                                                                   |
| Blockbench（皮肤编辑器独立构建）                  | GPL-3.0-or-later                         | <https://github.com/JannisX11/blockbench>；构建分支 <https://github.com/MCL-Launcher/blockbench-skin-standalone>；[LICENSE.MD](third-party/blockbench/LICENSE.MD)                                                  |
| xpple/cubiomes（种子地图引擎，Cubitect 派生）     | MIT                                      | <https://github.com/xpple/cubiomes>；`apps/app/vendor/cubiomes/LICENSE`、`apps/app/resources/seed-map/LICENSE.cubiomes.txt`                                                                                        |
| MC Content Localizer / MC 汉化工坊                | MIT                                      | <https://github.com/adssadax-1/mc-content-localizer>；[许可证](apps/app/resources/tools/mc-content-localizer/LICENSE-MC-Content-Localizer.txt)、[NOTICE](apps/app/resources/tools/mc-content-localizer/NOTICE.txt) |
| LogShare-Web-UI（日志查看器）                     | MIT（Copyright © 2024 LogShare.CN Team） | <https://github.com/NingZeStudio/LogShare-Web-UI>；[third-party/licenses/MIT.txt](third-party/licenses/MIT.txt)、[packages/ui/COPYING.md](packages/ui/COPYING.md)                                                  |
| LogShare LogAgent（授权改编）                     | 经授权改编                               | <https://github.com/anylyralabs/LogShare>；[apps/app-frontend/COPYING.md](apps/app-frontend/COPYING.md)                                                                                                            |
| Plain Craft Launcher `WikiEntries.txt` 快照       | PCL Limited Distribution License         | <https://github.com/Meloong-Git/PCL>（commit `fd7b722346523d9574678a8a4a02928d31cd1e0c`）；`packages/app-lib/src/api/content_search/WikiEntries.txt`；[COPYING.md](COPYING.md)                                     |
| LobeChat（AI 服务商信息架构与目录）               | LobeHub Community License                | <https://github.com/lobehub/lobe-chat>；[third-party/licenses/LobeHub-Community-License.txt](third-party/licenses/LobeHub-Community-License.txt)                                                                   |
| Read Frog（AI 翻译配置流程）                      | GPL-3.0                                  | <https://github.com/mengxi-ream/read-frog>；[third-party/licenses/Read-Frog-GPL-3.0.txt](third-party/licenses/Read-Frog-GPL-3.0.txt)                                                                               |
| Lobe Icons（服务商与模型图标）                    | MIT                                      | <https://github.com/lobehub/lobe-icons>；npm `@lobehub/icons-static-svg`                                                                                                                                           |
| Deep Agents JS / LangChain（本地 LogAgent）       | MIT                                      | <https://github.com/langchain-ai/deepagentsjs>；随 npm 依赖分发                                                                                                                                                    |
| GoogleTranslateIpCheck（Google 翻译直连 IP 列表） | MIT                                      | <https://github.com/Ponderfly/GoogleTranslateIpCheck>；[third-party/licenses/MIT.txt](third-party/licenses/MIT.txt)                                                                                                |

## 数据与素材

| 内容                                             | 许可证 / 权利状态                                            | 位置 / 链接                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Deepslate（原理图预览的方块模型生成）            | MIT                                                          | <https://github.com/misode/deepslate>；[apps/app-frontend/COPYING.md](apps/app-frontend/COPYING.md)                               |
| Misode mcmeta 数据集（方块状态、模型、贴图图集） | 由 Minecraft 客户端资源生成；Minecraft 内容版权归 Mojang     | <https://github.com/misode/mcmeta>；`apps/app-frontend/COPYING.md`                                                                |
| destruc7i0n/crafting（原版配方与物品标签）       | MIT                                                          | <https://github.com/destruc7i0n/crafting>（commit `e6c71dd`）；[third-party/licenses/MIT.txt](third-party/licenses/MIT.txt)       |
| destruc7i0n/minecraft-textures（物品名与贴图）   | GPL-3.0                                                      | <https://github.com/destruc7i0n/minecraft-textures>（npm `26.2.1`）；[apps/app-frontend/COPYING.md](apps/app-frontend/COPYING.md) |
| MinecraftSearch 结构与生物群系图标               | 版权归 MinecraftSearch 及素材作者，保留权利                  | <https://minecraftsearch.com>；`apps/app-frontend/public/seed-map-assets/`；[apps/app/COPYING.md](apps/app/COPYING.md)            |
| Minecraft 游戏资源与商标                         | 版权 / 商标归 Mojang Studios、Microsoft、Mojang Synergies AB | 仅在识别兼容游戏内容时使用；见 [README 免责声明](README.md#免责声明)                                                              |

## 源码包与工具链

| 组件                                               | 许可证                              | 位置                                                                                                                 |
| -------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/app`、`apps/app-frontend`                    | GPL-3.0-only                        | 各目录 `LICENSE`、`COPYING.md`                                                                                       |
| `packages/ui`、`packages/assets`、`packages/utils` | GPL-3.0-only                        | 各目录 `LICENSE`、`COPYING.md`                                                                                       |
| `packages/app-lib`                                 | GPL-3.0-only                        | [packages/app-lib/COPYING.md](packages/app-lib/COPYING.md)                                                           |
| `packages/api-client`                              | LGPL-3.0                            | `packages/api-client/LICENSE`                                                                                        |
| `packages/daedalus`                                | MIT                                 | `packages/daedalus/LICENSE`                                                                                          |
| `packages/async-minecraft-ping`                    | MIT / Apache-2.0 双许可             | `packages/async-minecraft-ping/LICENSE-*`                                                                            |
| Modrinth GitHub Actions 工作流文件（上游模板）     | MIT（Copyright © 2025 Rinth, Inc.） | [.github/workflows/LICENSE](.github/workflows/LICENSE)、[.github/workflows/COPYING.md](.github/workflows/COPYING.md) |

## 其他依赖

其余 npm 与 Cargo 依赖按各自许可证随依赖分发，完整清单和许可证文本可用包管理器生成，例如：

```powershell
pnpm licenses list
cargo license
```

如果你认为本文件遗漏了某个第三方组件，或希望更正许可证信息，请提交 Issue。
