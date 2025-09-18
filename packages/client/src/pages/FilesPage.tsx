import React, { useState, useRef } from 'react';
import { useFiles, useUploadFile, useDownloadFile, FileDocument } from '../hooks/api/useFiles';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import {
  Upload,
  Download,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  return File;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'uploaded': return CheckCircle;
    case 'pending': return Clock;
    case 'failed': return AlertCircle;
    default: return File;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface FileItemProps {
  file: FileDocument;
  onDownload: (file: FileDocument) => void;
  onDelete?: (file: FileDocument) => void;
}

function FileItem({ file, onDownload, onDelete }: FileItemProps) {
  const FileIcon = getFileIcon(file.type);
  const StatusIcon = getStatusIcon(file.status);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileIcon className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium truncate">{file.filename}</h3>
              <div className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                file.status === 'uploaded' && "bg-green-100 text-green-700",
                file.status === 'pending' && "bg-yellow-100 text-yellow-700",
                file.status === 'failed' && "bg-red-100 text-red-700"
              )}>
                <StatusIcon className="h-3 w-3" />
                {file.status}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{formatFileSize(file.size)}</span>
              <span>{file.type}</span>
              {file.created_at && (
                <span>{file.created_at.toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {file.status === 'uploaded' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(file)}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(file)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FilesPage() {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: filesData, isLoading, refetch } = useFiles();
  const uploadFileMutation = useUploadFile();
  const downloadFileMutation = useDownloadFile();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = (file: FileDocument) => {
    downloadFileMutation.mutate({
      documentId: file.id,
      filename: file.filename
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/chat">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Chat
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Files</h1>
              <p className="text-muted-foreground">
                Upload, manage, and download your files
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Drag and drop a file here, or click to browse. Maximum file size: 10MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                uploadFileMutation.isPending && "pointer-events-none opacity-50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
                disabled={uploadFileMutation.isPending}
              />

              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <div className="mb-2">
                  <Button
                    variant="secondary"
                    onClick={openFileSelector}
                    disabled={uploadFileMutation.isPending}
                  >
                    Choose File
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  or drag and drop files here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: Images, PDFs, Documents, Spreadsheets
                </p>
              </div>

              {uploadFileMutation.isPending && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                </div>
              )}
            </div>

            {uploadFileMutation.isError && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {uploadFileMutation.error?.message || 'Upload failed'}
                  </span>
                </div>
              </div>
            )}

            {uploadFileMutation.isSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">File uploaded successfully!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Files</CardTitle>
            <CardDescription>
              {filesData ? `${filesData.total} files uploaded` : 'Loading files...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="w-8 h-8" />
                  </div>
                ))}
              </div>
            ) : filesData?.documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Upload your first file above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filesData?.documents.map((file) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}