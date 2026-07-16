# Reflect Open CHS — 二开分支与版本规则

本仓库是 [team-reflect/reflect-open](https://github.com/team-reflect/reflect-open)
的中文 / 二开 fork（`reflect-open-chs`）。上游的分支模型与 release-please
流水线尽量原样保留；本文件只约定 **fork 侧** 的分流、版本后缀与远程边界。

上游官方流程见：

- [AGENTS.md](../AGENTS.md) — 日常开发与分支角色
- [docs/macos-distribution.md](macos-distribution.md) — Release PR / promote / tag

**第一次搭 CHS 基线？** 直接看 [§11 首次启动清单](#11-首次从上游建立-master-并打出第一版-vxyz-chs)。

---

## 1. 目标与原则

| 原则 | 含义 |
| --- | --- |
| **对齐上游形状** | 保留 `next`（开发/beta）与 `master`（稳定）双通道，不发明第三套长期主分支 |
| **分流清晰** | 纯多语言 / 本地化走 `master`；二开新功能走 `next` |
| **可追溯** | CHS 发布 tag 能一眼看出对应的上游基线 |
| **默认不向上游推送** | 没有明确要求时，**绝不**向上游 remote 推送分支、tag 或 PR |
| **小步可回滚** | 本地化与功能改动分轨合入，避免「一次 PR 又改 i18n 又加功能」 |
| **翻译不可被合并冲掉** | 同步上游、`master`↔`next`、rebase/cherry-pick 时，**已有译文与 i18n 接线不得被无审覆盖**（见 §6.4） |

---

## 2. 远程与推送边界（硬规则）

建议 remote 命名（首次克隆后执行一次）：

```bash
# origin  = 本 fork（可 push）
# upstream = 官方上游（只读，默认禁止 push）

git remote rename origin origin  # 若已是 fork 则跳过
git remote add upstream git@github.com:team-reflect/reflect-open.git
# 或 HTTPS: https://github.com/team-reflect/reflect-open.git
```

| Remote | 用途 | 默认权限 |
| --- | --- | --- |
| `origin` | `deluxebear/reflect-open-chs`（或本 fork） | **允许** push / tag / Release |
| `upstream` | `team-reflect/reflect-open` | **禁止** push；只 `fetch` / `pull` |

### 禁止事项

- 未获维护者**明确书面/对话授权**时，不得：
  - `git push upstream …`
  - 向 `team-reflect/reflect-open` 开 PR（除非任务就是贡献上游）
  - 把带 `-chs` 的 tag 或 CHS 专用提交推到上游
- 同步上游只用 **拉取 + 本 fork 内合并**，不反向推送。

### 允许事项

- 日常开发：`git push origin <branch>`
- 本 fork 的 GitHub Releases / tag（含 `-chs`）
- 在明确要求时，单独开「上游贡献」任务：从干净分支 cherry-pick 可上游化的改动，再对 `upstream` 开 PR

---

## 3. 分支角色（在 fork 内）

与上游一致，**只有两条长期分支**：

| 分支 | 角色 | 合入什么 |
| --- | --- | --- |
| **`next`** | 默认开发支、beta 通道 | 二开**新功能**、跟随上游 `next` 的同步、功能相关 fix |
| **`master`** | 稳定发布支 | 已验证的稳定内容；**纯多语言 / 本地化**；从 `next` promote 上来的稳定功能；上游 stable 同步 |

短期分支命名建议：

| 类型 | 命名示例 | 目标 base |
| --- | --- | --- |
| 纯 i18n / 文案 / 语言包 | `chs/i18n-<topic>` | **`master`** |
| 二开功能 | `chs/feat-<topic>` | **`next`** |
| 功能 bugfix（未进 master） | `chs/fix-<topic>` | **`next`** |
| 稳定热修（已发布 master 上的问题） | `chs/hotfix-<topic>` | **`master`** |
| 同步上游 | `chs/sync-upstream-master` / `chs/sync-upstream-next` | 对应支 |

PR 标题仍用 Conventional Commits（与上游 CI 一致），例如：

- `feat(i18n): add Simplified Chinese UI strings`
- `feat: …`（二开功能，合入 `next`）
- `fix: …`
- `chore: sync upstream master to v0.6.0`

---

## 4. 工作分流：什么改在哪条支

### 4.1 纯多语言 / 本地化（CHS 基线）→ **`master`**

**适用范围（必须同时满足）：**

- 只改语言资源、翻译、locale 配置、与展示文案直接相关的最小接线
- **不**改变产品行为、数据结构、同步协议、AI 策略、索引 schema
- **不**引入新的用户可见功能（「能选中文」本身算本地化，不算二开功能）

**流程：**

1. 以 **本 fork `master` 最新稳定点** 为基线（通常已对齐某上游 stable，或含此前 CHS 本地化提交）。
2. 需要时先同步上游 stable（见 §6），再从 `master` 拉 `chs/i18n-…`。
3. 开发 → 自测（桌面关键路径 + 语言切换 + 无回归）→ PR **合入 `master`**（squash 即可，与上游 feature PR 习惯一致）。
4. 验证通过后打 **CHS 稳定 tag**（见 §5.1），**仅 push 到 `origin`**。
5. 可选但推荐：用 merge commit 或定期 PR，把 `master` 上的 i18n 合回 `next`，避免功能支长期缺译。

### 4.2 二开新功能 → **`next`**

**适用范围：**

- 新能力、行为变更、与上游并行演进的功能修复
- 任何可能进入「产品 changelog」的改动

**流程（对齐上游）：**

1. 从本 fork 的 `next` 拉 `chs/feat-…`。
2. PR 合入 `next`（conventional title）。
3. 需要对外试时：走本 fork 的 **beta Release PR**（`chore(next): release …`），发布 beta；tag 规则见 §5.2。
4. 稳定后：走 **promote → `master`**（与上游相同：promotion 用 **merge commit**，勿 squash）。
5. stable 发布后：合并 **post-stable back-merge**（`chore: merge master back into next`），同样用 **merge commit**。

官方细节仍以 [macos-distribution.md → Cutting a release](macos-distribution.md#cutting-a-release-release-prs) 为准。

### 4.3 禁止的混用

| 错误做法 | 原因 |
| --- | --- |
| 在 `next` 上只做纯翻译却当稳定版发给用户 | 稳定用户应对齐 `master` / `-chs` tag |
| 在 `master` 上直接堆二开大功能 | 破坏「master = 可发布稳定」与上游 promote 模型 |
| 同一 PR 既加功能又改全量翻译 | 难审、难同步上游、难按 `-chs` 归因 |
| 用 squash 合并 promotion / back-merge | 会拆散 `next`/`master` 历史，搞坏 release-please |

---

## 5. 版本与 Tag 规则

上游版本仍由 release-please 维护（`apps/desktop/package.json` 为唯一版本源）。  
**CHS 对外标识**用 tag 后缀表达「基于哪一版上游/本 fork 基线 + 中文/二开发行」。

### 5.1 纯多语言稳定版（你描述的主路径）

在 **`master` 验证通过** 后打 tag：

```text
v{上游或本 fork 对齐的稳定版本}-chs
```

| 示例 | 含义 |
| --- | --- |
| `v0.6.0-chs` | 基于稳定基线 `0.6.0` 的 CHS 本地化发行 |
| `v0.6.0-chs.1` | 同一基线上的第 2 次纯本地化修订（文案修复等） |

约定：

1. **数字部分**尽量等于当前对齐的上游（或本 fork 已 promote 的）**稳定版** `X.Y.Z`，不要把 beta 数字写进「稳定 CHS」tag。
2. 后缀固定为 **`-chs`**；同基线多次只修翻译时用 **`-chs.N`**（`N` 从 1 起）。
3. Tag 打在 **本 fork `master` 上对应 commit**，只推 `origin`：
   ```bash
   git checkout master
   git pull origin master
   git tag -a "v0.6.0-chs" -m "CHS localization on 0.6.0"
   git push origin "v0.6.0-chs"
   ```
4. 若仍启用本 fork 的 release-please：  
   - **不要**把 `-chs` 写进会污染上游对齐的长期 `package.json` 策略而不自知；  
   - 推荐：`package.json` 继续跟通道版本（`0.6.0` / `0.6.1-beta.N`），**对外发行身份以 Git tag `*-chs` 为准**；  
   - 若构建产物文件名必须带 CHS，在 fork 的 publish 脚本里读 tag，而不是手改 release-please manifest 成上游无法理解的版本。

### 5.2 二开功能 / beta（`next`）

遵循上游形态，必要时加 CHS 标记：

| 场景 | Tag / 版本形态 |
| --- | --- |
| 本 fork 内部 beta | 与上游相同：`vX.Y.Z-beta` / `vX.Y.Z-beta.N`（release-please） |
| 需要标明「CHS 试制」时 | `vX.Y.Z-beta.N-chs` 或 Release 标题注明 CHS（二选一，全仓库统一一种） |
| 功能 promote 到 master 后的稳定 CHS | `vX.Y.Z-chs`（与 §5.1 同一规则） |

推荐默认：**release-please 生成的 tag 保持上游算法不变**；仅在「要交付给 CHS 用户的构建」上再打或再标 `*-chs`。若自动化暂未改好，允许在稳定 commit 上**手工附加** `vX.Y.Z-chs`（仍只推 `origin`）。

### 5.3 与上游 tag 的关系

```text
upstream:  v0.6.0              （官方稳定）
fork:      v0.6.0-chs          （同基线 + 本地化/CHS 提交）
fork:      v0.6.0-chs.1        （同基线本地化修订）

upstream:  v0.6.1-beta.2
fork next: v0.6.1-beta.2       （跟通道）
           或 v0.6.1-beta.2-chs （显式 CHS beta，可选）
```

**不要**覆盖或重写上游已存在的 tag 名（如不要在 fork 里对同一 SHA 以外的内容重打 `v0.6.0` 并假装是上游）。

---

## 6. 同步上游

### 6.1 同步 `master`（稳定基线 + 本地化）

```bash
git fetch upstream
git checkout master
git merge upstream/master   # 优先 merge commit，保留历史；冲突时小心 i18n 文件
# 解决冲突 → 测试 → push origin master
# 若本轮有可交付的纯本地化增量，再打 vX.Y.Z-chs[.N]
```

### 6.2 同步 `next`（功能开发基线）

```bash
git fetch upstream
git checkout next
git merge upstream/next     # 同样优先 merge commit
# 冲突 → 测试 → push origin next
```

### 6.3 同步后注意

- 上游 release-please 状态文件（`.github/release-please/*`、changelog）冲突时：  
  **以「本通道官方意图 + 本 fork 已发布版本」为准**，必要时对照上游文档手动对齐 manifest，**禁止**用 `Release-As:` footer 糊弄（上游明确禁止，会泄漏进 promote）。
- 同步后若 `package.json` version 回退/跳跃，先搞清楚是通道正常状态再发版。
- 上游新 stable 进 `master` 后，再变基/重放未发布的 `chs/i18n-*`，然后出新的 `v{新版本}-chs`。
- **凡涉及 UI 或 `**/i18n/**` / `**/locales/**` 的合并，必须遵守 §6.4（翻译保护）。**

### 6.4 翻译保护（合并硬规则）

**目标：** 后续无论从上游同步、把 `master` 合进 `next`、把功能支合进 `master`，还是 rebase/cherry-pick，**不得把已经翻译好的内容无审覆盖成英文或删掉。**

#### 受保护资产（默认「本 fork 已有译文优先」）

| 路径 / 形态 | 合并冲突时默认取舍 |
| --- | --- |
| `apps/desktop/src/i18n/locales/zh-CN/**`（及今后其它目标语言目录） | **保留本 fork 已有条目**；只**追加**上游/对方引入的新 key |
| `apps/desktop/src/i18n/locales/en/**` | 可跟上游英文源文更新，但**不得**为「对齐上游」而清空或回退 zh-CN |
| `apps/desktop/src/i18n/**` 框架与 Provider | 功能以能编译为准；冲突时合并双方意图，**禁止**删掉 i18n 接线只为减少 diff |
| 组件里已改为 `t('…')` 的调用 | **禁止**在合并时改回硬编码英文字符串 |
| 欢迎笔记等 locale 模板（若已有 zh 模板） | 保留 zh 模板；上游英文模板变更则同步英文侧，再决定是否改写中文模板 |

用户笔记、graph 内 Markdown **不是**翻译资产；本条只管 **产品 UI 文案与 locale 文件**。

#### 明确禁止

1. **禁止**对 locale 目录使用「整文件接受上游 / ours/theirs 一刀切」而不逐 key 审：  
   - `git checkout --theirs apps/desktop/src/i18n/locales/zh-CN/...`（同步上游时）  
   - `git checkout --ours` 若会丢掉对方**新增**的 key 且事后不补译  
2. **禁止** merge/rebase 后把已 `t(key)` 的 JSX/TS **还原成** `"Settings"` 这类字面量「为了解决冲突更快」。  
3. **禁止**删除 `zh-CN` 里仍被代码引用的 key，或把 value 改回与 en 相同却未标记「有意未译」。  
4. **禁止**在同步 PR 里顺手「重翻/机翻覆盖」已人工润色的句子，除非 PR 说明是**有意文案修订**。  
5. **禁止** force-push 重写已发布 `*-chs` tag 所指向的历史来「去掉翻译」。

#### 正确做法（上游或邻支改了英文 UI）

```text
1. 接受上游的组件结构 / 逻辑 / 新 en 文案 key
2. 若组件从硬编码改为新字符串：
     - 保留或补上 t('namespace.key')
     - 在 en/*.json 写入英文
     - 在 zh-CN/*.json：已有 key → 保留原中文；新 key → 追加中文（可先暂译或标记 TODO）
3. 若上游只改了英文用词、key 未变：
     - 更新 en 源文
     - zh-CN 默认不动（除非英文语义变了，才改中文）
4. 合并后自检（§6.4 验收）再 push
```

冲突标记示例（locale JSON）：

```json
// 错误：直接选 upstream 整段，丢掉已有「设置」
"settings.title": "Settings"

// 正确：保留已有译文
"settings.title": "设置"

// 正确：上游新 key，在本 fork 追加
"settings.newFeature.label": "新功能"   // 或先 "TODO: new feature"
```

组件冲突示例：

```tsx
// 上游
<button>Save</button>

// 本 fork
<button>{t('common.save')}</button>

// 合并结果必须保留 t()，禁止变回 Save 字面量
<button>{t('common.save')}</button>
```

#### `master` ↔ `next` 双向合并时

| 方向 | 翻译相关规则 |
| --- | --- |
| `master` → `next`（i18n / stable 回灌） | **以 master 的 zh-CN 与已接线 UI 为准**合入 next；next 仅多出来的功能字符串在 next 侧补 key，**不得**用 next 旧英文覆盖 master 已译条目 |
| `next` → `master`（promote / 功能稳定） | 接受 next 的新功能与新 en key；**master 上已有 zh-CN 条目全部保留**；仅为新 key 补译后再打 `*-chs` |
| 两边同 key 中文不同 | **不自动选一边**：人工看语义；默认保留更润色/已发布 CHS 用过的版本，并在 PR 说明 |

#### 合并后验收（翻译保护，必做）

同步或 merge PR 在宣称完成前：

```bash
# 1) locale 目录不应无冲突残留
rg -n '^(<<<<<<<|=======|>>>>>>>)' apps/desktop/src/i18n || true

# 2) 不应出现「为解决冲突而大面积删掉 zh-CN」——与 merge 前 diff 对比
git diff --stat <merge-base>..HEAD -- 'apps/desktop/src/i18n/locales/zh-CN'

# 3) 关键路径手测：设置语言为 zh-CN，壳层/设置不应大块变回英文
```

检查清单：

- [ ] `zh-CN/**` 无误用 upstream 整文件覆盖  
- [ ] 已有 key 的中文 value 未被改回英文（除非 PR 写明有意修订）  
- [ ] 新增 UI 英文字符串已抽出 key，或列在 PR 的「待译清单」  
- [ ] 组件未把 `t(...)` 冲突解决成硬编码英文  
- [ ] `pnpm check` 通过；zh-CN 下主路径冒烟  

**代理 / 协作者默认指令：** 解决合并冲突时，涉及文案与 locale 文件 → **保留已有翻译，只加不删不冲**；拿不准时停下来标 `TODO` key，而不是接受纯英文上游文件。

更细的 key 级策略与目录约定见 [plans/chs-i18n.md](plans/chs-i18n.md) §5.1。

---

## 7. 发布检查清单（CHS）

### 纯多语言稳定包

- [ ] 改动仅限本地化范围（§4.1）
- [ ] 基于最新 `master`，已跑 `pnpm check` 与相关测试
- [ ] 已在目标平台做语言与主路径冒烟
- [ ] Tag：`vX.Y.Z-chs` 或 `vX.Y.Z-chs.N`
- [ ] **仅** `git push origin <tag>`（无 `upstream`）
- [ ] （推荐）i18n 已合回或计划合回 `next`
- [ ] 若本轮含上游/邻支合并：已按 §6.4 验收，**已有译文未被覆盖**

### 二开功能稳定包

- [ ] 功能在 `next` 完成并（如需要）经过 beta
- [ ] promote 到 `master` 使用 **merge commit**
- [ ] 稳定发布健康后 back-merge 回 `next`（merge commit）
- [ ] CHS 用户可见发行使用 `vX.Y.Z-chs`（§5）
- [ ] 未向 `upstream` 推送任何引用

---

## 8. 决策速查

```text
要改的是什么？
├─ 只是翻译 / 语言包 / 本地化接线
│    → 分支: master（chs/i18n-*）
│    → 发布: v{stable}-chs[.N]  → 只推 origin
│
├─ 新功能 / 行为变化
│    → 分支: next（chs/feat-*）
│    → 发布: 上游同款 beta → promote → master
│    → CHS 标: v{stable}-chs
│
├─ 已发布稳定版的紧急修复
│    → 分支: master（chs/hotfix-*），再 back-merge 到 next
│
└─ 要把代码送给官方？
     → 仅当任务明确要求；干净提交 + 对 upstream 开 PR
     → 默认: 不做
```

---

## 9. 给协作者与 AI 代理的约束摘要

1. **默认 remote 写入目标只有 `origin`（本 fork）。**
2. **纯多语言 → `master`；二开功能 → `next`。**
3. **CHS 稳定发行 tag = `v` + 稳定版号 + `-chs`（修订用 `-chs.N`）。**
4. **Promote / back-merge 必须 merge commit；Release PR 可 squash。**
5. **禁止擅自推送或 PR 到 `team-reflect/reflect-open`。**
6. **禁止在同一 PR 中混进「大功能 + 全量翻译」。**
7. **合并代码时不得覆盖已有翻译**（§6.4：zh-CN 只增不冲；禁止把 `t()` 解回硬编码英文）。
8. 上游流程细节以官方文档为准；本文件只覆盖 fork 差异。

---

## 10. 后续可选项（未强制）

以下内容需要时再做，不阻塞按本规则开发：

- 将 `upstream` 写进仓库级 `git` 文档或 onboarding 脚本
- 为 `*-chs` tag 增加专用 GitHub Release / 构建 job
- 在 `package.json` 与安装包文件名中统一展示「CHS」品牌（与 tag 策略一致即可）
- 用 `CODEOWNERS` 或 CI 检查：PR 标题 / 路径是否误把 i18n 合进错误 base

---

## 11. 首次从上游建立 `master` 并打出第一版 `vX.Y.Z-chs`

适用场景：本 fork 已有 `next`（可与上游开发支对齐），但还**没有**可用于 CHS 稳定交付的 `master`，也还没有 `*-chs` tag。目标是：

1. 用上游**最新稳定 tag** 建好本 fork 的 `master`
2. 在其上完成第一轮纯多语言
3. 打出并推送 **`v{该稳定版}-chs`**（只推 `origin`）

以下命令以当前上游稳定 **`v0.6.0`** 为例；若上游已有更新的稳定 tag，把所有 `0.6.0` / `v0.6.0` 换成新号即可。

### 0. 开始前核对

```bash
cd /path/to/reflect-open-chs
git status                    # 工作区应干净
git remote -v
```

| 检查项 | 期望 |
| --- | --- |
| `origin` | 指向本 fork（如 `deluxebear/reflect-open-chs`） |
| `upstream` | 指向 `team-reflect/reflect-open`；若没有则 §0.1 添加 |
| 工作区 | 无未提交改动（规则文档可先 commit 到 `next`，或 stash） |
| 本机工具 | `pnpm`、Rust/Tauri 按上游 README 可 `pnpm tauri dev` |

#### 0.1 添加只读 `upstream`（仅一次）

```bash
git remote add upstream git@github.com:team-reflect/reflect-open.git
# 或: git remote add upstream https://github.com/team-reflect/reflect-open.git

git remote set-url --push upstream DISABLE
# 防止误 push；需要贡献上游时再临时改回真实 URL
```

#### 0.2 确认上游最新稳定 tag

```bash
git fetch upstream --tags
git fetch origin

# 列出上游「纯稳定」tag（无 -beta）
git tag -l 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -5

# 记下选用的基线，例如：
BASE_TAG=v0.6.0
BASE_VER=0.6.0
CHS_TAG="${BASE_TAG}-chs"    # → v0.6.0-chs
```

打开上游 Release 页确认该 tag 已是正式版（非 draft / 非 pre-release）：  
https://github.com/team-reflect/reflect-open/releases

### 1. 用上游稳定 tag 建立本 fork 的 `master`

本 fork 的 `origin` 若**还没有** `master`：

```bash
# 轻量 tag 指向的 commit 即稳定快照
git checkout -B master "$BASE_TAG"
# 若本地还没有该 tag：git checkout -B master "upstream/master"
# 更稳妥：钉死在 tag
git reset --hard "$BASE_TAG"

# 首次推送到本 fork（不要推 upstream）
git push -u origin master
```

若 `origin` **已有** `master` 但内容不对齐稳定基线：

```bash
git fetch upstream --tags
git checkout master
git merge --ff-only "$BASE_TAG"   # 能快进最好
# 不能快进时：先看 log；需要时可 git reset --hard "$BASE_TAG"
# 再 force-push 仅限「确认 origin/master 尚无他人依赖」时使用：
# git push --force-with-lease origin master
```

验证：

```bash
git rev-parse HEAD
git rev-parse "$BASE_TAG"
# 两者应相同（在尚未加入任何 CHS 提交时）

jq -r .version apps/desktop/package.json
# 应输出 $BASE_VER，例如 0.6.0
```

### 2. 从 `master` 开纯多语言分支

```bash
git checkout master
git pull origin master
git checkout -b "chs/i18n-initial-${BASE_VER}"
```

本阶段**只做**本地化（§4.1），例如：

- UI 字符串、设置页、菜单、空状态文案
- locale 资源与切换入口（若上游尚无 i18n 框架，先做最小可运行的中文覆盖，避免顺手加无关功能）
- README / 本 fork 说明中的中文用户向内容（可选，可另 PR）

**不要**在本分支：

- 加二开功能
- 改 release-please manifest / 强行把 `package.json` 改成 `0.6.0-chs`（版本通道仍保持 `0.6.0`，CHS 身份靠 tag）
- 合并 `next` 上未稳定的提交

开发中循环：

```bash
pnpm install
pnpm check
pnpm test --run <你改动的测试路径>
pnpm tauri dev   # 或 pnpm dev 做 UI 冒烟：语言、今日笔记、设置、搜索
```

### 3. 合入本 fork 的 `master`

```bash
git push -u origin "chs/i18n-initial-${BASE_VER}"
```

在 GitHub **对本 fork** 开 PR：

- **base:** `master`
- **head:** `chs/i18n-initial-0.6.0`（示例）
- **title 示例:** `feat(i18n): add Simplified Chinese UI strings`
- merge 方式：squash 即可（普通功能/i18n PR，不是 promotion）

本地也可直合（单人维护时）：

```bash
git checkout master
git merge --squash "chs/i18n-initial-${BASE_VER}"
git commit -m "feat(i18n): add Simplified Chinese UI strings"
git push origin master
```

合入后再次：

```bash
pnpm check
# 关键路径手测：启动、今日笔记、设置、语言切换（若有）
```

### 4. 打第一枚 CHS 稳定 tag（只推 origin）

```bash
git checkout master
git pull origin master

# 确认仍基于预期上游版本（package.json 应为 0.6.0，而不是 beta）
jq -r .version apps/desktop/package.json   # → 0.6.0

git tag -a "$CHS_TAG" -m "CHS localization release based on ${BASE_TAG}"

# 核对
git show "$CHS_TAG" --no-patch
git merge-base --is-ancestor "$BASE_TAG" "$CHS_TAG" && echo "OK: tag contains upstream ${BASE_TAG}"

# 只推本 fork
git push origin "$CHS_TAG"
git push origin master
```

**禁止：**

```bash
git push upstream master          # 禁止
git push upstream "$CHS_TAG"      # 禁止
git push origin v0.6.0            # 不要用与上游同名的稳定 tag 冒充官方
```

### 5.（推荐）GitHub Release 与构建

在本 fork 的 Releases 创建 **`v0.6.0-chs`**（示例）：

- 标题：`0.6.0-chs` 或 `Reflect Open CHS 0.6.0`
- 说明写清：基于上游 `v0.6.0` + 简体中文/本地化；**非**官方构建
- 勾选与否：若平台把带 `-` 的版本当 pre-release，可按分发需要调整；语义上这是 CHS **稳定**交付
- 附件：本地或 CI 打出的 DMG/安装包（有签名再发；没有则文档写明 self-build）

本地构建可参考上游：

```bash
pnpm release:macos    # 需 Apple 签名/公证环境；没有则 pnpm tauri build 自用
```

自动化未改之前，**不必**强行跑通上游整套 release-please promote；第一版 CHS 允许「`master` 提交 + 手工 `*-chs` tag + 手工 Release」。

### 6.（强烈推荐）把 i18n 合回 `next`，避免功能支缺译

```bash
git fetch origin
git checkout next
git pull origin next

# 用 merge commit 把 master 上的本地化带进 next（与 post-stable 精神一致）
git merge origin/master -m "chore: merge master i18n into next"

# 冲突时优先保留 next 的功能代码 + 两边的文案键
pnpm check
git push origin next
```

若 `next` 比 `master` 新很多（例如已在 `0.6.1-beta.x`），merge 是正常的：  
`master` 贡献的是翻译提交，`next` 保留更新的功能与 beta 版本号。

### 7. 第一版完成后的仓库状态（验收清单）

| 项 | 期望结果 |
| --- | --- |
| `origin/master` | 存在；包含 `v0.6.0` 祖先 + CHS i18n 提交 |
| `origin/next` | 仍用于二开；建议已含 i18n |
| tag `v0.6.0-chs` | 存在于 **origin**；**不在** upstream |
| `apps/desktop/package.json` on master | 仍为 `0.6.0`（或当前稳定基线），不是 `0.6.0-chs` |
| `upstream` push URL | 已禁用或从未配置写权限 |
| 从未执行 | `git push upstream …` |

一键自检：

```bash
git ls-remote --heads origin master
git ls-remote --tags origin 'v*-chs*'
git ls-remote --tags upstream 'v*-chs*'   # 应为空
jq -r .version apps/desktop/package.json
```

### 8. 之后每一轮（非首次）怎么重复

| 情况 | 动作 |
| --- | --- |
| 上游发了新稳定版 `v0.7.0` | `fetch` → 更新 `master` 到该 tag → 解决 i18n 冲突 → 测完打 `v0.7.0-chs` |
| 仅修翻译、基线不变 | 在 `master` 修 → `v0.6.0-chs.1` |
| 做二开功能 | 只走 `next`，见 §4.2；稳定后再 promote，最后再打 `vX.Y.Z-chs` |

### 9. 与当前本仓库快照的对照（写作时）

便于对号入座（会随时间过期，以 `git` 为准）：

| 对象 | 当时状态 |
| --- | --- |
| `origin` | `deluxebear/reflect-open-chs` |
| `origin` 长期分支 | 主要有 `next`；**可能尚无** `master` |
| `origin/next` | 约在 `0.6.1-beta.2`（与上游 `next` 同形） |
| 上游最新稳定 tag | `v0.6.0` |
| 建议第一枚 CHS tag | **`v0.6.0-chs`**（在新建的 `master` + i18n 之后） |

因此首次路径不是「从当前 `next` 直接打 `v0.6.0-chs`」，而是：

```text
upstream tag v0.6.0
    → origin/master（钉在该稳定点）
    → chs/i18n-initial-0.6.0
    → 合回 origin/master
    → tag v0.6.0-chs  → push origin only
    → merge master → next（推荐）
```

### 10. 常见问题

**Q: 我只有 `next`，能从 `next` 上直接做中文并发 `v0.6.1-beta.2-chs` 吗？**  
A: 可以作内部试制，但**第一版给稳定用户的 CHS 包**仍应基于 **stable `master` / `vX.Y.Z-chs`**，不要拿 beta 当稳定基线。

**Q: 要不要改 `package.json` 为 `0.6.0-chs`？**  
A: 第一版**建议不改**，避免和 release-please / 上游同步打架；对外身份用 Git tag `v0.6.0-chs`。

**Q: 打 tag 后要跑完整 GitHub Actions Release 吗？**  
A: 有签名与 CI 密钥再跑；没有则本地构建 + 手写 Release 说明即可。规则不阻塞「先有可复现的 tag 与源码快照」。

**Q: 误把 CHS 推到 upstream 怎么办？**  
A: 立刻停止继续推送；在上游侧按官方流程删 branch/tag（需权限）；本规则要求默认 `upstream` push 禁用，就是为了防止这一步。
