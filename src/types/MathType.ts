interface MathInputPreviewProps {
    value?: string; // Giá trị hiện tại (từ Antd Form)
    onChange?: (value: string) => void; // Hàm thay đổi giá trị (cho Antd Form)
    placeholder?: string;
    rows?: number;
    // Bổ sung các props cần thiết khác
}

interface LatexSymbol {
    displayLatex: string; // Chuỗi LaTeX hiển thị trên nút (e.g., \frac{a}{b})
    template: string;      // Chuỗi LaTeX được chèn vào văn bản (e.g., \frac{}{})
    tooltip: string;       // Mô tả tooltip
}

export type {MathInputPreviewProps}