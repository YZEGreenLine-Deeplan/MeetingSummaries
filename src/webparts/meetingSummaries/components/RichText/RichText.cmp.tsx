import React, { useState } from 'react';
import ReactQuill from 'react-quill'; // Import Quill.js
import 'react-quill/dist/quill.snow.css'; // Quill.js default styling
import { Typography } from '@mui/material';
import styles from './RichText.module.scss'; // Keep your existing styles



interface RichTextProps {
    value: string;
    disabled?: boolean;
    setValue: (newValue: string) => void;
    style?: React.CSSProperties;
    label?: string;
    error?: boolean;
    currDir?: boolean;
    errorText?: string;
}

function RichText({ value, disabled, setValue, style, label, error, errorText, currDir }: RichTextProps) {

    return (
        <div className={styles.richTextContainer} style={{ ...style, border: error ? "1px solid #d32f2f" : undefined }}>
            {/* Editor */}
            <Typography
                sx={{
                    marginBottom: "8px",
                    marginLeft: "8px",
                    textAlign: "left",
                    cursor: "default",
                }}
            >
                {label}
            </Typography>
            <ReactQuill
                value={value || ""}
                readOnly={disabled}
                onChange={setValue}
                theme="snow"
                style={{ textAlign: "center", height: "auto", maxHeight: "100px" }}
                modules={{
                    toolbar: [
                        ["bold", "italic", "underline", "strike"],
                        [{ header: 1 }, { header: 2 }],
                        [{ indent: "-1" }, { indent: "+1" }],
                        [{ align: [] }],
                        [{ color: ["#000000", "#ff0000", "#00ff00", "#0000ff", "#ff00ff"], }, { background: [] },],
                        [{ size: ["small", false, "large", "huge"] }],
                        [{ header: [1, 2, 3, 4, 5, 6, false] }],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["clean"],
                    ],
                    clipboard: {
                        matchVisual: false,
                    },
                }}
            />
            {error && (
                <Typography color="#d32f2f" fontSize={15} marginTop={2}>
                    {errorText}
                </Typography>
            )}
        </div>
    );
};

export default RichText;
