# Module 1 Prompt: What Is A Skill

请先读取：

- `../00-global-style.md`
- `../01-course-map.md`

然后在当前目录写出以下文件：

- `lesson.md`
- `talk-track.md`
- `exercise.md`
- `card-input.md`

## Module Goal

这一课要让她真正形成一个稳定心智模型：

`skill` 不是咒语，不是按钮，不是“更高级的 prompt”。

它更像是：把 Claude 拉进一种稳定工作方式的工法。

## What This Lesson Must Achieve

1. 解释普通聊天、调用 skill、串成 workflow 之间的区别。
2. 让她知道 skill 的价值不是“酷”，而是减少来回试错。
3. 让她对后面的几把具体工具有期待，但不要一次讲太多。

## Content Requirements

### `lesson.md`

- 用一个生活类比开场，不要从定义开场。
- 必须解释这三个层次：
  - 随口问 Claude
  - 调一个 skill
  - 把多个 skill 串成 workflow
- 用三个轻量例子做说明，优先使用：
  - `ljg-plain`
  - `ljg-rank`
  - `ljg-card`
- 结尾给一个“什么时候该想到 skill”的判断清单。

### `talk-track.md`

- 写成我可以直接讲给她听的话。
- 不要像教程主播，不要像产品介绍。
- 允许出现“你可以先把它想成……”这种陪伴式句子。

### `exercise.md`

- 两个确认理解的问题
- 一个“把场景配给 skill”的小练习
- 一个“这时候其实不用 skill”的反例题

### `card-input.md`

- 写成一段适合后续交给 `ljg-card -l` 的卡片文案源
- 只保留本课最核心的 4-6 句话
- 语气要轻，不要像宣传海报

## Teaching Warning

- 不要讲安装路径、目录结构、插件机制
- 不要一开始就堆 `user_invocable`、`workflow` 等词
- 她学完后最重要的收获应该是：以后看到一个任务，会自然想“这是不是该调一个 skill 了”
