import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactQuill, { UnprivilegedEditor } from "react-quill";
import "react-quill/dist/quill.snow.css";
import styles from "./RichText.module.scss";
import { Typography } from "@mui/material";


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

export default function RichText({ value, disabled, setValue, style, label, error, errorText, currDir }: RichTextProps) {

    const [inputValue, setInputValue] = useState(value);
    const quillRef = useRef<ReactQuill | null>(null);
    const isInternalUpdateRef = useRef(false);
    const lastPropValueRef = useRef(value);

    useEffect(() => {
        if (!isInternalUpdateRef.current && value !== lastPropValueRef.current) {
            setInputValue(value);
            lastPropValueRef.current = value;
        }
    }, [value]);

    useEffect(() => {
        const toolbar = document.querySelector(".ql-toolbar");

        if (toolbar) {
            const tooltipsMap: Record<string, string> = currDir
                ? {
                    "ql-bold": "הדגשה",
                    "ql-italic": "נטוי",
                    "ql-underline": "קו תחתון",
                    "ql-strike": "קו חוצה",
                    "ql-list": "רשימה",
                    "ql-align": "יישור",
                    "ql-color": "צבע טקסט",
                    "ql-background": "צבע רקע",
                    "ql-clean": "נקה עיצוב",
                    "ql-header": "כותרת",
                    "ql-size": "גודל גופן",
                    "ql-indent": "הזחה",
                }
                : {
                    "ql-bold": "Bold",
                    "ql-italic": "Italic",
                    "ql-underline": "Underline",
                    "ql-strike": "Strikethrough",
                    "ql-list": "List",
                    "ql-align": "Align",
                    "ql-color": "Text color",
                    "ql-background": "Background color",
                    "ql-clean": "Clear formatting",
                    "ql-header": "Header",
                    "ql-size": "Font size",
                    "ql-indent": "Indent",
                };

            Object.entries(tooltipsMap).forEach(([className, title]) => {
                const elements = toolbar.querySelectorAll(`.${className}`);
                elements.forEach((el) => {
                    if (el.classList.contains("ql-picker")) {
                        const label = el.querySelector(".ql-picker-label");
                        if (label) label.setAttribute("title", title);
                    } else {
                        el.setAttribute("title", title);
                    }
                });
            });
        }
    }, [currDir]);

    useEffect(() => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            const editorElement = editor.root;

            const styleId = 'quill-rtl-bullet-fix';
            let existingStyle = document.getElementById(styleId);

            if (existingStyle) {
                existingStyle.remove();
            }

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .ql-editor[dir="rtl"] ul {
                    padding-right: 1.5em !important;
                    padding-left: 0 !important;
                }
                .ql-editor[dir="rtl"] ol {
                    padding-right: 1.5em !important;
                    padding-left: 0 !important;
                }
                .ql-editor[dir="rtl"] ul li,
                .ql-editor[dir="rtl"] ol li {
                    padding-right: 0.5em !important;
                    padding-left: 0 !important;
                }
                .ql-editor[dir="rtl"] ul li::before {
                    content: "•";
                    margin-left: 0.5em !important;
                    margin-right: 0 !important;
                }
                .ql-editor[dir="rtl"] ol li::before {
                    margin-left: 0.5em !important;
                    margin-right: 0 !important;
                }
                
                /* Fix LTR bullet positioning */
                .ql-editor li:not(.ql-direction-rtl)::before {
                    margin-left: 0 !important;
                    margin-right: 0.3em !important;
                    text-align: right;
                }
                

            `;
            document.head.appendChild(style);

            // Set direction based on currDir
            editorElement.setAttribute('dir', currDir ? 'rtl' : 'ltr');

            // Set default alignment for the toolbar based on direction
            setTimeout(() => {
                const defaultAlignment = currDir ? 'right' : 'left';
                try {
                    // Apply default format to current selection or cursor
                    editor.format('align', defaultAlignment);
                } catch (error) {
                    console.log('Could not set default alignment:', error);
                }
            }, 100);
        }
    }, [currDir]);

    // Handle changes from user input
    const handleChange = useCallback((newValue: string, delta: any, source: any) => {
        try {
            // Prevent infinite loop by checking if this is an internal update
            if (isInternalUpdateRef.current) {
                return;
            }

            // Update local state immediately for responsive UI
            setInputValue(newValue || "");

            // Mark as internal update to prevent loop
            isInternalUpdateRef.current = true;

            // Update parent state
            setValue(newValue || "");

            // Reset flag after a short delay to allow external updates
            setTimeout(() => {
                isInternalUpdateRef.current = false;
            }, 0);

        } catch (error) {
            console.error('Error in RichText onChange:', error);
            // Reset flag on error
            isInternalUpdateRef.current = false;
        }
    }, [setValue]);

    // Handle blur events for additional safety
    const handleBlur = useCallback((_range: any, _source: any, _editor: UnprivilegedEditor) => {
        try {
            // Ensure the current value is saved
            const currentValue = inputValue || "";
            if (currentValue !== lastPropValueRef.current) {
                isInternalUpdateRef.current = true;
                setValue(currentValue);
                lastPropValueRef.current = currentValue;
                setTimeout(() => {
                    isInternalUpdateRef.current = false;
                }, 0);
            }
        } catch (error) {
            console.error('Error in RichText onBlur:', error);
            isInternalUpdateRef.current = false;
        }
    }, [inputValue, setValue]);

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
                ref={quillRef}
                value={inputValue || ""}
                readOnly={disabled}
                onChange={handleChange}
                onBlur={handleBlur}
                theme="snow"
                style={{ textAlign: "center", height: "auto", maxHeight: "300px" }}
                modules={{
                    toolbar: [
                        ["bold", "italic", "underline", "strike"], // toggled buttons                        
                        [{ header: 1 }, { header: 2 }], // custom button values                        
                        [{ indent: "-1" }, { indent: "+1" }], // outdent/indent                        
                        [{ align: [] }],
                        [{ color: ["#000000", "#ff0000", "#00ff00", "#0000ff", "#ff00ff"], }, { background: [] },], // dropdown with defaults from theme
                        [{ size: ["small", false, "large", "huge"] }], // custom dropdown
                        [{ header: [1, 2, 3, 4, 5, 6, false] }],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["clean"],
                    ],
                    clipboard: {
                        matchVisual: false, // Prevent visual matching that can cause range issues
                    },
                }}
            ></ReactQuill>
            {error && (
                <Typography color="#d32f2f" fontSize={15} marginTop={2}>
                    {errorText}
                </Typography>
            )}
        </div>
    );
}