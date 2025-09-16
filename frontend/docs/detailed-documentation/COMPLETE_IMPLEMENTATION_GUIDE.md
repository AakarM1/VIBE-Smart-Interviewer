# Verbal Insights - Complete Implementation Documentation

## 📖 Page-by-Page Implementation Guide

### 🏠 Landing & Authentication Pages

#### 1. Root Landing Page (`/page.tsx`)
**Purpose**: Main entry point for candidates  
**Features**:
- Candidate dashboard with assessment options
- JDT (Job Description Test) entry point
- SJT (Situational Judgment Test) entry point
- User profile display
- Session status indicator

**Implementation Details**:
```typescript
// Key components rendered:
- PreInterviewForm for candidate details
- Assessment type selection (JDT/SJT)
- Navigation to interview pages
- Progress tracking for completed assessments
```

#### 2. Login Page (`/login/page.tsx`)
**Purpose**: User authentication  
**Features**:
- Email/password authentication
- Admin vs candidate role detection
- Automatic redirection based on role
- Error handling for invalid credentials

**Authentication Flow**:
```typescript
const handleLogin = async (email: string, password: string) => {
  const success = await login(email, password);
  if (success) {
    // Automatic redirection:
    // Admin users → /admin
    // Regular users → /
  }
}
```

#### 3. Registration Page (`/register/page.tsx`)
**Purpose**: New user account creation  
**Features**:
- Candidate information collection
- Form validation with Zod schemas
- Automatic account creation in database
- Redirection to login after successful registration

### 🎯 Assessment Pages

#### 4. JDT Interview Page (`/interview/page.tsx`)
**Purpose**: Job Description Test assessment interface  

**Core Features**:
- **Multi-modal responses**: Video, audio, or text input
- **Dynamic question generation**: Admin-configured + AI-generated
- **Real-time transcription**: Live speech-to-text
- **Progress tracking**: Question navigation and completion status
- **Time management**: Optional time limits per question

**Implementation Flow**:
```typescript
// 1. Pre-interview setup
const startInterview = async (details: PreInterviewDetails) => {
  // Load JDT configuration from database
  const savedConfig = await configurationService.getJDTConfig();
  
  // Combine manual and AI-generated questions
  const questionsToUse = [
    ...savedConfig.questions,
    ...aiGeneratedQuestions
  ];
  
  setConversationHistory(questionsToUse);
}

// 2. Answer processing
const handleAnswerSubmit = async (answer: string, videoDataUri?: string) => {
  // Save answer to conversation history
  // Move to next question
  // Trigger auto-save
}

// 3. Interview completion
const handleFinishInterview = async () => {
  // Generate basic analysis
  // Save submission to database
  // Redirect to completion message
}
```

**AI Integration**:
- **Question Generation**: `/api/ai/generate-questions`
- **Background Analysis**: Triggered from admin dashboard
- **Competency Scoring**: Based on admin-defined criteria

#### 5. SJT Assessment Page (`/sjt/page.tsx`)
**Purpose**: Situational Judgment Test interface  

**Advanced Features**:
- **Scenario-based questions**: Real workplace situations
- **Adaptive follow-up questions**: Based on answer quality
- **Response evaluation**: Real-time answer completeness assessment
- **Dynamic question flow**: AI-generated follow-ups when needed

**Key Implementation**:
```typescript
// 1. Answer evaluation and follow-up generation
const handleAnswerSubmit = async (answer: string, videoDataUri?: string) => {
  // Evaluate answer quality using AI
  const evaluation = await fetch('/api/ai/evaluate-answer', {
    method: 'POST',
    body: JSON.stringify({
      situation: currentScenario.situation,
      question: currentScenario.question,
      candidateAnswer: answer,
      bestResponseRationale: currentScenario.bestResponseRationale,
      assessedCompetency: currentScenario.assessedCompetency
    })
  });
  
  // Generate follow-up if answer incomplete
  if (!evaluation.isComplete && evaluation.followUpQuestion) {
    // Insert new follow-up question dynamically
    const newFollowUpScenario = {
      id: currentScenario.id + 1000,
      situation: currentScenario.situation,
      question: evaluation.followUpQuestion,
      // ... other properties
    };
    setSjtScenarios([...scenarios, newFollowUpScenario]);
  }
}
```

### 🔧 Admin Dashboard Pages

#### 6. Admin Dashboard (`/admin/page.tsx`)
**Purpose**: Central admin control panel  
**Features**:
- System overview statistics
- Quick access to all admin functions
- Recent submissions summary
- Configuration status indicators

#### 7. User Management (`/admin/users/page.tsx`)
**Purpose**: Candidate and admin management  
**Features**:
- User list with search and filtering
- Role assignment (admin/candidate)
- User profile editing
- Account deletion
- Password reset functionality

**Implementation**:
```typescript
const UserManagement = () => {
  const { getUsers, deleteUser, updateUser } = useAuth();
  
  // Real-time user list
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    const loadUsers = async () => {
      const userList = await getUsers();
      setUsers(userList);
    };
    loadUsers();
  }, []);
  
  // User operations
  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    // Refresh user list
  };
}
```

#### 8. JDT Configuration (`/admin/jd/page.tsx`)
**Purpose**: Job Description Test setup  

**Configuration Features**:
- **Role Management**: Define job roles with descriptions
- **Question Bank**: Manual question creation per role
- **AI Question Settings**: Configure AI-generated question limits
- **Assessment Settings**: Time limits, number of questions
- **Competency Mapping**: Link questions to specific competencies

**Data Structure**:
```typescript
interface JDTConfig {
  roles: Array<{
    roleName: string;
    jobDescription: string;
    questions: Array<{
      text: string;
      preferredAnswer: string;
      competency: string;
    }>;
  }>;
  settings: {
    numberOfQuestions: number;
    aiGeneratedQuestions: number;
    timeLimit: number;
  };
}
```

#### 9. SJT Configuration (`/admin/sjt/page.tsx`)
**Purpose**: Situational Judgment Test setup  

**Scenario Management**:
- **Situation Descriptions**: Workplace scenarios
- **Question Formulation**: Specific questions about situations
- **Response Rationale**: Best and worst response guidelines
- **Competency Assessment**: Map scenarios to competencies
- **Follow-up Settings**: Configure AI follow-up question limits

**Scenario Structure**:
```typescript
interface Scenario {
  id: number;
  situation: string;
  question: string;
  bestResponseRationale: string;
  worstResponseRationale: string;
  assessedCompetency: string;
}
```

#### 10. Submissions Review (`/admin/submissions/page.tsx`)
**Purpose**: Assessment results dashboard  

**Features**:
- **Real-time submission list**: Live updates when candidates submit
- **Filtering and search**: By test type, date, candidate
- **Status tracking**: Analysis completion status
- **Bulk operations**: Mass analysis triggering
- **Export capabilities**: Data export for external analysis

**Real-time Implementation**:
```typescript
const SubmissionsPage = () => {
  const { onSubmissionsChange } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  useEffect(() => {
    // Set up real-time listener
    onSubmissionsChange((updatedSubmissions) => {
      setSubmissions(updatedSubmissions);
    });
  }, [onSubmissionsChange]);
}
```

#### 11. Individual Report View (`/admin/report/[id]/page.tsx`)
**Purpose**: Detailed assessment analysis  

**Analysis Features**:
- **Comprehensive report display**: AI-generated analysis
- **Answer review**: Individual question responses
- **Competency breakdown**: Detailed scoring by competency
- **Manual analysis trigger**: Generate AI analysis on demand
- **Report editing**: Admin corrections to AI assessments
- **Export options**: PDF report generation

**AI Analysis Integration**:
```typescript
const generateAiAnalysis = async () => {
  const response = await fetch('/api/background-analysis', {
    method: 'POST',
    body: JSON.stringify({
      submissionId: submission.id,
      type: submission.testType.toLowerCase()
    })
  });
  
  // Poll for completion
  const checkCompletion = setInterval(async () => {
    const updated = await getSubmissionById(submission.id);
    if (updated?.report && !hasBasicAnalysis(updated.report)) {
      clearInterval(checkCompletion);
      setSubmission(updated);
    }
  }, 3000);
}
```

### 🤖 API Routes Implementation

#### 12. AI Processing Routes (`/api/ai/`)

**Route Structure**:
- `/api/ai/generate-questions`: Dynamic question generation
- `/api/ai/evaluate-answer`: SJT answer quality assessment
- `/api/ai/translate`: Multi-language support
- `/api/background-analysis`: Comprehensive analysis processing

**Background Analysis Route** (`/api/background-analysis/route.ts`):
```typescript
export async function POST(request: Request) {
  const { submissionId, type } = await request.json();
  
  if (type === 'interview') {
    // JDT analysis using analyze-conversation.ts
    const analysis = await analyzeConversation({
      conversationHistory: submission.history,
      name: submission.candidateName,
      roleCategory: "Interview Assessment",
      jobDescription: "Standard assessment criteria"
    });
  } else if (type === 'sjt') {
    // SJT analysis using analyze-sjt-response.ts
    for (const entry of submission.history) {
      const sjtAnalysis = await analyzeSJTResponse({
        situation: entry.situation,
        question: entry.question,
        bestResponseRationale: entry.bestResponseRationale,
        worstResponseRationale: entry.worstResponseRationale,
        assessedCompetency: entry.assessedCompetency,
        candidateAnswer: entry.answer
      });
    }
  }
  
  // Update submission with analysis results
  await submissionService.update(submissionId, {
    report: analysisResult,
    analysisCompleted: true,
    analysisCompletedAt: new Date()
  });
}
```

### 🧩 Component Architecture Deep Dive

#### Core Components

**1. Audio Recorder Component** (`audio-recorder.tsx`):
```typescript
interface AudioRecorderProps {
  onAudioReady: (audioDataUri: string) => void;
  onTranscriptUpdate?: (transcript: string) => void;
  mode: 'audio' | 'video';
}

// Features:
- Real-time recording with visual feedback
- Live transcription during recording
- Data URI generation for storage
- Recording quality controls
```

**2. SJT Components** (`components/sjt/`):
- **Question Card**: Scenario presentation
- **Instructions Panel**: Test guidelines
- **Timer Bar**: Visual time tracking
- **Finish Modal**: Completion confirmation

**3. Interview Components** (`components/interview/`):
- **Mode Selector**: Choose response type (video/audio/text)
- **Pre-Interview Form**: Candidate information collection

#### UI Component Library
**shadcn/ui Integration**: 22 pre-built components
- Form controls (Input, Select, Checkbox, etc.)
- Navigation (Tabs, Dropdown Menu, etc.)
- Feedback (Toast, Alert, Progress, etc.)
- Layout (Card, Separator, Sheet, etc.)

### 🔄 State Management Architecture

#### Context Providers:
1. **AuthProvider**: User authentication and session management
2. **Form State**: React Hook Form integration
3. **Toast Notifications**: User feedback system
4. **Storage Notifications**: Storage type indicators

#### State Flow:
```typescript
// Global state management through React Context
const AuthContext = createContext<AuthContextType>();

// Local component state with hooks
const [submissions, setSubmissions] = useState<Submission[]>([]);
const [isLoading, setIsLoading] = useState(false);

// Form state management
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {}
});
```

### 🛡️ Security & Error Handling

#### Authentication Security:
- **Role-based access control**: Admin vs candidate routes
- **Session management**: Persistent login state
- **Route protection**: Automatic redirection for unauthorized access

#### Error Handling Strategy:
```typescript
// Graceful fallbacks throughout the application
try {
  const result = await firestoreOperation();
  return result;
} catch (error) {
  console.error('Firestore error, falling back to localStorage:', error);
  return localStorageOperation();
}
```

#### Data Validation:
- **Zod schemas**: Type-safe form validation
- **TypeScript interfaces**: Compile-time type checking
- **Input sanitization**: XSS prevention
- **API request validation**: Server-side validation

This comprehensive implementation guide covers every major component and page in the Verbal Insights platform, providing developers with detailed understanding of the codebase architecture and implementation patterns.
