'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSearch, ArrowLeft, Eye, Trash2, AlertTriangle, Download, Video, Mic, Type, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/header';
import type { Submission } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { extractAudioFromVideo } from '@/lib/audio-extractor';

/**
 * Download blob from URL (simplified version without Firebase)
 */
async function downloadFromStorage(storageUrl: string): Promise<Blob> {
  console.log(`🚀 [DEBUG] Starting download for URL: ${storageUrl}`);
  
  try {
    // Validate URL format first
    if (!storageUrl || typeof storageUrl !== 'string' || storageUrl.length < 10) {
      console.error(`❌ [DEBUG] Invalid URL format:`, { storageUrl, type: typeof storageUrl, length: storageUrl?.length });
      throw new Error(`Invalid URL format: ${storageUrl}`);
    }
    
    // Simple direct fetch for data URIs and regular URLs
    if (storageUrl.startsWith('data:')) {
      console.log(`📊 [DEBUG] Processing data URI (${storageUrl.length} characters)`);
      const response = await fetch(storageUrl);
      const blob = await response.blob();
      console.log(`✅ [DEBUG] Data URI conversion successful (${blob.size} bytes)`);
      return blob;
    }
    
    // For other URLs, attempt direct fetch
    console.log(`🔗 [DEBUG] Attempting direct fetch`);
    const response = await fetch(storageUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`✅ [DEBUG] Download successful (${blob.size} bytes)`);
    return blob;
    
  } catch (error) {
    console.error(`❌ [DEBUG] Download failed:`, error);
    throw error;
  }
}

/**
 * Simplified download helper without Firebase Storage dependencies
 */
async function downloadVideoBlob(storageUrl: string): Promise<Blob> {
  try {
    console.log(`📥 Starting video download: ${storageUrl.substring(0, 100)}...`);
    
    // Handle data URIs directly
    if (storageUrl.startsWith('data:')) {
      return await downloadFromStorage(storageUrl);
    }
    
    // For other URLs, use direct fetch
    return await downloadFromStorage(storageUrl);
    
  } catch (error) {
    console.error('❌ Video download error:', error);
    throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Simplified submission management without Firebase
export default function AdminSubmissionsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadFormat, setDownloadFormat] = useState<'video' | 'audio'>('video');
  const [extractingAudio, setExtractingAudio] = useState<Record<string, boolean>>({});

  // Load submissions (mock data for now)
  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoadingSubmissions(true);
        
        // TODO: Replace with FastAPI backend call
        // For now, return empty array to prevent Firebase errors
        const mockSubmissions: Submission[] = [];
        
        setSubmissions(mockSubmissions);
        setFilteredSubmissions(mockSubmissions);
        
      } catch (error) {
        console.error('Error loading submissions:', error);
        toast({
          title: "Error",
          description: "Failed to load submissions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingSubmissions(false);
      }
    };

    if (user) {
      loadSubmissions();
    }
  }, [user, toast]);

  // Filter submissions based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSubmissions(submissions);
      return;
    }

    const filtered = submissions.filter(submission => 
      submission.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.competencies?.some(comp => 
        comp.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    setFilteredSubmissions(filtered);
  }, [searchTerm, submissions]);

  // Delete submission
  const handleDelete = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete submission: ${response.statusText}`);
      }

      // Remove from local state
      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
      setFilteredSubmissions(prev => prev.filter(sub => sub.id !== submissionId));

      toast({
        title: "Success",
        description: "Submission deleted successfully",
        variant: "default",
      });

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error", 
        description: `Failed to delete submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Download submission
  const handleDownload = async (submission: Submission) => {
    const submissionId = submission.id;
    
    try {
      setDownloading(prev => ({ ...prev, [submissionId]: true }));
      
      console.log(`📥 Starting download for submission: ${submissionId}`);
      
      if (!submission.history || submission.history.length === 0) {
        throw new Error('No video content found in submission');
      }

      // Get the latest video entry
      const latestEntry = submission.history[submission.history.length - 1];
      if (!latestEntry.videoDataUri) {
        throw new Error('No video data found in latest submission entry');
      }

      const videoDataUri = latestEntry.videoDataUri;
      console.log(`📥 Video data URI type: ${videoDataUri.startsWith('data:') ? 'Data URI' : 'Storage URL'}`);

      let videoBlob: Blob;
      
      try {
        // Check if it's a data URI or Storage URL  
        if (videoDataUri.startsWith('data:')) {
          // Handle data URI directly
          const response = await fetch(videoDataUri);
          videoBlob = await response.blob();
        } else {
          // Handle Storage URL with proper authentication
          console.log(`📥 Downloading media from Storage: ${videoDataUri}`);
          
          try {
            videoBlob = await downloadFromStorage(videoDataUri);
          } catch (downloadError) {
            console.error('❌ Storage download failed:', downloadError);
            throw new Error(`Failed to download from storage: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
          }
        }
        
        console.log(`✅ Video blob obtained: ${videoBlob.size} bytes, type: ${videoBlob.type}`);
        
      } catch (blobError) {
        console.error('❌ Failed to get video blob:', blobError);
        throw new Error(`Failed to get video data: ${blobError instanceof Error ? blobError.message : 'Unknown error'}`);
      }

      // Handle format conversion if needed
      let finalBlob = videoBlob;
      let fileName = `submission_${submissionId}`;
      let fileExtension = '.webm';
      
      if (downloadFormat === 'audio') {
        try {
          setExtractingAudio(prev => ({ ...prev, [submissionId]: true }));
          console.log(`🎵 Extracting audio from video blob (${videoBlob.size} bytes)`);
          
          finalBlob = await extractAudioFromVideo(videoBlob);
          fileExtension = '.wav';
          fileName += '_audio';
          
          console.log(`✅ Audio extraction completed: ${finalBlob.size} bytes`);
        } catch (audioError) {
          console.error('❌ Audio extraction failed:', audioError);
          throw new Error(`Failed to extract audio: ${audioError instanceof Error ? audioError.message : 'Unknown error'}`);
        } finally {
          setExtractingAudio(prev => ({ ...prev, [submissionId]: false }));
        }
      } else {
        fileName += '_video';
      }

      // Create download link
      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName + fileExtension;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ Download completed: ${fileName}${fileExtension}`);

      toast({
        title: "Success",
        description: `${downloadFormat === 'audio' ? 'Audio' : 'Video'} downloaded successfully`,
        variant: "default",
      });

    } catch (error) {
      console.error('❌ Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setDownloading(prev => ({ ...prev, [submissionId]: false }));
      setExtractingAudio(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Submission Management</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Submission Library
              </CardTitle>
              <CardDescription>
                Manage and download candidate submissions
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Search and Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by ID, candidate name, or competency..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="format">Download as:</Label>
                  <div className="flex items-center gap-4">
                    <Label className="flex items-center gap-2">
                      <Checkbox 
                        checked={downloadFormat === 'video'}
                        onCheckedChange={() => setDownloadFormat('video')}
                      />
                      <Video className="h-4 w-4" />
                      Video
                    </Label>
                    <Label className="flex items-center gap-2">
                      <Checkbox 
                        checked={downloadFormat === 'audio'}
                        onCheckedChange={() => setDownloadFormat('audio')}
                      />
                      <Mic className="h-4 w-4" />
                      Audio
                    </Label>
                  </div>
                </div>
              </div>

              {/* Submissions Table */}
              {loadingSubmissions ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading submissions...</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No submissions match your search.' : 'No submissions found.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission ID</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Competencies</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono text-sm">
                          {submission.id}
                        </TableCell>
                        <TableCell>
                          {submission.candidateName || 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {submission.competencies?.map((comp, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {comp}
                              </span>
                            )) || <span className="text-gray-500">None</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded ${
                            submission.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {submission.status || 'In Progress'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/submissions/${submission.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(submission)}
                              disabled={downloading[submission.id] || extractingAudio[submission.id]}
                            >
                              {downloading[submission.id] ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : extractingAudio[submission.id] ? (
                                <Type className="h-4 w-4 mr-1" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              {extractingAudio[submission.id] ? 'Extracting...' : 'Download'}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete submission {submission.id}? 
                                    This action cannot be undone and will permanently remove all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(submission.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Permanently
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}