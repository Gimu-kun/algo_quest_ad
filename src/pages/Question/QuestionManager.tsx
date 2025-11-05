import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
    Popconfirm,
    Card,
    Space,
    Tag,
    Select,
    Spin,
    Radio,
    Row,
    Col,
    Divider,
    Tooltip,
    Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined, FireOutlined, CheckCircleOutlined, CloseCircleOutlined, SnippetsOutlined, ExceptionOutlined, CodeOutlined, MenuOutlined, ExclamationCircleOutlined, SaveOutlined, SortAscendingOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import type { Answer, BloomLevel, Quest, Question, QuestionFormValues, QuestionType } from '../../types/QuestionType';
import MathInputPreview from '../../components/ui/MathInput/MathInputPreview';
import { InlineMath } from 'react-katex';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import React from 'react';
import type { OrderItem } from '../../types/OrderType';
import { HTML5Backend } from 'react-dnd-html5-backend';

const { TextArea } = Input;

const latexSymbols = [
    { label: '\\frac{a}{b}', latex: '\\frac{}{}', tooltip: 'Phân số (\\frac)' },
    { label: 'a^{b}', latex: '^{}', tooltip: 'Mũ/Số mũ (a^b)' },
    { label: 'a_{b}', latex: '_{}', tooltip: 'Chỉ số dưới (a_b)' },
    { label: '\\sqrt{a}', latex: '\\sqrt{}', tooltip: 'Căn bậc hai (\\sqrt)' },
    { label: '\\sum', latex: '\\sum_{i=1}^{n}', tooltip: 'Tổng (\\sum)' },
    { label: '\\int', latex: '\\int_{a}^{b}', tooltip: 'Tích phân (\\int)' },
    { label: '\\alpha', latex: '\\alpha', tooltip: 'Ký hiệu Alpha (\\alpha)' },
    { label: '±', latex: '\\pm', tooltip: 'Cộng trừ (\\pm)' },
];

const BloomLevels = {
    REMEMBER: 'remember' as BloomLevel,
    UNDERSTAND: 'understand' as BloomLevel,
    APPLY: 'apply' as BloomLevel,
    ANALYZE: 'analyze' as BloomLevel,
    EVALUATE: 'evaluate' as BloomLevel,
    CREATE: 'create' as BloomLevel,
};

const QuestionTypes = {
    MULTIPLE_CHOICE: 'multiple_choice' as QuestionType,
    FILL_IN_BLANK: 'fill_in_blank' as QuestionType,
    TRUE_FALSE: 'true_false' as QuestionType,
    REORDER: 'reorder' as QuestionType,
    MATCHING: 'matching' as QuestionType,
    NUMERIC: 'numeric' as QuestionType,
    SEQUENCE: 'sequence' as QuestionType,
    PROGRAMMING: 'programming' as QuestionType,
    CODE_SNIPPET: 'code_snippet' as QuestionType
};

// --- CONFIGURATION ---

const API_QUESTION_URL = 'http://localhost:8082/api/questions';
const API_QUEST_URL = 'http://localhost:8082/api/quests'; 
const QUESTION_ORDER_API_URL = 'http://localhost:8082/api/content/order/questions';

const QUESTION_DND_TYPE = 'DraggableQuestionRow';

interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    index: number;
    moveRow: (dragIndex: number, hoverIndex: number) => void;
    className: string; 
    style: React.CSSProperties;
    'data-handler-id'?: string | undefined; 
}

const DraggableQuestionRow: React.FC<DraggableRowProps> = ({ index, moveRow, className, style, ...restProps }) => {
    // ... (Thân hàm giữ nguyên, chỉ đảm bảo `accept` và `type` là QUESTION_DND_TYPE) ...
    const ref = React.useRef<HTMLTableRowElement>(null);
    
    const [{ handlerId }, drop] = useDrop<{ index: number; type: string }, unknown, { handlerId: string | symbol | null }>({
        accept: QUESTION_DND_TYPE, 
        collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
        hover(item, monitor) {
            // ... Logic kéo thả
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: QUESTION_DND_TYPE, 
        item: () => ({ index }),
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    drag(drop(ref));

    const opacity = isDragging ? 0.2 : 1;

    return (
        <tr
            ref={ref}
            className={className}
            style={{ ...style, cursor: 'grab', opacity }} 
            data-handler-id={handlerId as string | undefined} 
            {...restProps}
        />
    );
};


const LatexDisplayInTable: React.FC<{ text: string }> = ({ text }) => {
    // Tách nội dung LaTeX $...$ hoặc sử dụng toàn bộ nếu thấy có lệnh
    const inlineMatch = text.match(/\$(.*?)\$/);
    const contentToRender = inlineMatch ? inlineMatch[1].trim() : (text.includes('\\') ? text : null);

    if (contentToRender) {
        try {
            // Cố gắng render nội dung LaTeX
            return (
                <Tooltip title={text}>
                    <div className="max-w-[250px] truncate overflow-hidden text-lg font-serif">
                        <InlineMath math={contentToRender} />
                        {!inlineMatch && text.length > 30 ? '...' : ''} {/* Thêm ... nếu nội dung dài */}
                    </div>
                </Tooltip>
            );
        } catch (e) {
            // Nếu có lỗi parse LaTeX, hiển thị dưới dạng văn bản (và rút gọn)
            return (
                <Tooltip title={`Lỗi LaTeX: ${text}`}>
                    <Tag color="red" className="truncate max-w-[250px] block" title={text}>
                         [Lỗi] {text.length > 40 ? text.substring(0, 40) + '...' : text}
                    </Tag>
                </Tooltip>
            );
        }
    }
    
    // Mặc định: Hiển thị văn bản thường, rút gọn
    return (
        <Tooltip title={text}>
            <span className="max-w-[250px] truncate inline-block" title={text}>
                {text.length > 50 ? text.substring(0, 50) + '...' : text}
            </span>
        </Tooltip>
    );
};


// --- UTILITIES & FORMATTING ---

const formatBloomLevel = (level: BloomLevel) => {
    switch (level) {
        case BloomLevels.REMEMBER: return <Tag color="blue">Nhớ</Tag>;
        case BloomLevels.UNDERSTAND: return <Tag color="green">Hiểu</Tag>;
        case BloomLevels.APPLY: return <Tag color="gold">Vận dụng</Tag>;
        case BloomLevels.ANALYZE: return <Tag color="volcano">Phân tích</Tag>;
        default: return <Tag>{level}</Tag>;
    }
}

const formatQuestionType = (type: QuestionType) => {
    switch (type) {
        case QuestionTypes.MULTIPLE_CHOICE: return <Tag color="purple">Trắc nghiệm</Tag>;
        case QuestionTypes.FILL_IN_BLANK: return <Tag color="cyan">Điền vào chỗ trống</Tag>;
        case QuestionTypes.TRUE_FALSE: return <Tag color="orange">Đúng/Sai</Tag>;
        case QuestionTypes.MATCHING: return <Tag color="magenta">Ghép cặp</Tag>;
        case QuestionTypes.NUMERIC: return <Tag color="lime">Điền số</Tag>;
        case QuestionTypes.SEQUENCE: return <Tag color="geekblue">Điền dãy số</Tag>;
        case QuestionTypes.PROGRAMMING: return <Tag color="black">Lập trình</Tag>;
        default: return <Tag>{type}</Tag>;
    }
}

const getDefaultAnswers = (): Answer[] => [
    { answerText: '', correct: false },
    { answerText: '', correct: false },
    { answerText: '', correct: false },
    { answerText: '', correct: true },
];

const DynamicAnswerFields = ({ form, currentQuestionType }: { form: any, currentQuestionType: QuestionType | undefined }) => {
    
    if (!currentQuestionType) return null;

    // --- CASE 1: MULTIPLE_CHOICE (Giữ nguyên) ---
    if (currentQuestionType === QuestionTypes.MULTIPLE_CHOICE) {
        return (
            <>
                <Divider orientation="left">Danh sách Câu trả lời (Trắc nghiệm)</Divider>
                <Form.Item
                    name="partialCredit"
                    label="Điểm thưởng một phần (Partial Credit)"
                    tooltip="Phần trăm XP nhận được nếu chỉ trả lời đúng một số cặp (0-100)"
                    rules={[{ required: true, message: 'Nhập giá trị Partial Credit!' }]}
                >
                    <InputNumber <number>
                        min={0} 
                        max={100} 
                        formatter={value => `${value}%`} 
                        parser={value => parseInt(value?.replace('%', '') ?? '0', 10)} 
                        className="w-full" 
                    />
                </Form.Item>
                <Form.List name="answers" rules={[
                    { 
                        validator: async (_, answers) => {
                            if (!answers || answers.length < 2) {
                                return Promise.reject(new Error('Cần ít nhất 2 câu trả lời.'));
                            }
                            const correctCount = answers.filter((ans: any) => ans && ans.isCorrect).length;
                            if (correctCount !== 1) {
                                return Promise.reject(new Error('Phải có chính xác 1 câu trả lời đúng.'));
                            }
                        },
                    }
                ]}>
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, fieldKey, ...restField }, index) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline" className="w-full">
                                    
                                    {/* Input Text */}
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'text']}
                                        fieldKey={[fieldKey as number, 'text']}
                                        rules={[{ required: true, message: 'Nhập nội dung trả lời' }]}
                                        style={{ flexGrow: 1, marginRight: '8px' }}
                                    >
                                        <MathInputPreview
                                        rows={3}
                                        placeholder={`Nội dung Đáp án ${index + 1}`}
                                    />
                                    </Form.Item>
                                    
                                    {/* Radio Button for Correctness */}
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'isCorrect']}
                                        fieldKey={[fieldKey as number, 'isCorrect']}
                                        valuePropName="checked"
                                        noStyle
                                    >
                                        <Radio.Button 
                                            value={true} 
                                            onClick={() => { // Đảm bảo chỉ có 1 nút được check
                                                // Lấy tất cả giá trị answers hiện tại
                                                const answers = form.getFieldValue('answers');
                                                // Tạo mảng mới với tất cả isCorrect là false, trừ phần tử hiện tại
                                                const newAnswers = answers.map((ans: any, i: number) => ({
                                                    ...ans,
                                                    isCorrect: i === index ? true : false,
                                                }));
                                                // Set lại giá trị cho form
                                                form.setFieldsValue({ answers: newAnswers });
                                            }}
                                            className={`transition duration-150 ease-in-out ${form.getFieldValue(['answers', name, 'isCorrect']) ? 'bg-green-100 border-green-500' : 'hover:bg-gray-100'}`}
                                        >
                                            <CheckCircleOutlined className={form.getFieldValue(['answers', name, 'isCorrect']) ? 'text-green-600' : 'text-gray-400'} />
                                        </Radio.Button>
                                    </Form.Item>
                                    
                                    {/* Delete Button */}
                                    {fields.length > 2 ? (
                                        <Button
                                            onClick={() => remove(name)}
                                            icon={<DeleteOutlined />}
                                            danger
                                        />
                                    ) : null}
                                </Space>
                            ))}

                            <Form.Item>
                                <Button type="dashed" onClick={() => add({ text: '', isCorrect: false })} block icon={<PlusOutlined />}>
                                    Thêm Câu trả lời
                                </Button>
                            </Form.Item>
                            <Form.Item className="mt-2">
                                <p className="text-sm text-gray-500">
                                    <span className="font-semibold text-red-500">*</span> Lưu ý: Cần có ít nhất 2 câu trả lời và chỉ có **một** câu trả lời đúng.
                                </p>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            </>
        );
    }
    
    // --- CASE 2: FILL_IN_BLANK (Giữ nguyên) ---
    if (currentQuestionType === QuestionTypes.FILL_IN_BLANK) {
        return (
            <>
                <Divider orientation="left">Câu trả lời Chính xác (Điền khuyết)</Divider>
                <Form.List name="answers">
                    {(fields, { add, remove }) => {
                        if (fields.length === 0) {
                            add({ text: '', isCorrect: true }, 0); 
                        }
                        
                        return (
                            <div className="flex flex-col gap-2">
                                <Form.Item
                                    name={[0, 'text']} 
                                    label="Nội dung Đáp án"
                                    rules={[{ required: true, message: 'Vui lòng nhập đáp án chính xác!' }]}
                                >
                                    <Input 
                                        placeholder="Nhập câu trả lời chính xác tại đây..." 
                                        prefix={<CheckCircleOutlined className="text-green-500 mr-2" />}
                                    />
                                </Form.Item>
                                <Form.Item 
                                    name={[0, 'isCorrect']} 
                                    initialValue={true} 
                                    hidden
                                >
                                    <Input type="hidden" />
                                </Form.Item>
                                <p className="text-sm text-gray-500 mt-[-10px]">
                                    <span className="font-semibold text-red-500">*</span> Đây là câu trả lời duy nhất và chính xác.
                                </p>
                            </div>
                        );
                    }}
                </Form.List>
                <Form.Item 
                    name="synonyms"
                    label="Các từ đồng nghĩa/Đáp án thay thế (Phân cách bằng dấu phẩy)"
                >
                    <Input.TextArea rows={2} placeholder="Ví dụ: hàng đợi,hàng đợi ưu tiên" />
                </Form.Item>
            </>
        );
    }

    // --- CASE 3: TRUE_FALSE (Đúng/Sai) ---
    if (currentQuestionType === QuestionTypes.TRUE_FALSE) {
        return (
            <>
                <Divider orientation="left">Đáp án Đúng/Sai</Divider>
                <Form.List name="answers">
                    {(fields, { add, remove }) => {
                        // Đảm bảo luôn có 1 trường với text là 'True' hoặc 'False'
                        if (fields.length === 0) {
                            add({ text: 'True', isCorrect: true }, 0); 
                        }

                        // Giá trị mặc định là `true` (đúng)
                        const isCorrectValue = form.getFieldValue(['answers', 0, 'isCorrect']);
                        
                        return (
                            <div className="flex flex-col gap-2">
                                <Form.Item
                                    name={[0, 'isCorrect']}
                                    label="Câu trả lời Chính xác"
                                    rules={[{ required: true, message: 'Vui lòng chọn đáp án!' }]}
                                    valuePropName="value"
                                >
                                    <Radio.Group buttonStyle="solid" className="w-full">
                                        <Radio.Button 
                                            value={true} 
                                            className="w-1/2 text-center"
                                            onClick={() => {
                                                form.setFieldsValue({ answers: [{ text: 'True', isCorrect: true }] });
                                            }}
                                        >
                                            <CheckCircleOutlined /> Đúng
                                        </Radio.Button>
                                        <Radio.Button 
                                            value={false} 
                                            className="w-1/2 text-center"
                                            onClick={() => {
                                                form.setFieldsValue({ answers: [{ text: 'False', isCorrect: false }] });
                                            }}
                                        >
                                            <CloseCircleOutlined /> Sai
                                        </Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                                <Form.Item 
                                    name={[0, 'text']} 
                                    initialValue={isCorrectValue ? 'True' : 'False'} 
                                    hidden
                                >
                                    <Input type="hidden" />
                                </Form.Item>
                            </div>
                        );
                    }}
                </Form.List>
            </>
        );
    }
    
    // --- CASE 4: NUMERIC (Điền số) ---
    if (currentQuestionType === QuestionTypes.NUMERIC) {
        return (
            <>
                <Divider orientation="left">Đáp án Số học</Divider>
                <Form.List name="answers">
                    {(fields, { add, remove }) => {
                        if (fields.length === 0) {
                            add({ text: '0', isCorrect: true }, 0); 
                        }
                        
                        return (
                            <div className="flex flex-col gap-2">
                                <Form.Item
                                    name={[0, 'text']}
                                    label="Giá trị Chính xác"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập giá trị số chính xác!' },
                                        { pattern: /^-?\d*(\.\d+)?$/, message: 'Phải là một giá trị số hợp lệ!' }
                                    ]}
                                >
                                    <Input 
                                        placeholder="Ví dụ: 123.45" 
                                        prefix={<FireOutlined className="text-gold-500 mr-2" />}
                                        type="number"
                                    />
                                </Form.Item>
                                <Form.Item 
                                    name={[0, 'isCorrect']} 
                                    initialValue={true} 
                                    hidden
                                >
                                    <Input type="hidden" />
                                </Form.Item>
                                <p className="text-sm text-gray-500 mt-[-10px]">
                                    <span className="font-semibold text-red-500">*</span> Nhập giá trị số học chính xác (có thể là số nguyên hoặc số thập phân).
                                </p>
                            </div>
                        );
                    }}
                </Form.List>
            </>
        );
    }
    
    // --- CASE 5: MATCHING (Ghép cặp) ---
    if (currentQuestionType === QuestionTypes.MATCHING) {
        return (
            <>
                <Divider orientation="left">Danh sách Cặp Ghép (Đúng)</Divider>
                <Form.Item
                    name="partialCredit"
                    label="Điểm thưởng một phần (Partial Credit)"
                    tooltip="Phần trăm XP nhận được nếu chỉ trả lời đúng một số cặp (0-100)"
                    rules={[{ required: true, message: 'Nhập giá trị Partial Credit!' }]}
                >
                    <InputNumber <number>
                        min={0} 
                        max={100} 
                        formatter={value => `${value}%`} 
                        parser={value => parseInt(value?.replace('%', '') ?? '0', 10)} 
                        className="w-full" 
                    />
                </Form.Item>
                <Form.List name="answers" rules={[
                    { validator: async (_, answers) => {
                        if (!answers || answers.length < 2) {
                            return Promise.reject(new Error('Cần ít nhất 2 cặp ghép.'));
                        }
                    }}
                ]}>
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, fieldKey, ...restField }, index) => (
                                <Row key={key} gutter={16} className="mb-2 items-center">
                                    <Col span={10}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'text']}
                                            fieldKey={[fieldKey as number, 'text']}
                                            rules={[{ required: true, message: 'Nhập Mục A' }]}
                                            className="mb-0"
                                        >
                                            <Input placeholder={`Mục A ${index + 1}`} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={10}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'answerMeta']} // Dùng answerMeta
                                            fieldKey={[fieldKey as number, 'answerMeta']}
                                            rules={[{ required: true, message: 'Nhập Mục B' }]}
                                            className="mb-0"
                                        >
                                            <Input placeholder={`Mục B (Đáp án của A)`} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={4}>
                                        {fields.length > 2 ? (
                                            <Button
                                                onClick={() => remove(name)}
                                                icon={<DeleteOutlined />}
                                                danger
                                            />
                                        ) : null}
                                    </Col>
                                    {/* Thêm trường 'correct' (DTO gọi là 'correct', Form gọi là 'isCorrect') */}
                                    <Form.Item name={[name, 'isCorrect']} initialValue={true} hidden><Input type="hidden" /></Form.Item> 
                                </Row>
                            ))}
                            <Form.Item className="mt-2">
                                <Button type="dashed" onClick={() => add({ text: '', answerMeta: '' })} block icon={<PlusOutlined />}>
                                    Thêm Cặp Ghép
                                </Button>
                            </Form.Item>
                            <p className="text-sm text-gray-500 mt-[-10px]">
                                <span className="font-semibold text-red-500">*</span> Mỗi dòng là một cặp **(Mục A, Mục B)** đúng. Cần ít nhất 2 cặp.
                            </p>
                        </>
                    )}
                </Form.List>
            </>
        );
    }
    
    // --- CASE 6: SEQUENCE (Điền dãy số) ---
    if (currentQuestionType === QuestionTypes.SEQUENCE) {
        return (
            <>
                <Divider orientation="left">Đáp án Chuỗi số Chính xác</Divider>
                <Form.List name="answers">
                    {(fields, { add, remove }) => {
                        // Đảm bảo luôn có 1 trường
                        if (fields.length === 0) {
                            add({ text: '', isCorrect: true }, 0); 
                        }
                        
                        return (
                            <div className="flex flex-col gap-2">
                                <Form.Item
                                    name={[0, 'text']}
                                    label="Chuỗi số Chính xác (Phân cách bằng dấu phẩy)"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập chuỗi số chính xác!' },
                                        { 
                                            // Regex chấp nhận số nguyên, số thập phân, dấu âm, và phân cách bằng dấu phẩy (có thể có khoảng trắng)
                                            pattern: /^(\s*-?\d+(\.\d+)?\s*)(,\s*-?\d+(\.\d+)?\s*)*$/, 
                                            message: 'Chuỗi số không hợp lệ. Vui lòng sử dụng định dạng: 2, 5.5, -6' 
                                        }
                                    ]}
                                >
                                    <Input.TextArea rows={2}
                                        placeholder="Ví dụ: 2, 5, 6, 8 hoặc 1.5, -2.5, 3" 
                                    />
                                </Form.Item>
                                {/* Trường ẩn isCorrect=true */}
                                <Form.Item 
                                    name={[0, 'isCorrect']} 
                                    initialValue={true} 
                                    hidden
                                >
                                    <Input type="hidden" />
                                </Form.Item>
                                <p className="text-sm text-gray-500 mt-[-10px]">
                                    <span className="font-semibold text-red-500">*</span> Câu trả lời đúng là chuỗi số được nhập ở đây, phải khớp chính xác thứ tự và giá trị (không tính khoảng trắng thừa).
                                </p>
                            </div>
                        );
                    }}
                </Form.List>
            </>
        );
    }

    if (currentQuestionType === QuestionTypes.PROGRAMMING) {
        return (
            <>
                <Divider orientation="left">Cấu hình Bài toán Lập trình</Divider>
                <Form.Item
                    name="codeTemplate" // <<< TRƯỜNG MỚI: codeTemplate
                    label={<> <CodeOutlined /> Code Mẫu (Template)</>}
                    tooltip="Hàm/class/interface mẫu để người dùng điền code vào."
                    rules={[{ required: true, message: 'Vui lòng cung cấp code mẫu!' }]}
                >
                    <Input.TextArea 
                        rows={6}
                        placeholder="Ví dụ: def solve(a: int, b: int) -> int:\n    # Viết code của bạn ở đây\n    pass" 
                        className="font-mono text-sm"
                    />
                </Form.Item>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="testCases" // <<< TRƯỜNG MỚI: testCases
                            label={<> <SnippetsOutlined /> Test Cases (JSON Input)</>}
                            tooltip="Mảng JSON chứa các bộ dữ liệu đầu vào. Ví dụ: [{'input': [1, 2]}, {'input': [10, -5}]]."
                            rules={[{ required: true, message: 'Vui lòng cung cấp Test Cases!' }]}
                        >
                            <Input.TextArea 
                                rows={4}
                                placeholder='[{"input": [1, 2], "expected_output": 3}, {"input": [10, -5], "expected_output": 5}]'
                                className="font-mono text-xs"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="testResults" // <<< TRƯỜNG MỚI: testResults
                            label={<> <ExceptionOutlined /> Test Results (JSON Output)</>}
                            tooltip="Mảng JSON chứa các kết quả đầu ra mong đợi tương ứng với Test Cases. Ví dụ: [3, 5, 0] hoặc [true, false]."
                            rules={[{ required: true, message: 'Vui lòng cung cấp Kết quả mong đợi!' }]}
                        >
                            <Input.TextArea 
                                rows={4}
                                placeholder='[3, 5]' 
                                className="font-mono text-xs"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <p className="text-sm text-gray-500 mt-[-10px]">
                    <span className="font-semibold text-red-500">*</span> Đối với loại **Lập trình**, không cần nhập phần Answers.
                </p>
            </>
        );
    }

    // --- CASE 8 & 9: REORDER & CODE_SNIPPET (Tạm thời dùng mặc định) ---
    // REORDER có thể dùng partialCredit, nhưng để đơn giản hóa, ta chỉ thêm trường partialCredit vào Form chính.
    return (
        <Card className="mt-4 border-dashed border-gray-300">
            <p className="text-center text-gray-500">
                <QuestionCircleOutlined className="mr-2" /> 
                Loại **{currentQuestionType}** không cần cấu hình đáp án đặc biệt hoặc giao diện nhập chưa được triển khai.
            </p>
        </Card>
    );
};

// --- MAIN COMPONENT ---

export default function QuestionManager() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [form] = Form.useForm<QuestionFormValues>();
    const currentQuestionType = Form.useWatch('questionType', form);
    const [selectedQuestForOrder, setSelectedQuestForOrder] = useState<number | undefined>(undefined);
    const [questionsForOrdering, setQuestionsForOrdering] = useState<Question[]>([]);
    const [originalQuestionsOrder, setOriginalQuestionsOrder] = useState<Question[]>([]);
    const [isSavingQuestionOrder, setIsSavingQuestionOrder] = useState(false);
    const [isLoadingOrderData, setIsLoadingOrderData] = useState(false);

    // --- FETCH DATA ---

    const fetchQuests = useCallback(async () => {
        try {
            // Lấy danh sách Quest chỉ với ID và Name để dùng trong Select
            const response = await axios.get<Quest[]>(API_QUEST_URL);
            setQuests(response.data);
        } catch (error) {
            console.error("Error fetching quests:", error);
            message.error('Không thể tải danh sách Quest.');
        }
    }, []);
    
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<Question[]>(API_QUESTION_URL);
            const sortedQuestions = response.data.sort((a, b) => {
                if (a.quest.questId !== b.quest.questId) {
                    return a.quest.questId - b.quest.questId;
                }
                return (a.orderIndex || 0) - (b.orderIndex || 0); 
            });
            setQuestions(sortedQuestions);

            console.log(response)
        } catch (error) {
            console.error("Error fetching questions:", error);
            message.error('Không thể tải danh sách Câu hỏi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedQuestForOrder && questions.length > 0) {
            setIsLoadingOrderData(true);
            const filtered = questions
                .filter(q => q.quest.questId === selectedQuestForOrder)
                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)); 
            
            setQuestionsForOrdering(filtered);
            setOriginalQuestionsOrder(filtered); 
            setIsLoadingOrderData(false);
        } else {
            setQuestionsForOrdering([]);
            setOriginalQuestionsOrder([]);
        }
    }, [selectedQuestForOrder, questions]);

    useEffect(() => {
        fetchQuestions();
        fetchQuests();
    }, [fetchQuestions, fetchQuests]);

    const moveQuestionRow = useCallback((dragIndex: number, hoverIndex: number) => {
        const dragQuestion = questionsForOrdering[dragIndex];
        const newQuestions = [...questionsForOrdering];
        
        newQuestions.splice(dragIndex, 1);
        newQuestions.splice(hoverIndex, 0, dragQuestion);

        setQuestionsForOrdering(newQuestions);
    }, [questionsForOrdering]);

    const hasQuestionOrderChanged = useMemo(() => {
        if (questionsForOrdering.length !== originalQuestionsOrder.length) return false;
        for (let i = 0; i < questionsForOrdering.length; i++) {
            if (questionsForOrdering[i].questionId !== originalQuestionsOrder[i].questionId) {
                return true;
            }
        }
        return false;
    }, [questionsForOrdering, originalQuestionsOrder]);

    const saveQuestionOrder = async () => {
        if (!hasQuestionOrderChanged || !selectedQuestForOrder) {
            message.info('Thứ tự Question chưa thay đổi hoặc chưa chọn Quest.');
            return;
        }
        
        setIsSavingQuestionOrder(true);
        
        try {
            const orderItems: OrderItem[] = questionsForOrdering.map((question, index) => ({
                id: question.questionId,
                orderIndex: index + 1,
            }));
            
            const payload = { items: orderItems };
            
            await axios.put(QUESTION_ORDER_API_URL, payload);

            // Cập nhật state nội bộ
            const updatedQuestionsForOrdering = questionsForOrdering.map((q, index) => ({ ...q, orderIndex: index + 1 }));
            setQuestionsForOrdering(updatedQuestionsForOrdering);
            setOriginalQuestionsOrder(updatedQuestionsForOrdering);
            
            // Cập nhật state chính
            setQuestions(prevQuestions => 
                prevQuestions.map(q => {
                    const updatedQ = updatedQuestionsForOrdering.find(uQ => uQ.questionId === q.questionId);
                    return updatedQ ? { ...q, orderIndex: updatedQ.orderIndex } : q;
                })
            );

            message.success('Thứ tự Questions đã được cập nhật trên server!');
        } catch (error) {
            console.error("Error saving question order:", error);
            message.error('Lỗi: Không thể lưu thứ tự Questions. Kiểm tra kết nối API.');
        } finally {
            setIsSavingQuestionOrder(false);
        }
    };

    // --- CRUD HANDLERS ---

    const handleSave = async (values: QuestionFormValues) => {
        console.log("values", values);
    setLoading(true);

    let answersDto: Answer[] = [];
    let partialCredit: number | null = values.partialCredit || null; // Lấy partialCredit cho tất cả
    let synonyms: string | null = null;
    let codeTemplate: string | null = null;
    let testCases: string | null = null;
    let testResults: string | null = null;

    // Chuyển đổi format Answers và lấy các trường phụ dựa trên QuestionType
    switch (values.questionType) {
        
        // Nhóm 1: Không có đáp án trong bảng Answers
        case QuestionTypes.PROGRAMMING:
            codeTemplate = values.codeTemplate || null;
            testCases = values.testCases || null;
            testResults = values.testResults || null;
            answersDto = []; // Luôn là mảng rỗng
            break;

        // Nhóm 2: Các loại có MỘT đáp án (và đó PHẢI là đáp án đúng)
        case QuestionTypes.FILL_IN_BLANK:
            synonyms = values.synonyms || null; // Chỉ FILL_IN_BLANK có synonyms
            // (Tiếp tục logic bên dưới)
        case QuestionTypes.NUMERIC:
        case QuestionTypes.SEQUENCE:
            const mainAnswer = values.answers?.[0];
            if (mainAnswer) {
                let answerText = mainAnswer.text;
                
                // Xử lý riêng cho SEQUENCE (xóa khoảng trắng)
                if (values.questionType === QuestionTypes.SEQUENCE) {
                    answerText = answerText.replace(/\s/g, '');
                }

                answersDto = [{
                    answerText: answerText,
                    correct: true, // Lỗi của bạn ở đây: Luôn là TRUE cho các loại này
                    answerMeta: mainAnswer.answerMeta || null
                }];
            } else {
                answersDto = [];
            }
            break;

        // Nhóm 3: Ghép cặp (Tất cả đều là đáp án đúng)
        case QuestionTypes.MATCHING:
            answersDto = values.answers.map(ans => ({
                answerText: ans.text,
                correct: true, // Chính xác: Luôn là TRUE
                answerMeta: ans.answerMeta
            }));
            break;

        // Nhóm 4: Các loại có nhiều lựa chọn (Lấy isCorrect từ form)
        case QuestionTypes.REORDER: // (Dùng answerMeta cho thứ tự)
        case QuestionTypes.TRUE_FALSE: // (Phải có 2 lựa chọn: True/False)
        case QuestionTypes.MULTIPLE_CHOICE:
        default:
            answersDto = values.answers.map(ans => ({
                answerText: ans.text,
                correct: ans.isCorrect, // Lấy 'isCorrect' động từ form
                answerMeta: ans.answerMeta || null
            }));
            break;
        }

        // Payload gửi lên Backend (tương thích với QuestionCreateDto/QuestionUpdateDto)
        const payload = {
            questId: values.questId,
            questionText: values.questionText,
            bloomLevel: values.bloomLevel,
            questionType: values.questionType,
            correctXpReward: values.correctXpReward,
            // Các trường phụ mới
            partialCredit: partialCredit,
            synonyms: synonyms,
            codeTemplate: codeTemplate,
            testCases: testCases,
            testResults: testResults,
            score: values.score,
            // Answers
            answers: answersDto,
        };

        
        const apiPayload = isEditing ? { 
            // Cập nhật các trường Question (Optional)
            questionText: values.questionText,
            bloomLevel: values.bloomLevel,
            questionType: values.questionType,
            correctXpReward: values.correctXpReward,
            // Các trường phụ
            partialCredit: partialCredit,
            synonyms: synonyms,
            codeTemplate: codeTemplate,
            testCases: testCases,
            testResults: testResults,
            // Cập nhật Answers (List)
            answers: payload.answers 
        } : payload;

        console.log("apiPayload",apiPayload)
        
        try {
             if (isEditing && currentQuestion) {
                 // UPDATE
                 await axios.put(`${API_QUESTION_URL}/${currentQuestion.questionId}`, apiPayload);
                 message.success(`Câu hỏi ID ${currentQuestion.questionId} đã được cập nhật.`);
             } else {
                 // CREATE
                 await axios.post(API_QUESTION_URL, payload); // Dùng payload đầy đủ cho CREATE
                 message.success(`Câu hỏi "${values.questionText.substring(0, 30)}..." đã được tạo mới.`);
             }
            
            form.resetFields();
            setIsModalOpen(false);
            setCurrentQuestion(null);
            await fetchQuestions(); 
        } catch (error) {
            console.error("Lỗi khi lưu/cập nhật câu hỏi:", error);
            message.error('Lỗi khi lưu/cập nhật câu hỏi. Vui lòng kiểm tra dữ liệu và server.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (questionId: number) => {
        setLoading(true);
        try {
            await axios.delete(`${API_QUESTION_URL}/${questionId}`);
            message.success('Câu hỏi đã được xóa thành công.');
            await fetchQuestions();
        } catch (error) {
            console.error("Error deleting question:", error);
            message.error('Lỗi khi xóa Câu hỏi. Lỗi server.');
        } finally {
            setLoading(false);
        }
    };

    // --- UI HANDLERS ---

    const showCreateModal = () => {
        setIsEditing(false);
        setCurrentQuestion(null);
        form.resetFields();
        // Thiết lập giá trị mặc định cho Form tạo mới
        form.setFieldsValue({
            questionType: QuestionTypes.MULTIPLE_CHOICE, 
            bloomLevel: BloomLevels.REMEMBER, 
            correctXpReward: 10,
            partialCredit: 0, // Giá trị mặc định cho Partial Credit
            answers: getDefaultAnswers().map(ans => ({
                text: ans.answerText, 
                isCorrect: ans.correct
            }))
        });
        setIsModalOpen(true);
    };

    const showEditModal = (question: Question) => {
        setIsEditing(true);
        setCurrentQuestion(question);
        
        // Chuẩn bị dữ liệu Answers cho Form
        let formAnswers: any[] = [];
        
        if (question.questionType === QuestionTypes.MULTIPLE_CHOICE || question.questionType === QuestionTypes.REORDER || question.questionType === QuestionTypes.CODE_SNIPPET) {
            formAnswers = question.answers.map(ans => ({
                text: ans.answerText, 
                isCorrect: ans.correct,
                answerMeta: ans.answerMeta
            }));
        } else if (question.questionType === QuestionTypes.FILL_IN_BLANK || question.questionType === QuestionTypes.NUMERIC || question.questionType === QuestionTypes.TRUE_FALSE || question.questionType === QuestionTypes.SEQUENCE) {
            // Chỉ có 1 đáp án đúng duy nhất
            const correctAns = question.answers.find(ans => ans.correct) || question.answers[0] || { answerText: '', correct: true };
            
            let isCorrectValue = correctAns.correct;

            if (question.questionType === QuestionTypes.TRUE_FALSE) {
                isCorrectValue = correctAns.correct;
            } else if (question.questionType === QuestionTypes.SEQUENCE) {
                // Đảm bảo không bị loại bỏ khoảng trắng khi hiển thị lại
            }
            
            formAnswers = [{ 
                text: correctAns.answerText, 
                isCorrect: isCorrectValue, 
                answerMeta: correctAns.answerMeta 
            }];

        } else if (question.questionType === QuestionTypes.MATCHING) {
            // Lấy Mục A từ answerText và Mục B từ answerMeta
            formAnswers = question.answers.map(ans => {
                return { 
                    text: ans.answerText || '',
                    answerMeta: ans.answerMeta || '',
                    isCorrect: true
                };
            });
        } 
        
        // Gán giá trị vào Form (bao gồm cả các trường phụ mới)
        form.setFieldsValue({
            questId: question.quest.questId,
            questionText: question.questionText,
            bloomLevel: question.bloomLevel,
            questionType: question.questionType,
            correctXpReward: question.correctXpReward,
            partialCredit: question.partialCredit ?? 0,
            synonyms: question.synonyms ?? undefined,
            codeTemplate: question.codeTemplate ?? undefined,
            testCases: question.testCases ?? undefined,
            testResults: question.testResults ?? undefined,
            answers: formAnswers,
        });
        setIsModalOpen(true);
    };

    // --- TABLE COLUMNS ---

    const columns: ColumnsType<Question> = [
        {
            title: 'ID',
            dataIndex: 'questionId',
            key: 'questionId',
            width: 80,
            sorter: (a, b) => a.questionId - b.questionId,
        },{
            title: 'Quest',
            dataIndex: 'quest',
            key: 'questName',
            width: 80,
            render: (text, record: Question) => {
                // 'record' là đối tượng Question đầy đủ
                // Ta truy cập vào record.quest.questId
                const questId = record.quest?.questName; // Sử dụng optional chaining để an toàn hơn
                
                return (
                    <Tag color="purple">
                        {questId ?? 'N/A'} 
                        {/* Nếu questId là undefined, hiển thị 'N/A' */}
                    </Tag>
                );
            },
            sorter: (a, b) => a.quest.questId - b.quest.questId,
        },
        {
            title: "Thứ tự (DB)",
            dataIndex: 'orderIndex',
            key: 'orderIndex',
            width: 120,
            align: 'center',
            sorter: (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0),
            render: (orderIndex: number) => <Tag color="geekblue">{orderIndex}</Tag>
        },
        {
            title: 'Nội dung Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            ellipsis: true,
            width: 300,
            render: (text: string) => <LatexDisplayInTable text={text} />,
        },
        {
            title: 'XP',
            dataIndex: 'correctXpReward',
            key: 'correctXpReward',
            width: 70,
            sorter: (a, b) => a.correctXpReward - b.correctXpReward,
        },
        {
            title: 'Cấp độ Bloom',
            dataIndex: 'bloomLevel',
            key: 'bloomLevel',
            width: 120,
            render: (level: BloomLevel) => formatBloomLevel(level),
            responsive: ['md'],
        },
        {
            title: 'Loại',
            dataIndex: 'questionType',
            key: 'questionType',
            width: 130,
            render: (type: QuestionType) => formatQuestionType(type),
            responsive: ['md'],
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            render: (_: any, record: Question) => (
                <Space size="middle">
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={() => showEditModal(record)}
                        className="text-blue-500 hover:text-blue-700 border-none shadow-none"
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xóa Câu hỏi"
                        description={`Bạn chắc chắn muốn xóa câu hỏi ID: ${record.questionId}?`}
                        onConfirm={() => handleDelete(record.questionId)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button 
                            icon={<DeleteOutlined />} 
                            danger
                            className="text-red-500 hover:text-red-700 border-none shadow-none"
                        >
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const questionOrderColumns: ColumnsType<Question> = [
        {
            title: <MenuOutlined className="text-lg text-gray-500" />,
            dataIndex: 'sort',
            width: 50,
            className: 'drag-visible',
            render: () => <MenuOutlined className="cursor-grab text-xl text-indigo-500 hover:text-indigo-700 transition" />,
        },
        {
            title: "Thứ tự Mới",
            dataIndex: 'newOrderIndex',
            key: 'newOrderIndex',
            width: 120,
            align: 'center',
            render: (_, __, index) => (
                <Tag color="blue" className="text-lg font-bold p-1 min-w-[30px] shadow-md">
                    {index + 1}
                </Tag>
            )
        },
        {
            title: 'ID Câu hỏi',
            dataIndex: 'questionId',
            key: 'questionId',
            width: 100,
        },
        {
            title: 'Nội dung Câu hỏi',
            dataIndex: 'questionText',
            key: 'questionText',
            // LatexDisplayInTable là component có sẵn trong file của bạn
            render: (text: string, record: Question) => <LatexDisplayInTable text={text} /> 
        },
    ];

    const questionComponents = {
        body: {
            row: DraggableQuestionRow,
        },
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <Card 
                title={
                    <Space className="w-full justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">
                            <QuestionCircleOutlined className="mr-2 text-blue-600" /> Ngân hàng Câu hỏi
                        </h2>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={showCreateModal}
                            className="bg-green-500 hover:bg-green-600 rounded-lg shadow-md"
                        >
                            Thêm Câu hỏi Mới
                        </Button>
                    </Space>
                }
                variant="outlined"
                className="rounded-xl shadow-lg"
            >
                <Spin spinning={loading} size="large">
                    <Table
                        columns={columns}
                        dataSource={questions}
                        rowKey="questionId"
                        pagination={{ pageSize: 10 }}
                        className="overflow-x-auto" 
                        scroll={{ x: 'max-content' }}
                    />
                </Spin>

                <Modal
                    title={isEditing ? `Chỉnh sửa Câu hỏi ID: ${currentQuestion?.questionId}` : 'Tạo Câu hỏi Mới'}
                    open={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    footer={null} 
                    width={800}
                    destroyOnHidden={true}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSave}
                        initialValues={{ 
                            questionType: QuestionTypes.MULTIPLE_CHOICE,
                            bloomLevel: BloomLevels.REMEMBER, 
                            correctXpReward: 10,
                            partialCredit: 0,
                        }}
                        className="mt-4"
                    >
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item
                                    name="questId"
                                    label="Thuộc Quest"
                                    rules={[{ required: true, message: 'Vui lòng chọn Quest!' }]}
                                >
                                    <Select
                                        placeholder="Chọn một Quest"
                                        loading={quests.length === 0 && !loading}
                                    >
                                        {quests.map(quest => (
                                            <Select.Option key={quest.questId} value={quest.questId}>
                                                {quest.questName}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="correctXpReward"
                                    label="Phần thưởng XP"
                                    rules={[{ required: true, message: 'Vui lòng nhập XP!' }]}
                                >
                                    <InputNumber min={1} className="w-full" placeholder="XP" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item
                            name="questionText"
                            label="Nội dung Câu hỏi"
                            rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi!' }]}
                        >
                            <MathInputPreview
                                rows={6}
                                placeholder="Nhập nội dung câu hỏi. Sử dụng $...$ cho công thức inline hoặc $$...$$ cho công thức riêng biệt."
                            />
                        </Form.Item>

                        <Row gutter={24}>
                            <Col span={8}>
                                <Form.Item
                                    name="bloomLevel"
                                    label="Cấp độ Bloom"
                                    rules={[{ required: true, message: 'Vui lòng chọn cấp độ!' }]}
                                >
                                    <Select>
                                        {Object.entries(BloomLevels).map(([key, value]) => (
                                            <Select.Option key={key} value={value}>
                                                {key.charAt(0) + key.slice(1).toLowerCase()}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    name="score" // <<< Thêm trường này
                                    label={<> <FireOutlined className="text-red-500" /> Điểm (XP)</>}
                                    tooltip="Điểm kinh nghiệm (XP) người chơi nhận được khi trả lời đúng câu hỏi này."
                                    rules={[{ required: true, message: 'Vui lòng nhập điểm số!' }]}
                                >
                                    <InputNumber
                                        min={1} 
                                        max={1000} // Giả sử điểm tối đa là 1000
                                        step={1}
                                        className="w-full"
                                        placeholder="Ví dụ: 100"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    name="questionType"
                                    label="Loại Câu hỏi"
                                    rules={[{ required: true, message: 'Vui lòng chọn loại câu hỏi!' }]}
                                >
                                    <Select>
                                        <Select.Option value={QuestionTypes.MULTIPLE_CHOICE}>Trắc nghiệm</Select.Option>
                                        <Select.Option value={QuestionTypes.FILL_IN_BLANK}>Điền vào chỗ trống</Select.Option>
                                        <Select.Option value={QuestionTypes.TRUE_FALSE}>Đúng - sai</Select.Option>
                                        <Select.Option value={QuestionTypes.MATCHING}>Ghép cặp</Select.Option>
                                        <Select.Option value={QuestionTypes.NUMERIC}>Điền số</Select.Option>
                                        <Select.Option value={QuestionTypes.SEQUENCE}>Điền chuỗi số</Select.Option>
                                        <Select.Option value={QuestionTypes.PROGRAMMING}>Lập trình</Select.Option> 
                                        <Select.Option value={QuestionTypes.REORDER}>Sắp xếp</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            {(currentQuestionType === QuestionTypes.REORDER) && (
                                <Col span={8}>
                                    <Form.Item
                                        name="partialCredit"
                                        label="Điểm thưởng một phần"
                                        tooltip="Phần trăm XP nếu sắp xếp đúng một phần (0-100)"
                                        rules={[{ required: true, message: 'Nhập giá trị Partial Credit!' }]}
                                    >
                                        <InputNumber <number>
                                            min={0} 
                                            max={100} 
                                            formatter={value => `${value}%`} 
                                            parser={value => parseInt(value?.replace('%', '') ?? '0', 10)} 
                                            className="w-full" 
                                        />
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                        
                        <DynamicAnswerFields form={form} currentQuestionType={currentQuestionType} />
                        <Form.Item name="synonyms" hidden>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item className="mt-6">
                            <Space>
                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    loading={loading}
                                    className="bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md"
                                >
                                    {isEditing ? 'Cập nhật Câu hỏi' : 'Tạo Câu hỏi Mới'}
                                </Button>
                                <Button onClick={() => setIsModalOpen(false)}>
                                    Hủy
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>
            <Card
            title={
                <h2 className="text-xl font-semibold text-gray-800">
                    <SortAscendingOutlined className="mr-2 text-indigo-600" /> Điều Chỉnh Thứ Tự Questions theo Quest
                </h2>
            }
            variant="outlined"
            className="rounded-xl shadow-lg border-t-4 border-indigo-600 mb-8 mt-8"
        >
            <Spin spinning={isLoadingOrderData || isSavingQuestionOrder} style={{ width: '100%' }}>
                <Space direction="vertical" size="middle" className="w-full">
                    <Alert
                        message="Hướng dẫn Sắp xếp"
                        description="Chọn Quest (Màn chơi) để tải Câu hỏi. Kéo thả hàng trong bảng để thay đổi thứ tự. Nhấn 'Lưu Thứ Tự' để cập nhật lên Server."
                        type="info"
                        showIcon
                        className='my-2'
                    />
                    
                    <Space size="large" className="w-full justify-between items-center">
                        <Space>
                            <label className="font-semibold text-gray-700">Chọn Quest:</label>
                            <Select
                                placeholder="Chọn Quest"
                                style={{ width: 300 }}
                                value={selectedQuestForOrder}
                                onChange={setSelectedQuestForOrder}
                                loading={quests.length === 0 && !loading}
                            >
                                {quests.map(quest => (
                                    <Select.Option key={quest.questId} value={quest.questId}>
                                        {quest.questName}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Space>
                        
                        <Space>
                            {hasQuestionOrderChanged && (
                                <Tooltip title="Thứ tự đã thay đổi, cần lưu lại!">
                                    <Tag icon={<ExclamationCircleOutlined />} color="warning" className="font-bold text-lg">
                                        CHƯA LƯU
                                    </Tag>
                                </Tooltip>
                            )}
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={saveQuestionOrder}
                                loading={isSavingQuestionOrder}
                                disabled={!hasQuestionOrderChanged || questionsForOrdering.length === 0 || loading || !selectedQuestForOrder}
                                className="bg-green-600 hover:!bg-green-700 transition duration-200"
                            >
                                Lưu Thứ Tự Mới
                            </Button>
                        </Space>
                    </Space>

                    <Table
                        columns={questionOrderColumns}
                        dataSource={questionsForOrdering}
                        rowKey="questionId"
                        loading={isLoadingOrderData || isSavingQuestionOrder}
                        components={questionComponents}
                        onRow={(record, index) => ({
                            index: index!,
                            moveRow: moveQuestionRow,
                            className: '', 
                            style: {}
                        } as DraggableRowProps)}
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: selectedQuestForOrder ? "Quest này chưa có Question nào." : "Vui lòng chọn một Quest để sắp xếp." }}
                        className="draggable-table"
                    />
                </Space>
            </Spin>
        </Card>
        </DndProvider>
    );
}