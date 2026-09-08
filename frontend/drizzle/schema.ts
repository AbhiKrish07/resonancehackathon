import { boolean, float, index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  theme: varchar("theme", { length: 16 }).default("system").notNull(),
  language: varchar("language", { length: 8 }).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ ownerIdx: index("workspace_owner_idx").on(table.ownerId), slugIdx: uniqueIndex("workspace_slug_idx").on(table.slug) }));

export const workspaceMembers = mysqlTable("workspaceMembers", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ memberIdx: uniqueIndex("workspace_member_idx").on(table.workspaceId, table.userId) }));

export const canvases = mysqlTable("canvases", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  viewportX: float("viewportX").default(0).notNull(),
  viewportY: float("viewportY").default(0).notNull(),
  zoom: float("zoom").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ workspaceIdx: index("canvas_workspace_idx").on(table.workspaceId) }));

export const cardGroups = mysqlTable("cardGroups", {
  id: int("id").autoincrement().primaryKey(),
  canvasId: int("canvasId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  color: varchar("color", { length: 32 }).notNull(),
  x: float("x").default(0).notNull(),
  y: float("y").default(0).notNull(),
  width: float("width").default(540).notNull(),
  height: float("height").default(360).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ canvasIdx: index("group_canvas_idx").on(table.canvasId) }));

export const cards = mysqlTable("cards", {
  id: int("id").autoincrement().primaryKey(),
  canvasId: int("canvasId").notNull(),
  groupId: int("groupId"),
  sourceId: int("sourceId"),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  cardType: mysqlEnum("cardType", ["note", "quote", "question", "insight", "summary"]).default("note").notNull(),
  accent: varchar("accent", { length: 32 }).default("mint").notNull(),
  x: float("x").default(0).notNull(),
  y: float("y").default(0).notNull(),
  width: float("width").default(260).notNull(),
  height: float("height").default(180).notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ canvasIdx: index("card_canvas_idx").on(table.canvasId), sourceIdx: index("card_source_idx").on(table.sourceId) }));

export const cardLinks = mysqlTable("cardLinks", {
  id: int("id").autoincrement().primaryKey(),
  canvasId: int("canvasId").notNull(),
  fromCardId: int("fromCardId").notNull(),
  toCardId: int("toCardId").notNull(),
  label: varchar("label", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ canvasIdx: index("link_canvas_idx").on(table.canvasId) }));

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  canvasId: int("canvasId"),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ workspaceIdx: index("note_workspace_idx").on(table.workspaceId) }));

export const sources = mysqlTable("sources", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["url", "pdf", "document", "image", "audio", "artifact", "connector"]).default("url").notNull(),
  url: text("url"),
  storageKey: text("storageKey"),
  mimeType: varchar("mimeType", { length: 120 }),
  excerpt: text("excerpt"),
  metadata: text("metadata"),
  externalId: varchar("externalId", { length: 240 }),
  adapter: varchar("adapter", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ workspaceIdx: index("source_workspace_idx").on(table.workspaceId), externalIdx: index("source_external_idx").on(table.externalId) }));

export const syncRuns = mysqlTable("syncRuns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  adapter: varchar("adapter", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["idle", "running", "completed", "failed"]).default("idle").notNull(),
  itemsProcessed: int("itemsProcessed").default(0).notNull(),
  errorMessage: text("errorMessage"),
  lastCursor: text("lastCursor"),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ workspaceIdx: index("sync_workspace_idx").on(table.workspaceId) }));

export const sourceCards = mysqlTable("sourceCards", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  cardId: int("cardId").notNull(),
  passage: text("passage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ sourceCardIdx: uniqueIndex("source_card_idx").on(table.sourceId, table.cardId) }));

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  sourceText: longtext("sourceText"),
  status: mysqlEnum("status", ["draft", "generating", "generated", "exporting", "exported", "error"]).default("draft").notNull(),
  astJson: longtext("astJson"),
  validationErrors: text("validationErrors"),
  scormPackageKey: text("scormPackageKey"),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ workspaceIdx: index("course_workspace_idx").on(table.workspaceId) }));

export const modules = mysqlTable("modules", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ courseIdx: index("module_course_idx").on(table.courseId) }));

export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ moduleIdx: index("lesson_module_idx").on(table.moduleId) }));

export const learningObjectives = mysqlTable("learningObjectives", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  loId: varchar("loId", { length: 64 }).notNull(),
  text: text("text").notNull(),
  bloomVerb: varchar("bloomVerb", { length: 32 }).notNull(),
  bloomLevel: varchar("bloomLevel", { length: 32 }).notNull(),
  sourceSpans: text("sourceSpans"),
  prerequisites: text("prerequisites"),
  isVerified: boolean("isVerified").default(false).notNull(),
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ lessonIdx: index("lo_lesson_idx").on(table.lessonId), loIdIdx: uniqueIndex("lo_loid_idx").on(table.loId) }));

export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  loId: int("loId").notNull(),
  stem: text("stem").notNull(),
  optionsJson: text("optionsJson").notNull(),
  correctIndex: int("correctIndex").notNull(),
  bloomAlignment: varchar("bloomAlignment", { length: 32 }),
  status: mysqlEnum("status", ["draft", "reviewed", "approved", "rejected"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ loIdx: index("assessment_lo_idx").on(table.loId) }));

export const courseVersions = mysqlTable("courseVersions", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  version: int("version").notNull(),
  astJson: longtext("astJson"),
  changeLog: text("changeLog"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ courseVersionIdx: uniqueIndex("course_version_idx").on(table.courseId, table.version) }));

export const studentMastery = mysqlTable("student_mastery", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  lessonId: int("lessonId").notNull(),
  status: text("status").notNull().default("completed"),
  score: int("score").notNull().default(100),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, table => ({ 
  userCourseIdx: index("mastery_user_course_idx").on(table.userId, table.courseId),
  lessonIdx: uniqueIndex("mastery_lesson_idx").on(table.userId, table.lessonId) 
}));

export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  fontSize: varchar("fontSize", { length: 16 }).default("Medium").notNull(),
  editorFont: varchar("editorFont", { length: 16 }).default("Default").notNull(),
  defaultView: varchar("defaultView", { length: 32 }).default("Dashboard").notNull(),
  personalizedLearning: boolean("personalizedLearning").default(true).notNull(),
  aiSuggestions: boolean("aiSuggestions").default(true).notNull(),
  learningReminders: boolean("learningReminders").default(true).notNull(),
  weeklyProgress: boolean("weeklyProgress").default(false).notNull(),
  profileVisibility: boolean("profileVisibility").default(false).notNull(),
  cloudStorage: boolean("cloudStorage").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIdx: uniqueIndex("pref_user_idx").on(table.userId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type Canvas = typeof canvases.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type LearningObjective = typeof learningObjectives.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type CourseVersion = typeof courseVersions.$inferSelect;
export type StudentMastery = typeof studentMastery.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
