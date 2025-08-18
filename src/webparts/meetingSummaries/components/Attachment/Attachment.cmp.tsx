import React, { useEffect, useState, useRef, useContext } from 'react';
import styles from './Attachment.module.scss';
// import { SPContextService } from '../../../../SPContextExt.srv';
import { IAttachment } from '../Interfaces';
// import { Dialog as DialogMicrosoft } from '@microsoft/sp-dialog';
import CancelIcon from '@mui/icons-material/Cancel';
import { IconButton } from '@mui/material';
import { SPFI } from '@pnp/sp';

interface AttachmentProps {
    value?: IAttachment[];
    onChange?: (attachments: IAttachment[]) => void;
    formType?: string;
    sp: SPFI;
    currDir: boolean;
}

export default function Attachment({ value, onChange, formType, sp, currDir }: AttachmentProps) {

    const t = currDir ? require('../../../../locales/he/common.json') : require('../../../../locales/en/common.json') // Translator between en/he

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [attachments, setAttachments] = useState<IAttachment[]>(value || []);

    useEffect(() => {
        if (value) {
            setAttachments(value);
        }
    }, [value]);

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const files = e.target.files;
        if (!files) return;

        const existingFileNames = new Set(attachments.map(a => a.FileName));
        if (Array.from(files).some(file => existingFileNames.has(file.name))) {
            alert("Some files already exist in the attachments list.");
            // Reset file input so it can be selected again
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const newFiles: IAttachment[] = await Promise.all(
            Array.from(files).map(async file => ({
                name: file.name,
                content: await file.arrayBuffer(),
                FileName: file.name,
                FileNameAsPath: { DecodedUrl: file.name },
                ServerRelativePath: { DecodedUrl: "" },
                ServerRelativeUrl: "",
            }))
        );

        const updated = [...attachments, ...newFiles];
        setAttachments(updated);
        onChange?.(updated);

        // ✅ Reset the input so the same file can be picked again later
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        const updatedAttachments = attachments.filter((_, i) => i !== index);
        setAttachments(updatedAttachments);
        onChange?.(updatedAttachments);
    };

    const handleAttachmentClick = async (index: number): Promise<void> => {
        if (formType === 'edit') {
            const absoluteUrl = window.location.href;
            const domain: string = new URL(absoluteUrl).hostname;
            const relUrl = attachments[index].ServerRelativeUrl;
            let file = null;
            try {
                file = await sp.web.getFileByServerRelativePath(relUrl).select('LinkingUrl, ServerRelativeUrl')();
                window.open(file.LinkingUrl ? file.LinkingUrl : `https://${domain}/${file.ServerRelativeUrl}`, '_blank');
            } catch (error) {
                console.error('Error fetching file:', error);
                return;
            }
        }
    }

    return (
        <div className={styles.attachmentContainer}
            style={{ direction: currDir ? 'rtl' : 'ltr' }}>
            <h3>{t['Attachments']}</h3>
            <div>
                <label htmlFor="fileInput" className={`${styles.customFileUpload}`}>
                    {t['ChooseFiles']}
                </label>
                <input
                    ref={fileInputRef}
                    id="fileInput"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
            {attachments.length > 0 && (
                <div>
                    <h4>{t['UploadedFiles']}</h4>
                    <ul className={styles.uploadedFiles}>
                        {attachments.map((attachment, index) => (
                            <li key={index}>
                                <strong
                                    className={attachment.ServerRelativeUrl !== "" ? styles.fileNameEdit : styles.fileNameNew}
                                    onClick={() => { handleAttachmentClick(index) }}>{attachment.FileName}</strong>
                                <IconButton onClick={() => removeAttachment(index)}>
                                    <CancelIcon color='error' />
                                </IconButton>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
