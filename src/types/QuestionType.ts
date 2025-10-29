type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'reorder';



interface Answer {
    answerId?: number;
    answerText: string;
    correct: boolean;
    answerMeta?: string | null;
}

interface Quest {
    questId: number;
    questName: string;
    // ... các trường khác của Quest nếu cần
}

interface Question {
    questionId: number;
    questionText: string;
    bloomLevel: BloomLevel;
    questionType: QuestionType;
    correctXpReward: number;
    quest: Quest; // Đảm bảo có Quest object để hiển thị tên Quest
    answers: Answer[];
}

// DTO cho Form (Frontend)
interface QuestionFormValues {
    questId: number;
    questionText: string;
    bloomLevel: BloomLevel;
    questionType: QuestionType;
    correctXpReward: number;
    answers: { 
        text: string; 
        isCorrect: boolean;
        answerMeta?: string | null;
    }[];
}

export type {BloomLevel, QuestionType, Answer, Quest, Question, QuestionFormValues}