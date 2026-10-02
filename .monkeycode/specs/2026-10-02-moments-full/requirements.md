# Requirements Document — 朋友圈完整功能

Feature Name: moments-full
Updated: 2026-10-02

## Introduction

为空蚀纪（纯前端单机应用）的朋友圈模块补齐完整功能：发布（文字/图片/最多9图）、点赞头像列表、楼中楼评论、删除确认、转发到聊天、角色定时发朋友圈、角色自动互动、NPC评论区生态、互动数据延时展示、个人朋友圈页面、悬浮发布按钮、用户头像全局通连，以及可选加分项（访客记录、朋友圈权限、音乐卡片、已发布可编辑）。

## Glossary

- **用户**: 当前操作手机的使用者，author.type === 'user'
- **角色**: 用户创建的 Character，有独立人设与头像
- **NPC**: 论坛生态中的路人角色（store/forum.npcs），无聊天会话
- **朋友圈**: MomentsApp 应用，时间线动态列表
- **楼中楼**: 对某条一级评论的回复，形成二级评论层
- **卡片**: 单条动态的可视化容器，含头像、昵称、内容、图片、时间、点赞数、评论区
- **文案池**: 无 LLM API 时角色发朋友圈使用的预设文案集合

## Requirements

### R1 用户头像全局通连

**User Story:** AS 用户，我希望主页设置的头像在聊天、朋友圈等所有场景一致显示，避免各处头像割裂。

#### Acceptance Criteria

1. WHEN 用户在主页（ProfileApp）设置或更换头像，聊天消息、聊天侧栏、朋友圈、评论区中该用户头像 SHALL 立即更新为同一张图。
2. WHEN 任一页面渲染用户头像，系统 SHALL 读取 useProfile.profile.avatarId 作为图片源。
3. IF 用户未设置头像，系统 SHALL 在各场景统一显示昵称首字占位头像。

### R2 发布动态

**User Story:** AS 用户，我想发布纯文字、文字+图片或多图动态。

#### Acceptance Criteria

1. WHEN 用户提交仅文字内容，系统 SHALL 创建一条无图动态。
2. WHEN 用户添加图片，系统 SHALL 支持选择至多 9 张图片，压缩后存入 IndexedDB，动态内保存图片 id 数组。
3. WHEN 动态包含多于 4 张图片，时间线卡片 SHALL 以网格折叠展示，点击展开全部。
4. IF 用户提交时文字为空且图片数为 0，系统 SHALL 阻止发布并提示。
5. WHEN 发布成功，系统 SHALL 清空发布弹窗并将新动态插入时间线顶部。

### R3 点赞

**User Story:** AS 用户，我想点赞/取消点赞，并查看点赞者的头像列表。

#### Acceptance Criteria

1. WHEN 用户点击未点赞动态的心形按钮，系统 SHALL 将用户加入该动态点赞者列表。
2. WHEN 用户点击已点赞动态的心形按钮，系统 SHALL 将用户从点赞者列表移除。
3. WHEN 动态存在点赞者，卡片 SHALL 展示点赞者头像列表（用户头像+角色头像）与总数。
4. WHEN 点赞者超过列表展示容量，系统 SHALL 显示剩余数量。

### R4 评论与楼中楼

**User Story:** AS 用户，我想评论动态并回复他人评论，回复以楼中楼呈现。

#### Acceptance Criteria

1. WHEN 用户发布一级评论，系统 SHALL 将评论追加到该动态评论列表。
2. WHEN 用户点击某条评论的"回复"，系统 SHALL 创建一条关联该评论的楼中楼回复。
3. WHEN 渲染评论区，系统 SHALL 按一级评论分组展示，楼中楼缩进显示于父评论下方。
4. WHEN 用户点击"回复"时，输入框 SHALL 预填回复对象名称。

### R5 删除动态

**User Story:** AS 用户，我想删除自己发布的动态，且删除需要二次确认。

#### Acceptance Criteria

1. WHEN 用户长按或点击自己动态的删除入口，系统 SHALL 弹出确认对话框。
2. IF 用户确认删除，系统 SHALL 从存储中移除该动态并更新时间线。
3. IF 用户取消，系统 SHALL 保留该动态。
4. WHILE 动态作者是角色，系统 SHALL 对用户隐藏删除入口。

### R6 转发到聊天

**User Story:** AS 用户，我想把朋友圈转发到某个聊天窗口，以卡片形式展示。

#### Acceptance Criteria

1. WHEN 用户长按或点击动态的转发入口，系统 SHALL 弹出会话选择列表。
2. WHEN 用户选定会话，系统 SHALL 向该会话追加一条 moment-card 类型消息，卡片含文字摘要与首图缩略图。
3. WHEN 聊天界面渲染 moment-card 消息，系统 SHALL 展示"朋友圈卡片"样式（来源昵称+文字+缩略图）。
4. WHEN 用户点击聊天中的朋友圈卡片，系统 SHALL 跳转到朋友圈应用并定位该动态。

### R7 角色定时发朋友圈

**User Story:** AS 用户，我希望角色每隔一段时间自动发动态，内容来自文案池或按人设生成。

#### Acceptance Criteria

1. WHEN 调度器 tick 到期且存在可用角色，系统 SHALL 按随机间隔（默认 10~25 分钟）让一个角色发布一条动态。
2. IF 默认 LLM API 可用，系统 SHALL 调用 generateMomentContent 按角色人设生成内容。
3. IF LLM API 不可用或生成失败，系统 SHALL 从内置文案池按角色随机抽取一条作为内容。
4. WHEN 角色动态发布且用户关注该角色，系统 SHALL 推送通知。

### R8 角色互动用户朋友圈

**User Story:** AS 用户，我发完朋友圈后角色能自动来评论、回复评论、点赞。

#### Acceptance Criteria

1. WHEN 用户发布新动态，系统 SHALL 在随机延时后安排至多 3 个可见角色依次互动（点赞或评论）。
2. WHEN 用户在评论区发布或回复内容，系统 SHALL 安排被回复对象（角色）以楼中楼形式回复。
3. WHEN 角色完成互动，系统 SHALL 推送对应通知（点赞/评论）。

### R9 评论区 NPC 生态

**User Story:** AS 用户，我希望评论区不止目标角色，NPC 和路人也会互相点赞评论。

#### Acceptance Criteria

1. WHEN 安排动态互动，系统 SHALL 从角色与已解锁 NPC 的并集中随机挑选互动者。
2. WHEN NPC 互动他人评论或动态，系统 SHALL 生成符合 NPC 人设的短评。
3. WHEN 多个互动者参与同一条动态，系统 SHALL 以随机顺序与间隔依次落库。

### R10 互动数据延时展示

**User Story:** AS 用户，我希望角色发动态后点赞评论逐渐出现，模拟真实刷朋友圈。

#### Acceptance Criteria

1. WHEN 角色发布动态，系统 SHALL 在发布后 20 秒~3 分钟内分批安排 0~5 个互动者点赞或评论。
2. WHEN 单个互动落库，时间线对应卡片 SHALL 实时更新点赞数与评论区。
3. WHILE 用户查看该动态期间有新互动到达，系统 SHALL 无需刷新即展示新增内容。

### R11 时间线与卡片

**User Story:** AS 用户，我想按时间倒序浏览朋友圈卡片。

#### Acceptance Criteria

1. WHEN 渲染朋友圈时间线，系统 SHALL 按发布时间倒序排列所有动态。
2. WHEN 渲染单条动态，卡片 SHALL 依次展示头像、昵称、文字、图片网格、相对时间、点赞头像区、评论区。
3. WHEN 用户下拉时间线，系统 SHALL 展示全部历史动态（分批渲染可接受）。

### R12 悬浮发布按钮

**User Story:** AS 用户，我想从右下角悬浮按钮快速进入发布弹窗。

#### Acceptance Criteria

1. WHILE 朋友圈时间线可见，系统 SHALL 在右下角固定显示悬浮发布按钮。
2. WHEN 用户点击悬浮按钮，系统 SHALL 打开发布弹窗。

### R13 个人朋友圈页面

**User Story:** AS 用户，我想点击某人的头像查看 TA 发过的所有朋友圈。

#### Acceptance Criteria

1. WHEN 用户点击时间线中任意作者头像，系统 SHALL 进入该作者的个人朋友圈页。
2. WHEN 渲染个人朋友圈页，系统 SHALL 展示作者头像、昵称及其全部动态（倒序）。
3. WHEN 用户在个人朋友圈页触发返回，系统 SHALL 回到时间线。

### R14 数据结构

**User Story:** AS 开发者，我需要稳定的朋友圈数据结构持久化在 localStorage。

#### Acceptance Criteria

1. 系统 SHALL 为每条动态保存：id、作者（type/id/name）、发布时间 createdAt、文字 content、图片 id 数组、点赞者 id 数组、评论数组（含 parentId 楼中楼关系）、可见性配置。
2. 作者头像 SHALL 由作者 id 实时解析（角色取 character.avatarId，用户取 profile.avatarId），动态内 SHALL 冗余存储作者昵称快照用于离线展示。
3. WHEN 应用重启，系统 SHALL 从 zustand persist（localStorage，前缀 ksc:）恢复全部朋友圈数据；图片从 IndexedDB 读取。

### R15 访客记录（可选）

**User Story:** AS 用户，我想知道哪些角色看过我的朋友圈但没互动。

#### Acceptance Criteria

1. WHEN 角色查看用户动态且未立即互动，系统 SHALL 记录访客（角色 id + 时间）。
2. WHEN 用户打开自己个人朋友圈页，系统 SHALL 展示最近访客头像列表。

### R16 朋友圈权限（已有，保留）

**User Story:** AS 用户，我想设置动态对谁可见。

#### Acceptance Criteria

1. WHEN 用户发布动态，系统 SHALL 支持全部可见/好友可见/自定义可见三种范围。
2. WHILE 角色不在动态可见范围内，该角色 SHALL 被排除在互动者候选之外。

### R17 分享音乐卡片（可选）

**User Story:** AS 用户，我想发布动态时附一首歌，展示为音乐卡片。

#### Acceptance Criteria

1. WHEN 用户在发布弹窗选择分享音乐并填写歌名与歌手，卡片 SHALL 渲染音乐卡片样式（封面占位+歌名+歌手）。
2. WHEN 动态附带音乐，点击音乐卡片 SHALL 显示音乐详情（可选播放占位动画）。

### R18 已发布可编辑（可选）

**User Story:** AS 用户，我想修改已发布动态的文字内容。

#### Acceptance Criteria

1. WHEN 用户对自己动态点击编辑入口，系统 SHALL 打开编辑弹窗预填原文字。
2. WHEN 用户保存编辑，系统 SHALL 更新文字内容并保留原图片、点赞与评论。
3. IF 编辑后文字为空且无图片，系统 SHALL 阻止保存并提示。

## Non-Functional

1. 所有交互 SHALL 遵循项目现有 Zustand 红线：selector 内禁止返回新引用的方法调用。
2. 所有图片 SHALL 经 compressImage 压缩后存 IndexedDB（kongshiji-db），UI 通过 useBlobURL 引用。
3. 角色生成类功能 SHALL 复用 forumEngine/forumScheduler 既有调度与通知体系（useNotifications）。
