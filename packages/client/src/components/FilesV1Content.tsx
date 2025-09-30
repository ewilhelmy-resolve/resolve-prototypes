/**
 * FilesV1Content - Knowledge Articles Management Content
 *
 * This replicates the functionality from the original FilesPage but designed
 * for the V1 layout system. Includes file upload, management, search, filtering,
 * and all the same features as the legacy files page.
 */

import type React from 'react';
import { useState, useRef } from 'react';
import { useFiles, useUploadFile, useDownloadFile, type FileDocument } from '../hooks/api/useFiles';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import {
  Upload,
  Download,
  File,
  AlertCircle,
  CheckCircle,
  Search,
  MoreHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '../lib/utils';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
};

export default function FilesV1Content() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: filesData, isLoading } = useFiles();
  const uploadFileMutation = useUploadFile();
  const downloadFileMutation = useDownloadFile();

  // Filter files based on search and status
  const filteredFiles = filesData?.documents.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || file.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  }) || [];

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

  return (
    <div className="flex flex-col h-full p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-normal text-foreground">Knowledge Articles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your knowledge base documents and articles
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="justify-center gap-2"
            onClick={openFileSelector}
            disabled={uploadFileMutation.isPending}
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{filesData?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
                <div className="text-green-600 text-sm font-medium">+4.5%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{filteredFiles.length}</p>
                  <p className="text-sm text-muted-foreground">Available Files</p>
                </div>
                <div className="text-green-600 text-sm font-medium">+2.1%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{filteredFiles.filter(f => f.status === 'uploaded').length}</p>
                  <p className="text-sm text-muted-foreground">Processed</p>
                </div>
                <div className="text-green-600 text-sm font-medium">+8.2%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">N/A</p>
                  <p className="text-sm text-muted-foreground">Avg. Size</p>
                </div>
                <div className="text-muted-foreground text-sm font-medium">0%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <div className="flex items-center gap-2">
                    Name
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Size
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Type
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
                  </TableRow>
                ))
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <File className="h-12 w-12 opacity-30" />
                      <p>No documents found</p>
                      <p className="text-sm">
                        {searchQuery || statusFilter !== 'All'
                          ? 'Try adjusting your search or filter criteria'
                          : 'Upload your first document to get started'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <span className="text-blue-600 hover:underline cursor-pointer font-medium">
                        {file.filename}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={file.status === 'uploaded' ? "default" : "secondary"}
                        className={cn(
                          file.status === 'uploaded' && "bg-green-100 text-green-800 hover:bg-green-100",
                          file.status === 'pending' && "bg-orange-100 text-orange-800 hover:bg-orange-100",
                          file.status === 'failed' && "bg-red-100 text-red-800 hover:bg-red-100"
                        )}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mr-2",
                            file.status === 'uploaded' && "bg-green-500",
                            file.status === 'pending' && "bg-orange-500",
                            file.status === 'failed' && "bg-red-500"
                          )}
                        />
                        {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.created_at?.toLocaleDateString() || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {file.status === 'uploaded' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredFiles.length} Documents
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>

        {/* Hidden file input for drag & drop functionality */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
          disabled={uploadFileMutation.isPending}
        />

        {/* Upload status messages */}
        {uploadFileMutation.isError && (
          <div className="fixed bottom-4 right-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-w-sm">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {uploadFileMutation.error?.message || 'Upload failed'}
              </span>
            </div>
          </div>
        )}

        {uploadFileMutation.isSuccess && (
          <div className="fixed bottom-4 right-4 p-3 bg-green-50 border border-green-200 rounded-md max-w-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">File uploaded successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}