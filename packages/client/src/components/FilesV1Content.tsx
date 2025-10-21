/**
 * FilesV1Content - Knowledge Articles Management with v0 UI
 *
 * Uses the v0-generated KnowledgeArticles component as the UI foundation
 * while hooking up all Rita API functionality for file management.
 */

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  TrendingUp,
  ChevronDown,
  ArrowUpDown,
  Check,
  Zap,
  Loader,
  MoreHorizontal,
  Download,
  File,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useFiles, useUploadFile, useDownloadFile, useReprocessFile, useDeleteFile, type FileDocument } from '@/hooks/api/useFiles'
import { SUPPORTED_DOCUMENT_TYPES } from '@/lib/constants'

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export default function FilesV1Content() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [fileToDelete, setFileToDelete] = useState<FileDocument | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: filesData, isLoading } = useFiles()
  const uploadFileMutation = useUploadFile()
  const downloadFileMutation = useDownloadFile()
  const reprocessFileMutation = useReprocessFile()
  const deleteFileMutation = useDeleteFile()

  const files = filesData?.documents || []

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || file.status === statusFilter.toLowerCase()
    const matchesSource = sourceFilter === 'All' || file.type === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  // Calculate stats
  const totalDocs = files.length
  const processedCount = files.filter(f => f.status === 'processed').length
  const processingCount = files.filter(f => f.status === 'processing').length
  const failedCount = files.filter(f => f.status === 'failed').length

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)))
    }
  }

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFileMutation.mutate(e.target.files[0])
    }
  }

  const handleDownload = (file: FileDocument) => {
    downloadFileMutation.mutate({
      documentId: file.id,
      filename: file.filename
    })
  }

  const handleReprocess = (file: FileDocument) => {
    reprocessFileMutation.mutate(file.id)
  }

  const handleDelete = (file: FileDocument) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteFileMutation.mutate(fileToDelete.id)
      setDeleteDialogOpen(false)
      setFileToDelete(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Check className="h-3 w-3" />
      case 'processing':
        return <Loader className="h-3 w-3 animate-spin" />
      case 'processed':
        return <CheckCircle className="h-3 w-3" />
      case 'failed':
        return <AlertCircle className="h-3 w-3" />
      case 'pending':
        return <Loader className="h-3 w-3 animate-spin" />
      case 'syncing':
        return <Zap className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'processed':
        return 'default'
      case 'processing':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-6 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-normal text-foreground">Knowledge Articles</h1>
          </div>
          <Button onClick={handleUploadClick} disabled={uploadFileMutation.isPending}>
            {uploadFileMutation.isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Articles
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="border border-border bg-popover">
              <CardContent className="p-4">
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-normal text-foreground">{totalDocs}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +4.5%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-popover">
              <CardContent className="p-4">
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-normal text-foreground">{processedCount}</h3>
                    {processedCount > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Ready
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Processed Documents</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-popover">
              <CardContent className="p-4">
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-normal text-foreground">{processingCount}</h3>
                    {processingCount > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Loader className="h-3 w-3 animate-spin" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-popover">
              <CardContent className="p-4">
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-normal text-foreground">{failedCount}</h3>
                    {failedCount > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Failed Documents</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <Input
              placeholder="Search documents....."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Source: {sourceFilter}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setSourceFilter('All')}>All Sources</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSourceFilter('Manual')}>Manual</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSourceFilter('Jira Confluence')}>Jira Confluence</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Status: {statusFilter}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setStatusFilter('All')}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setStatusFilter('processed')}>Processed</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setStatusFilter('processing')}>Processing</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setStatusFilter('failed')}>Failed</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setStatusFilter('uploaded')}>Uploaded</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Source
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Size
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Queries
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Created Modified</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <File className="h-12 w-12 opacity-30" />
                        <p>No documents found</p>
                        <p className="text-sm">
                          {searchQuery || statusFilter !== 'All'
                            ? 'Try adjusting your search or filter criteria'
                            : 'Upload your first document to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFiles.has(file.id)}
                          onCheckedChange={() => handleSelectFile(file.id)}
                        />
                      </TableCell>
                      <TableCell>{file.filename}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(file.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(file.status)}
                          {getStatusLabel(file.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{file.type || 'Manual'}</TableCell>
                      <TableCell className="text-right">{formatFileSize(file.size)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{formatDate(file.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(file.status === 'uploaded' || file.status === 'processed') && (
                              <DropdownMenuItem onClick={() => handleDownload(file)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleReprocess(file)}
                              disabled={reprocessFileMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${reprocessFileMutation.isPending ? 'animate-spin' : ''}`} />
                              Reprocess
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(file)}
                              disabled={deleteFileMutation.isPending}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex justify-center">
            <p className="text-sm text-muted-foreground">{filteredFiles.length} Knowledge articles</p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={SUPPORTED_DOCUMENT_TYPES}
        disabled={uploadFileMutation.isPending}
      />

      {/* Upload status toast */}
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

      {reprocessFileMutation.isError && (
        <div className="fixed bottom-4 right-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-w-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {reprocessFileMutation.error?.message || 'Reprocess failed'}
            </span>
          </div>
        </div>
      )}

      {reprocessFileMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 p-3 bg-green-50 border border-green-200 rounded-md max-w-sm">
          <div className="flex items-center gap-2 text-green-700">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Document sent for reprocessing!</span>
          </div>
        </div>
      )}

      {deleteFileMutation.isError && (
        <div className="fixed bottom-4 right-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-w-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {deleteFileMutation.error?.message || 'Delete failed'}
            </span>
          </div>
        </div>
      )}

      {deleteFileMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 p-3 bg-green-50 border border-green-200 rounded-md max-w-sm">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Document deleted successfully!</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Document"
        description={`Are you sure you want to delete "${fileToDelete?.filename}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  )
}
