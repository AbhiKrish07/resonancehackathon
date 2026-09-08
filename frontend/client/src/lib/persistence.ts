import { DarwinityState, Space, Page, Course, BlockNode } from "@/types/darwinity";

const STORAGE_KEY = "darwinity-prototype-state";

export const initialSpaces: Space[] = [
  {
    id: "biology",
    name: "Biology Revision",
    icon: "🧬",
    color: "#e9f1e8",
    description: "Cell biology, genetics, and exam preparation.",
    pageIds: ["biology-overview", "cell-biology", "biology-questions"],
    sourceIds: ["campbell-chapter-4"],
    courseIds: ["cellular-biology"],
    archived: false,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-07T10:20:00.000Z",
  },
  {
    id: "startup",
    name: "Startup Ideas",
    icon: "🚀",
    color: "#eef0fa",
    description: "Product ideas, user research, and build notes.",
    pageIds: ["startup-overview", "product-ideas"],
    sourceIds: [],
    courseIds: [],
    archived: false,
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-06T16:45:00.000Z",
  }
];

export const initialPages: Page[] = [
  {
    id: "biology-overview",
    spaceId: "biology",
    title: "Biology Overview",
    icon: "📚",
    favorite: true,
    archived: false,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-07T10:20:00.000Z",
  },
  {
    id: "cell-biology",
    spaceId: "biology",
    parentId: "biology-overview",
    title: "Cell Biology Notes",
    icon: "🔬",
    favorite: false,
    archived: false,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-07T10:20:00.000Z",
  },
  {
    id: "startup-overview",
    spaceId: "startup",
    title: "Startup Overview",
    icon: "🚀",
    favorite: false,
    archived: false,
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-06T16:45:00.000Z",
  }
];

export const initialBlocks: BlockNode[] = [
  { id: "b1", pageId: "biology-overview", parentId: null, type: "heading", content: { text: "Biology Final Revision" }, order: 1 },
  { id: "b2", pageId: "biology-overview", parentId: null, type: "paragraph", content: { text: "This space contains all notes for the final exam." }, order: 2 },
  { id: "b3", pageId: "biology-overview", parentId: null, type: "todo", content: { text: "Review Campbell Chapter 4", checked: true }, order: 3 },
  { id: "b4", pageId: "biology-overview", parentId: null, type: "todo", content: { text: "Complete practice questions", checked: false }, order: 4 },
  
  { id: "b5", pageId: "cell-biology", parentId: null, type: "heading", content: { text: "The Cell Cycle" }, order: 1 },
  { id: "b6", pageId: "cell-biology", parentId: null, type: "paragraph", content: { text: "Interphase (G1, S, G2) and Mitotic Phase." }, order: 2 },
  { id: "b7", pageId: "cell-biology", parentId: null, type: "callout", content: { text: "Remember: S phase is where DNA replication occurs." }, order: 3 },
  
  { id: "b8", pageId: "startup-overview", parentId: null, type: "heading", content: { text: "Idea Generation" }, order: 1 },
  { id: "b9", pageId: "startup-overview", parentId: null, type: "paragraph", content: { text: "Building an AI tool for semantic learning." }, order: 2 }
];

export const initialCourses: Course[] = [
  {
    id: "cellular-biology",
    title: "Cellular Biology: How Life Organizes Itself",
    description: "Understanding the building blocks of life, from organelles to energy systems.",
    spaceId: "biology",
    icon: "🦠",
    accent: "#4a8f6b",
    progress: 80,
    currentLessonId: "l3",
    totalLessons: 3,
    completedLessons: 2,
    status: "active",
    nextAction: "Resume",
    updatedAt: "2026-09-07T10:20:00.000Z",
    learningGoal: "Understand the structure and function of cells.",
    estimatedMinutes: 120,
    readiness: 72,
    sourceIds: ["campbell-chapter-4"],
    modules: [
      {
        id: "m1",
        title: "Foundations of the Cell",
        description: "Basic structure and function",
        lessonIds: ["l1", "l2", "l3"]
      }
    ],
    lessons: [
      {
        id: "l1",
        title: "What makes a cell alive?",
        objective: "Define the characteristics of a living cell.",
        estimatedMinutes: 5,
        difficulty: "beginner",
        status: "complete",
        sourceIds: [],
        hasAssessment: false,
        blocks: [
           { id: "lb1", type: "explanation", content: "Cells are the basic unit of life." }
        ]
      },
      {
        id: "l2",
        title: "Cell membranes and transport",
        objective: "Explain how the phospholipid bilayer controls what enters and leaves a cell.",
        estimatedMinutes: 8,
        difficulty: "intermediate",
        status: "complete",
        sourceIds: ["campbell-chapter-4"],
        hasAssessment: true,
        blocks: [
          { id: "lb2", type: "explanation", content: "Cells maintain a stable internal environment by controlling movement across the membrane." }
        ]
      },
      {
        id: "l3",
        title: "The language of organelles",
        objective: "Identify major organelles.",
        estimatedMinutes: 10,
        difficulty: "intermediate",
        status: "ready",
        sourceIds: [],
        hasAssessment: false,
        blocks: [
           { id: "lb3", type: "explanation", content: "Organelles perform specific functions within the cell." }
        ]
      }
    ]
  }
];

export const initialState: DarwinityState = {
  spaces: initialSpaces,
  pages: initialPages,
  courses: initialCourses,
  blocks: initialBlocks,
  attributes: [],
  values: [],
  activeSpaceId: null,
  activePageId: null,
  activeCourseId: null,
};

export function loadDarwinityState(): DarwinityState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    const parsed = JSON.parse(raw) as DarwinityState;
    // ensure all default fields exist
    return {
       ...initialState,
       ...parsed,
       blocks: parsed.blocks || initialState.blocks,
       attributes: parsed.attributes || [],
       values: parsed.values || [],
    };
  } catch {
    return initialState;
  }
}

export function saveDarwinityState(state: DarwinityState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
