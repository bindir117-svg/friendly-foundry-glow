# Төлөвлөгөө

Хоёр том ажил: (1) хичээлийг сонирхолтой болгох, (2) app-ыг бүхэлд нь блок-байдлаар засварлах систем.

## 1. Хичээл — XP + Achievement + Interactive quiz карт

### Database
- `profiles` дээр нэмнэ: `xp int default 0`, `level int default 1`, `streak_days int default 0`, `last_active date`
- Шинэ хүснэгтүүд:
  - `achievements` (id, code, title, description, icon, xp_reward, condition_type, condition_value)
  - `user_achievements` (user_id, achievement_id, unlocked_at)
- `lesson_progress` дээр: `xp_earned int default 0`
- `lessons.content` дотор шинэ block syntax дэмжинэ (JSON эсвэл markdown extension):
  - `:::quiz` — multi-choice quiz card
  - `:::flashcard` — эргэдэг карт
  - `:::fill` — хоосон нөхөх
  - `:::code` — жижиг код sandbox (readonly output)
  - `:::callout` — highlight box (tip/warning/success)

### Frontend
- **LessonViewer** дахин бичнэ: markdown-ыг custom renderer-ээр parse хийж, block-уудыг React component болгож харуулна.
- **Interactive components**: `QuizBlock`, `FlashcardBlock`, `FillBlock`, `CalloutBlock` — зөв хариулт өгөх бүрд +XP toast, confetti, sound (богино beep).
- **XP bar** дээд талд, level up modal + achievement unlock toast.
- **Streak counter** dashboard дээр (Duolingo маягийн галын дүрс).
- **AchievementsPage** — олсон/олоогүй бүх badge grid.
- **Progress ring** хичээл бүрийн card дээр.

### LessonEditor өргөтгөл
- Toolbar-т шинэ товч: "Quiz нэмэх", "Flashcard", "Callout", "Fill blank" — товшсон үед харгалзах block snippet insert хийнэ.
- Preview дотор яг viewer шиг рендер хийнэ.

## 2. Page Builder — App-даяар блок-байдлаар edit

### Хамрах хүрээ
Дараах хуудсуудыг block-based болгоно: `/` (Index), `/design`, `/analyze`, `/notes` (header hero), `/chat` (welcome). Хатуу код (form, chat UI гэх мэт) хэвээр, харин hero/section/CTA/text/image/grid хэсгүүд DB-ээс.

### Database
- `pages` (id, slug unique, title, meta_description, published bool)
- `page_blocks` (id, page_id, order_index, type, props jsonb)
  - type: `hero`, `heading`, `text`, `image`, `cta`, `feature_grid`, `stats`, `divider`, `video`, `quote`, `columns`
- RLS: read = бүгд, write = admin only.

### Frontend
- **`<PageRenderer slug="..." />`** — DB-ээс block татаад type-аар нь харгалзах React component рендер хийнэ.
- **Block components** (`src/components/blocks/*`): `HeroBlock`, `HeadingBlock`, `TextBlock`, `ImageBlock`, `CtaBlock`, `FeatureGridBlock`, `StatsBlock`, `DividerBlock`, `VideoBlock`, `QuoteBlock`, `ColumnsBlock`.
- Одоогийн `Index.tsx`, `Design.tsx` гэх мэт — hardcoded hero-ыг `<PageRenderer slug="home" />` гэх болгож солино.

### Admin — Page Builder UI
- `/admin` дээр шинэ таб: **"Хуудас"**
- Зүүн талд page жагсаалт, төвд block list (drag to reorder), баруун талд сонгосон block-ийн props form.
- "Block нэмэх" товч → block type picker (icon + нэр).
- "Preview" горим → тухайн хуудсыг шинэ tab-д нээж харуулна.
- Зураг upload — одоо байгаа `lesson-images` bucket-ийг `page-assets` руу нэрлэсэн шинэ bucket ашиглана.

## Технологи ба хэрэгжүүлэлт

- `@dnd-kit/core` — block reorder
- `react-confetti` эсвэл canvas-confetti — XP animation
- `framer-motion` (аль хэдийн байгаа магадгүй) — level up modal, block transitions
- Markdown custom directive parser: `remark-directive` + `remark-directive-rehype`
- Sound: жижиг `.mp3` эсвэл WebAudio beep — нам дуутай, off toggle-той

## Хэрэгжих дараалал

1. **Migration**: profile XP columns, achievements хүснэгтүүд, pages/page_blocks, page-assets bucket.
2. **XP/Achievement систем + LessonViewer interactive blocks** — эхний release.
3. **LessonEditor-т quiz/flashcard/callout toolbar** товч.
4. **Block components + PageRenderer** — Index page-г эхэлж хөрвүүлнэ.
5. **Admin page builder UI** (drag/drop, props editor).
6. Үлдсэн хуудсуудыг PageRenderer руу нүүлгэнэ.

## Санамж

Энэ хоёр ажил тус бүрдээ том тул нэг мессежинд бүгдийг бичихгүй — approve хийсний дараа **Step 1 (migration) → Step 2 (XP + interactive lesson blocks)**-г эхэлж хийе. Дараа нь block builder-т шилжинэ. Тохирох уу?
