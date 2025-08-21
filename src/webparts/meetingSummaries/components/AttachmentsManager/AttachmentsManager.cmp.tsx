import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy?: string;
  uploadedDate?: string;
}

interface AttachmentsManagerProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  sp: any;
  listId: string;
  itemId: string;
  title?: string;
  showUploadButton?: boolean;
}

export default function AttachmentsManager({ 
  attachments, 
  onAttachmentsChange, 
  sp, 
  listId, 
  itemId,
  title = "נספחים",
  showUploadButton = true
}: AttachmentsManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileUpload(Array.from(files));
    }
  };

  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const newAttachments: Attachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setUploadProgress((i / files.length) * 100);
        
        try {
          // Upload file to SharePoint
          const result = await sp.web.lists.getById(listId).items.getById(itemId).attachments.add(file.name, file);
          
          newAttachments.push({
            id: result.data.Id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: result.data.ServerRelativeUrl,
            uploadedBy: sp.web.currentUser?.Title || 'משתמש',
            uploadedDate: new Date().toISOString()
          });
        } catch (uploadError) {
          console.error(`Error uploading file ${file.name}:`, uploadError);
          setError(`שגיאה בהעלאת הקובץ ${file.name}`);
        }
      }
      
      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }
      
      setUploadProgress(100);
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('שגיאה בהעלאת הקבצים');
    } finally {
      setUploading(false);
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (attachment) {
        await sp.web.lists.getById(listId).items.getById(itemId).attachments.getByName(attachment.name).delete();
        
        const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
        onAttachmentsChange(updatedAttachments);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setError('שגיאה במחיקת הקובץ');
    }
  };

  const handleDownload = (attachment: Attachment) => {
    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('שגיאה בהורדת הקובץ');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    return '📎';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {showUploadButton && (
        <Box sx={{ mb: 2 }}>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
          />
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            fullWidth
          >
            {uploading ? 'מעלה קבצים...' : 'הוסף נספחים'}
          </Button>
          
          {uploading && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="textSecondary">
                {Math.round(uploadProgress)}% הושלם
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {attachments.length > 0 && (
        <Grid container spacing={2}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} key={attachment.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ mr: 1 }}>
                      {getFileIcon(attachment.type)}
                    </Typography>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {attachment.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatFileSize(attachment.size)} • {attachment.type}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {attachment.uploadedBy && (
                    <Typography variant="caption" color="textSecondary">
                      הועלה על ידי: {attachment.uploadedBy}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(attachment)}
                    title="הורד"
                    color="primary"
                  >
                    <DownloadIcon />
                  </IconButton>
                  
                  <IconButton
                    size="small"
                    onClick={() => window.open(attachment.url, '_blank')}
                    title="צפייה"
                    color="info"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    title="מחק"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {attachments.length === 0 && !uploading && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            אין נספחים זמינים
          </Typography>
          <Typography variant="caption" color="textSecondary">
            לחץ על "הוסף נספחים" כדי להתחיל
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
