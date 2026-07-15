# CHS i18n 方案（基于当前最新稳定基线）

**状态：** 方案（待实施）  
**基线：** 上游稳定 tag **`v0.6.0`** → 本 fork `master` → 交付 **`v0.6.0-chs`**  
**范围类型：** 纯本地化（见 [fork-chs-development.md](../fork-chs-development.md) §4.1）  
**不在范围：** 二开功能、改同步/索引协议、向 `upstream` 推送  

---

## 1. 现状结论

| 项 | 事实 |
| --- | --- |
| i18n 库 | **无**（无 i18next / lingui / formatjs 等依赖） |
| 文案形态 | 英文硬编码在 React 组件、`APP_COMMANDS`、原生菜单、部分 `lib/*` |
| 规模粗估 | `apps/desktop/src` 约 **360+** 个 `.tsx`；设置 ~55、移动 ~130、命令/菜单集中 |
| 已有相关设置 | `theme` / `dateFormat` / `timeFormat` / `weekStartDay`（**无** `locale`） |
| 日期展示 | `date-fns` + 用户 date/time 设置（英文 month/weekday 格式串） |
| 用户内容 | Markdown 笔记为 source of truth → **永不翻译笔记正文/标题/标签** |

结论：需要先落地 **框架 + 设置 + 高流量壳层**，再按面分批替换字符串；不能指望一次 PR 扫完全仓。

---

## 2. 产品边界（先定死）

### 2.1 要翻译（UI chrome）

- 侧栏、顶栏、设置全文案、对话框、Toast、空状态  
- 命令面板命令名 / 关键词（中文检索要可命中）  
- 快捷键说明、原生 macOS 应用菜单里**自定义**项  
- 同步/备份/更新等状态的**产品语言**提示  
- 移动端与桌面共用同一套文案 key（一套 catalog，两处 UI）

### 2.2 不翻译（数据与协议）

| 不译 | 原因 |
| --- | --- |
| 笔记标题、正文、wiki 目标、标签 | 用户数据 / Markdown 真相 |
| 图名称、路径、文件名 | 文件系统身份 |
| AI 模型 id、provider 技术名 | 对接外部 API |
| 用户自定义 AI prompt 内容 | 用户写入的数据 |
| Conventional commit / changelog 给开发者的英文 | 工程通道，可另做中文 Release 说明 |
| CLI 输出（首期） | 可二期；默认保持英文利于脚本 |

### 2.3 特殊：欢迎笔记 `welcome-note.ts`

- 内容是**写入 graph 的 Markdown**，不是纯 UI。  
- **推荐：**  
  - 仅在 **新 graph 首次 seed** 时，按**当时** `locale` 选择 `en` / `zh-CN` 模板；  
  - 已存在的欢迎笔记**不回写、不覆盖**。  
- 避免把「改笔记内容」做成设置切换语言的副作用。

### 2.4 默认语言（CHS 发行）

| 场景 | 行为 |
| --- | --- |
| 设置 `locale: system`（默认） | 跟 OS：`zh*` → `zh-CN`，否则 `en` |
| CHS 包可选 | 构建期 `DEFAULT_LOCALE=zh-CN` 覆盖默认（不必改用户已有 settings 文件） |
| 用户显式选择 | `en` / `zh-CN` 写入 settings，立即生效（菜单需重建） |

首期语言包：**`en`（源语言）+ `zh-CN`（简体）**。其他语言后续加 catalog 即可。

---

## 3. 技术选型

### 3.1 推荐：`i18next` + `react-i18next`

| 优点 | 说明 |
| --- | --- |
| 生态成熟 | React hooks、插值、复数、命名空间 |
| 与现有栈兼容 | 无 SSR 包袱；可在非 React 模块用 `i18n.t()` |
| 翻译工作流简单 | JSON 资源，便于人工/机翻维护 |
| 体量可控 | 对桌面应用可接受 |

**不推荐首期：** 自研 `t()` 字典（缺复数/插值/懒加载/生态）、FormatJS 全套（偏重）、仅 CSS/`lang` 属性（解决不了文案）。

可选增强（二期）：`i18next-browser-languagedetector` 可不用——检测放在 settings + `navigator.language` 即可，设置已是唯一政策源。

### 3.2 资源布局

```text
apps/desktop/src/i18n/
  index.ts                 # 创建实例、export t / useT
  locales.ts               # LocaleId 联合类型、system 解析
  react.tsx                # I18nProvider（读 settings.locale）
  locales/
    en/
      common.json          # 通用按钮、状态
      shell.json           # 侧栏、顶栏、路由壳
      settings.json
      commands.json        # 与 APP_COMMANDS 对齐的 title/keywords
      dialogs.json
      mobile.json
    zh-CN/
      …（同名文件）
```

- Key 使用 **稳定语义 id**，不要用整句英文当 key（改英文会炸所有引用）：  
  `settings.appearance.theme.system` → `"System"` / `"跟随系统"`  
- 英文 catalog 为 **源语言**；CI 可加「zh-CN 缺 key 则 fail」的轻量检查（二期）。

### 3.3 设置 schema（`@reflect/core`）

在 `packages/core/src/settings/schema.ts` 增加：

```ts
// 概念示意
localePreferenceSchema = z.enum(['system', 'en', 'zh-CN']).catch('system')
// settingsSchema.locale: localePreferenceSchema
```

- 持久化走现有 OS config JSON，**不**进 graph Markdown。  
- UI：设置 → Appearance（或新「Language / 语言」行）三选一。  
- 变更后：更新 i18n 实例 + **重建原生菜单**（`appMenuLayout` 依赖翻译后的 label）。

### 3.4 命令与菜单（单一来源）

现状：`APP_COMMANDS` 已是 palette / 快捷键表 / 部分菜单的真相源。

**做法：**

1. `AppCommand.title`（及可选 `keywords`）改为 **i18n key**，或保留 id、在展示层 `t(\`commands.${id}.title\`)`。  
2. 推荐展示层翻译，**registry 存稳定 id**，避免命令 id 随语言变。  
3. `keywords` 中英都可写进 catalog（中文用户搜「设置」「今天」应命中）。  
4. `appMenuLayout()` 在安装/语言切换时用当前语言生成 `text`。

### 3.5 日期与数字

- 继续尊重用户的 `dateFormat` / `timeFormat` / `weekStartDay`（产品已有）。  
- 额外：当 resolved locale 为 `zh-CN` 时，`date-fns` 的 `format` 传入 `zhCN` locale，使 `EEEE`/`MMMM` 等为中文（若格式串仍含英文月名）。  
- **不要**用 i18n 重写 daily note 的 `YYYY-MM-DD` 路径。

### 3.6 非 React 调用

- `@/i18n` 导出与 React 同源的 `i18n` 实例。  
- Toast、controller 文案：`i18n.t('…')`。  
- **core 包尽量不依赖 i18n**：错误码/枚举在 UI 边界映射到文案（符合「core 无 Tauri、少 UI 政策」）。

### 3.7 Meowdown / 编辑器

- 编辑器内核文案若存在（placeholder、菜单），优先查当前 `@meowdown/*` 是否支持 locale；  
- 不支持则首期只译 Reflect 壳层；placeholder 等 Reflect 传入的字符串走 i18n。  
- **不** fork meowdown 仅为一句文案，除非阻塞严重。

---

## 4. 分阶段实施（建议 PR 切片）

每阶段都可独立合入 `master`、独立测试；全部完成后打 `v0.6.0-chs`。

### Phase 0 — 基线与分支（无产品行为）

1. `upstream` 只读；`origin/master` 钉在 **`v0.6.0`**（见 fork 文档 §11）。  
2. 分支：`chs/i18n-foundation` ← `master`。  
3. 提交本方案（可选）与后续代码 PR 分离。

### Phase 1 — 框架骨架（约 1 个 PR）

**交付：**

- 依赖：`i18next`、`react-i18next`  
- `apps/desktop/src/i18n/*` + `en`/`zh-CN` 最小 `common` + `settings`  
- `settings.locale` + Appearance/Language UI  
- 根上 `I18nProvider` 接 settings  
- 冒烟：切换语言，设置页标题等已接入的字符串变化  

**验收：** 默认 system 在中文 macOS 下为中文；可强制 English；刷新后设置仍在。

### Phase 2 — 壳层与命令（高感知，约 1–2 个 PR）

**交付：**

- 侧栏、工作区顶栏、路由空态、快捷键对话框  
- `APP_COMMANDS` 展示名 + palette 关键词  
- 原生菜单自定义项  
- `common` 按钮：Save / Cancel / Delete / Retry…  

**验收：** ⌘K、⌘/、菜单栏、侧栏主路径全中文可切换回英文。

### Phase 3 — 设置全页与桌面主流程（可再拆 2–3 个 PR）

按设置 navigator 分 section 推进（Editor / Sync / AI / Backup / …），再补：

- Graph chooser、冲突横幅、更新 Toast  
- Chat 壳层（输入框 placeholder、历史菜单 chrome；**不**译模型返回内容）  
- All notes / Tasks 工具栏与过滤文案  

**验收：** 设置每一屏无大块英文残留（专有名词可保留）。

### Phase 4 — 移动端（1–2 个 PR）

- 复用同一 catalog 的 `mobile` 命名空间  
- Tab、onboarding、移动设置、录音等  

**验收：** iOS 模拟器主路径语言与桌面设置一致（settings 同源）。

### Phase 5 — 抛光

- `date-fns` zh locale  
- 欢迎笔记中文模板（仅新 graph）  
- 缺 key 检查脚本  
- 中文排版：设置页过长换行、按钮 `min-width`  
- 文档：fork README 中文说明；Release 说明 `v0.6.0-chs`  

### 然后发布

1. 合入 `master` → 全量手测清单（§6）  
2. Tag **`v0.6.0-chs`** → 只推 `origin`  
3. `merge master → next`（merge commit），二开功能支不缺译  

---

## 5. 代码约定（实施时遵守）

```tsx
// ✅
const { t } = useTranslation('settings')
return <h1>{t('appearance.title')}</h1>

// ✅ 插值
t('update.install', { version })

// ❌ 拼接句子导致语序无法本地化
t('install') + ' ' + version + ' ' + t('now')

// ❌ 翻译用户笔记
t(note.title)

// ❌ 在 packages/core 业务函数里 import react-i18next
```

- 测试：对关键组件 mock `t` 为 `(key) => key` 或固定 en；或测「切换 locale 后出现某中文」的少量集成测。  
- 不要为每个字符串加 snapshot 中文，避免噪音。  
- PR 标题：`feat(i18n): …`；纯文案修补：`fix(i18n): …`。

### 5.1 合并时不得覆盖已有翻译（硬规则）

与 [fork-chs-development.md §6.4](../fork-chs-development.md) 一致，实施与后续同步时**强制**执行：

| 规则 | 说明 |
| --- | --- |
| **译文优先** | `locales/zh-CN/**` 已有 key 的 value，合并时默认保留；禁止无说明地改回英文或删 key |
| **只加不冲** | 上游/邻支带来的**新** UI → 新 key + 新中文（或 `TODO`）；不重写无关旧条目 |
| **en 可新、zh 不丢** | 更新 `en/**` 源文可以；不得以「与 en 对齐」为名清空 zh-CN |
| **接线保留** | 冲突时保留 `t('…')` / `useTranslation`，禁止为图省事恢复硬编码英文字面量 |
| **禁止整文件 theirs/ours** | 不得对 zh-CN JSON 一键接受上游或一键丢弃对方新增 key 而不审 |
| **有意改译才改** | 润色中文必须在 PR 中写明；同步上游 PR 默认不做「顺手重翻」 |

**推荐目录形态（降低被冲风险）：**

- 所有译文集中在 `apps/desktop/src/i18n/locales/{en,zh-CN}/`，少在业务文件里散落中文副本。  
- 组件只引用 key；合并上游时组件冲突多在结构，文案冲突收敛在 JSON。  
- 可选（二期）：合并后脚本 `check-i18n-coverage`——`en` 有而 `zh-CN` 缺 → CI 警告；`zh-CN` 被删 key → CI 失败。

**同步上游时的标准动作：**

```text
merge upstream → 解决逻辑冲突 → 对每个新英文字符串：
  抽 key（若尚未）→ en 写入 → zh-CN 追加（保留旧 key 中文）
→ §6.4 验收 → 再 push
```

---

## 6. 测试清单（`v0.6.0-chs` 出门前）

**桌面**

- [ ] 中文 OS / 英文 OS 下 `system` 默认正确  
- [ ] 设置内切换 en ↔ zh-CN，无需重启（菜单重建后正确）  
- [ ] 今日笔记、打开笔记、pin、搜索 ⌘K、命令 `>`  
- [ ] 设置：外观、编辑器、同步、AI 密钥入口、备份  
- [ ] 冲突/私密笔记/更新提示（若可造）  
- [ ] 笔记正文仍为用户原文；wiki 链接目标不乱码  

**移动（若发 TestFlight）**

- [ ] 与桌面相同 locale 设置生效  
- [ ] 录音 / 今日 / 搜索主路径  

**工程**

- [ ] `pnpm check`、相关单测  
- [ ] 未 `push upstream`  
- [ ] tag `v0.6.0-chs` 指向含 i18n 的 `master`  

---

## 7. 工作量与风险

| 风险 | 缓解 |
| --- | --- |
| 文案面大、一次做不完 | 严格 Phase；先壳层再设置再移动 |
| 上游合并冲掉译文 | §5.1 / fork §6.4：zh-CN 只加不冲；禁整文件 theirs；合并验收清单 |
| 上游合并冲突 | i18n 资源集中目录；组件只加 `t()`；冲突时保留接线与已有中文 |
| 硬编码漏网 | 后期用 eslint 限制（可选）或抽查高流量路径 |
| 中文变长撑破 UI | Phase 5 扫设置与对话框 |
| 命令检索只认英文 | `keywords` 双语写入 catalog |
| 与 `next` 上 beta 分叉 | 发布后立刻 back-merge master→next |

粗量级（一人熟悉代码库）：  

- Phase 1：0.5–1 天  
- Phase 2：1–2 天  
- Phase 3：2–4 天  
- Phase 4：1–2 天  
- Phase 5 + 发布：0.5–1 天  

---

## 8. 与「最新版本」的对齐说明

| 指针 | 版本含义 | i18n 应用 |
| --- | --- | --- |
| 上游 **stable** `v0.6.0` | 当前最新**正式**版 | **本方案基线**（CHS 稳定交付） |
| 上游 / 本 fork **`next`** `0.6.1-beta.x` | 更新的开发支 | **不**作为第一版纯 i18n 基线；i18n 经 master 合回后自然跟上 |

若强行在 `next` 上做完整 i18n：能拿到更新代码，但违反「纯多语言上 master」规则，且 beta API 变动会放大翻译返工。  
**例外：** 仅 Phase 1 框架若需在 `next` 试验，可试验后 **cherry-pick 回 master@v0.6.0**，正式翻译仍落在 master。

---

## 9. 建议的立即下一步

1. 确认本方案（尤其：默认 `system`、欢迎笔记策略、是否要做移动端首包）。  
2. 执行 Phase 0：建立 `origin/master` @ `v0.6.0`。  
3. 开 `chs/i18n-foundation`，做 Phase 1 骨架 PR。  
4. Phase 2 起按壳层 → 设置 → 移动推进，全部完成后打 **`v0.6.0-chs`**。

---

## 10. 决策记录（可勾选）

| # | 决策 | 默认 |
| --- | --- | --- |
| D1 | 库 | i18next + react-i18next |
| D2 | 首包语言 | en + zh-CN |
| D3 | 默认 | `locale: system` |
| D4 | 设置字段 | `settings.locale` |
| D5 | 笔记内容 | 永不自动翻译 |
| D6 | 欢迎笔记 | 仅新 graph 按 locale seed |
| D7 | 基线 | master @ v0.6.0 → tag v0.6.0-chs |
| D8 | core | 不引入 i18n 运行时，UI 边界映射 |
| D9 | 合并保护 | **已有翻译不可被后续 merge/同步无审覆盖**（§5.1） |

若要改 D3（CHS 包默认强制 zh-CN）或 D6（不做中文欢迎笔记），实施前改本文即可。
