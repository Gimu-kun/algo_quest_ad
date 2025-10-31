type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

type QuestionType = 
    'multiple_choice' | 
    'fill_in_blank' | 
    'true_false' | 
    'reorder' | 
    'matching' |
    'numeric' |
    'sequence' |
    'programming';

interface Answer {
    answerId?: number;
    answerText: string;
    correct: boolean;
    answerMeta?: string | null; 
}

interface Quest {
    questId: number;
    questName: string;
}

interface Question {
    questionId: number;
    questionText: string;
    bloomLevel: BloomLevel;
    questionType: QuestionType;
    correctXpReward: number;
    quest: Quest;
    answers: Answer[];
    
    partialCredit?: number | null | undefined;
    synonyms?: string | null | undefined;
    codeTemplate?: string | null | undefined;
    testCases?: string | null | undefined;
    testResults?: string | null | undefined;
}

// DTO cho Form (Frontend)
interface QuestionFormValues {
    questId: number;
    questionText: string;
    bloomLevel: BloomLevel;
    questionType: QuestionType;
    correctXpReward: number;
    partialCredit?: number; 
    synonyms?: string;
    codeTemplate?: string; 
    testCases?: string; 
    testResults?: string; 

    answers: { 
        text: string; 
        isCorrect: boolean;
        answerMeta?: string | null;
    }[];
}

export type {BloomLevel, QuestionType, Answer, Quest, Question, QuestionFormValues}