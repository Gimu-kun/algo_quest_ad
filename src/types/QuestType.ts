type QuestType = 'quiz' | 'puzzle';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Topic {
    topicId: number;
    topicName: string;
    description?: string;
    orderIndex?: number;
    quests?: Quest[];
}

interface Quest {
    questId: number;
    questName: string;
    questType: QuestType;
    difficulty: Difficulty;
    requiredXp: number;
    topic: Omit<Topic, 'quests' | 'description' | 'orderIndex'>;
    questions?: any[]; 
}

interface NestedTopic extends Omit<Topic, 'quests'> {
    quests: Quest[];
}

interface QuestFormValues {
    questName: string;
    questType: QuestType;
    difficulty: Difficulty;
    requiredXp: number;
    topicId: number; 
}

export type { QuestType, Difficulty, Topic, Quest, NestedTopic, QuestFormValues };