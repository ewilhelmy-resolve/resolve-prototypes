/**
 * FilesV1Page - Knowledge Articles page using RitaLayout v1 architecture
 *
 * This is the modernized version of the files page using the new RitaLayout structure
 * with enhanced components and modern React patterns.
 */

import React, { useState, useRef } from 'react'
import { useFiles, useUploadFile, useDownloadFile, FileDocument } from '../hooks/api/useFiles'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Skeleton } from '../components/ui/skeleton'
import {
  Upload,
  Download,
  File,
  AlertCircle,
  CheckCircle,
  Search,
  MoreHorizontal,
  ArrowUpDown,
  FileText,
  Newspaper
} from 'lucide-react'
import { cn } from '../lib/utils'

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function FilesV1Page() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: filesData, isLoading } = useFiles()
  const uploadFileMutation = useUploadFile()
  const downloadFileMutation = useDownloadFile()

  // Filter files based on search and status
  const filteredFiles = filesData?.documents.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || file.status === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  }) || []

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files: FileList) => {
    const file = files[0]
    if (file) {
      uploadFileMutation.mutate(file)
    }
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

  const handleDownload = (file: FileDocument) => {
    downloadFileMutation.mutate({
      documentId: file.id,
      filename: file.filename
    })
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Simple header for files page */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground font-serif">Rita Go</h1>
          <div className="text-sm text-muted-foreground">Knowledge Articles</div>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-6">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-foreground font-serif">Knowledge Articles</h1>
              <p className="text-base text-muted-foreground">
                Manage your knowledge base documents and articles for Rita AI
              </p>
            </div>

            {/* Upload Button */}
            <Button
              variant="default"
              className="gap-2"
              onClick={openFileSelector}
              disabled={uploadFileMutation.isPending}
            >
              <Upload className="w-4 h-4" />
              {uploadFileMutation.isPending ? 'Uploading...' : 'Upload Document'}
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
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
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
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
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
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Newspaper className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {filteredFiles.length > 0
                        ? formatFileSize(filteredFiles.reduce((acc, file) => acc + file.size, 0) / filteredFiles.length)
                        : 'N/A'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Avg. Size</p>
                  </div>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <File className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
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
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2 text-center">
                          <p className="text-lg font-medium">No documents found</p>
                          <p className="text-sm">
                            {searchQuery || statusFilter !== 'All'
                              ? 'Try adjusting your search or filter criteria'
                              : 'Upload your first document to get started with Rita AI knowledge base'
                            }
                          </p>
                        </div>
                        {!searchQuery && statusFilter === 'All' && (
                          <Button
                            variant="outline"
                            onClick={openFileSelector}
                            className="gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Document
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id} className="group hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {file.type?.includes('pdf') ? (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            ) : file.type?.includes('text') ? (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <File className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium text-foreground group-hover:text-primary cursor-pointer">
                            {file.filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={file.status === 'uploaded' ? "default" : "secondary"}
                          className={cn(
                            'capitalize',
                            file.status === 'uploaded' && "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400",
                            file.status === 'pending' && "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400",
                            file.status === 'failed' && "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                          )}
                        >
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mr-2",
                              file.status === 'uploaded' && "bg-green-500",
                              file.status === 'pending' && "bg-orange-500 animate-pulse",
                              file.status === 'failed' && "bg-red-500"
                            )}
                          />
                          {file.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="capitalize">
                          {file.type || 'Unknown'}
                        </span>
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
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Download file"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="More actions"
                          >
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

          {/* Footer Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredFiles.length} of {filesData?.total || 0} documents
            </p>
            <p>
              Total size: {filesData?.documents ? formatFileSize(
                filesData.documents.reduce((acc, file) => acc + file.size, 0)
              ) : '0 Bytes'}
            </p>
          </div>

          {/* Hidden file input for upload functionality */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
            disabled={uploadFileMutation.isPending}
            multiple={false}
          />

          {/* Upload status messages */}
          {uploadFileMutation.isError && (
            <div className="fixed bottom-4 right-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-sm animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Upload failed</p>
                  <p className="text-xs opacity-90">
                    {uploadFileMutation.error?.message || 'Please try again'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadFileMutation.isSuccess && (
            <div className="fixed bottom-4 right-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-sm animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Upload successful</p>
                  <p className="text-xs opacity-90">
                    Document added to knowledge base
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}