import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Space, Tooltip, Tag, Alert } from 'antd';
import { FunctionOutlined, AreaChartOutlined, HighlightOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const { TextArea } = Input;

// Định nghĩa lại một số kiểu cho rõ ràng
interface MathInputPreviewProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

// Danh sách các ký hiệu LaTeX cơ bản để chèn nhanh
const latexSymbols = [
    { key: '\\frac', value: '\\frac{a}{b}', template: '\\frac{}{}', tooltip: 'Phân số' },
    { key: '\\sum', value: '\\sum_{i=1}^{n}', template: '\\sum_{}^{}', tooltip: 'Tổng' },
    { key: '\\int', value: '\\int_{a}^{b}', template: '\\int_{}^{}', tooltip: 'Tích phân' },
    { key: '\\sqrt', value: '\\sqrt{x}', template: '\\sqrt{}', tooltip: 'Căn bậc hai' },
    { key: 'a^b', value: 'a^b', template: '^{}', tooltip: 'Mũ' },
    { key: 'a_b', value: 'a_b', template: '_{}', tooltip: 'Chỉ số dưới' },
    { key: '\\ne', value: '\\ne', template: '\\ne', tooltip: 'Khác' },
    { key: '\\le', value: '\\le', template: '\\le', tooltip: 'Nhỏ hơn hoặc bằng' },
    { key: '\\ge', value: '\\ge', template: '\\ge', tooltip: 'Lớn hơn hoặc bằng' },
];

const MathInputPreview: React.FC<MathInputPreviewProps> = ({ value = '', onChange, placeholder, rows = 4 }) => {
    const [inputValue, setInputValue] = useState(value);
    const [cursorPosition, setCursorPosition] = useState<number>(0); 
    const [latexError, setLatexError] = useState<string | null>(null); 
    const textAreaRef = React.useRef<any>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Xử lý Input Change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setCursorPosition(e.target.selectionStart); 
        if (onChange) {
            onChange(newValue);
        }
    };

    // Xử lý Selection và Focus/Blur
    const handleCursorUpdate = (e: React.UIEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => {
        setCursorPosition(e.currentTarget.selectionStart);
    }

    // Hàm chèn LaTeX
    const insertLatex = (latex: string) => {
        const ref = textAreaRef.current?.resizableTextArea?.textArea;
        if (ref) {
            const start = ref.selectionStart;
            const end = ref.selectionEnd;
            const newText = inputValue.substring(0, start) + latex + inputValue.substring(end);
            
            setInputValue(newText);
            if (onChange) {
                onChange(newText);
            }
            
            let newCursorPosition = start + latex.length;
            const emptyBraceIndex = latex.indexOf('{}');
            if (emptyBraceIndex !== -1) {
                newCursorPosition = start + emptyBraceIndex + 1; 
            } else if (latex === '\n$$\n\n$$\n') {
                 newCursorPosition = start + 4; 
            } else {
                newCursorPosition = start + latex.length;
            }
            
            setTimeout(() => {
                ref.selectionStart = ref.selectionEnd = newCursorPosition;
                setCursorPosition(newCursorPosition);
                ref.focus();
            }, 0); 
        }
    };

    /**
     * Tách chuỗi văn bản thành các phần tử và xác định lỗi.
     * @returns Tuple [nodes, errorString]: Mảng các React Node và Chuỗi lỗi (nếu có).
     */
    const parseLatexContent = (text: string): [React.ReactNode[], string | null] => {
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        let currentError: string | null = null;
        
        // Regex bắt cả $$...$$ (block) và $...$ (inline)
        const regex = /(\$\$[\s\S]*?\$\$)|(\$[\s\S]*?\$)/g; 
        let match;

        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const isBlock = fullMatch.startsWith('$$');
            
            // 1. Thêm đoạn text thường trước đó
            if (match.index > lastIndex) {
                nodes.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
            }
            
            // 2. Thêm công thức
            let latexContent = fullMatch.substring(isBlock ? 2 : 1, isBlock ? fullMatch.length - 2 : fullMatch.length - 1).trim();

            if (latexContent) {
                try {
                    const Component = isBlock ? BlockMath : InlineMath;
                    // Đối với InlineMath, chúng ta bao bọc nó trong một span để giữ nó inline với văn bản
                    nodes.push(
                        <span key={`math-wrap-${match.index}`} className="inline-block mx-0.5 align-middle">
                            <Component math={latexContent} />
                        </span>
                    );
                } catch (e: any) {
                    // Xử lý lỗi KaTeX
                    if (!currentError) { 
                        currentError = e.message.replace('ParseError: KaTeX parse error: ', '');
                    }
                    
                    nodes.push(
                        <Tooltip title={e.message} key={`error-math-${match.index}`}>
                            <Tag 
                                color="red" 
                                className="bg-red-100 text-red-700 font-mono italic cursor-pointer transition duration-200 hover:shadow-lg hover:border-red-500"
                            >
                                <CodeOutlined className="mr-1" />
                                {fullMatch}
                            </Tag>
                        </Tooltip>
                    );
                }
            } else {
                 // Xử lý công thức rỗng ($$ hoặc $)
                 nodes.push(
                    <Tag 
                        key={`empty-math-${match.index}`} 
                        color="yellow"
                        className="bg-yellow-100 text-yellow-700 font-mono italic"
                    >
                        {fullMatch} - Công thức rỗng
                    </Tag>
                 );
            }

            lastIndex = match.index + fullMatch.length;
        }

        // 3. Thêm đoạn text thường còn lại
        if (lastIndex < text.length) {
            nodes.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
        }

        return [nodes, currentError];
    };

    // --- EFFECT: Dùng để cập nhật state lỗi sau khi render xong ---
    useEffect(() => {
        const [_, errorString] = parseLatexContent(inputValue); 
        
        if (errorString !== latexError) {
            setLatexError(errorString);
        }
    }, [inputValue, latexError]);
    // -----------------------------------------------------------------


    // Gọi hàm parsing một lần để lấy nodes hiển thị trong render
    const [previewNodes] = parseLatexContent(inputValue);


    return (
        <div className="math-input-component border border-gray-200 rounded-xl p-4 bg-white shadow-xl space-y-4">
            
            {/* Thanh công cụ chèn nhanh */}
            <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100 bg-gray-50 rounded-lg">
                <Space size={[4, 8]} wrap>
                    <Tag color="blue" icon={<FunctionOutlined />} className="text-sm px-3 py-1 font-semibold rounded-full">
                         Chèn nhanh LaTeX
                    </Tag>
                    {latexSymbols.map((item) => (
                        <Tooltip title={`Chèn ${item.tooltip}: ${item.value}`} key={item.key}>
                            <Button
                                size="middle" // Thay đổi size từ small sang middle để dễ bấm hơn
                                icon={<FunctionOutlined />}
                                onClick={() => insertLatex(`$${item.template}$`)} 
                                className="border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 transition duration-150 shadow-sm font-semibold rounded-lg"
                            >
                                {item.key.includes('\\') ? item.key : item.key}
                            </Button>
                        </Tooltip>
                    ))}
                    <Tooltip title="Chèn công thức hiển thị riêng một dòng ($$...$$)">
                        <Button
                            size="middle"
                            icon={<AreaChartOutlined />}
                            onClick={() => insertLatex('\n$$\n\n$$\n')} 
                            className="border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100 transition duration-150 shadow-sm font-semibold rounded-lg"
                        >
                            Block Math
                        </Button>
                    </Tooltip>
                    
                </Space>
            </div>

            {/* Vùng nhập liệu */}
            <div className="relative">
                <TextArea
                    ref={textAreaRef}
                    value={inputValue}
                    onChange={handleChange}
                    onSelect={handleCursorUpdate} 
                    onBlur={handleCursorUpdate} 
                    onFocus={handleCursorUpdate}
                    placeholder={placeholder || "Nhập nội dung câu hỏi (sử dụng $...$ cho công thức inline hoặc $$...$$ cho công thức block)"}
                    rows={rows}
                    // Tăng cường tính dễ đọc và tập trung vào code/text
                    className="font-mono border border-gray-300 rounded-lg focus:border-blue-500 focus:shadow-lg focus:shadow-blue-200 resize-none p-4 text-base transition duration-300 hover:border-gray-400"
                />
            </div>

            {/* Hộp xem trước */}
            <div className="preview-box border-t border-gray-200 pt-4">
                <h4 className="text-base font-bold mb-3 flex items-center text-gray-800 border-l-4 border-blue-500 pl-3 py-1 bg-blue-50/50 rounded-r-lg">
                    <EyeOutlined className="mr-2 text-blue-500" />
                    Xem trước Nội dung (Preview)
                </h4>
                
                {latexError && (
                    <Alert
                        message={<span className="font-bold">Lỗi Phân tích Cú pháp KaTeX</span>}
                        description={<span className="font-mono text-sm">{latexError}</span>}
                        type="error"
                        showIcon
                        className="mb-4 shadow-md border-l-4 border-red-600"
                    />
                )}
                
                {/* Khung hiển thị nội dung */}
                <div 
                    className="min-h-[100px] p-4 bg-white border border-dashed border-gray-300 rounded-xl text-base leading-relaxed break-words shadow-inner"
                    style={{ whiteSpace: 'pre-wrap' }} // Giữ nguyên định dạng ngắt dòng
                >
                    {inputValue ? previewNodes : (
                        <p className="text-gray-400 italic flex items-center">
                            <HighlightOutlined className="mr-2" /> 
                            Nội dung xem trước (bao gồm cả công thức toán) sẽ được hiển thị ở đây.
                        </p>
                    )}
                </div>
            </div>
            
        </div>
    );
};

export default MathInputPreview;