/**
 * Transcription Queue Status Component
 * 
 * Displays real-time queue information and transcription status to users
 */

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useTranscriptionQueue } from '@/hooks/use-ai-queue';

interface TranscriptionQueueStatusProps {
  showDetails?: boolean;
  onCancel?: () => void;
}

export function TranscriptionQueueStatus({ 
  showDetails = false,
  onCancel 
}: TranscriptionQueueStatusProps) {
  const { transcriptionState, queueStats } = useTranscriptionQueue();

  if (!transcriptionState && !showDetails) {
    return null; // Don't show component if no active transcription and details not requested
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'queued': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'retry_scheduled': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'retry_scheduled': return 'Retrying';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'retry_scheduled': return <RefreshCw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Transcription Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Transcription Status */}
        {transcriptionState && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(transcriptionState.isQueued ? 'queued' : 
                             transcriptionState.isProcessing ? 'processing' :
                             transcriptionState.isCompleted ? 'completed' : 'failed')}
                <span className="font-medium">Your Request</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={getStatusColor(transcriptionState.isQueued ? 'queued' : 
                                          transcriptionState.isProcessing ? 'processing' :
                                          transcriptionState.isCompleted ? 'completed' : 'failed')}
                >
                  {getStatusText(transcriptionState.isQueued ? 'queued' : 
                               transcriptionState.isProcessing ? 'processing' :
                               transcriptionState.isCompleted ? 'completed' : 'failed')}
                </Badge>
                
                {onCancel && (transcriptionState.isQueued || transcriptionState.isProcessing) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Information */}
            {transcriptionState.isQueued && (
              <div className="space-y-2">
                {transcriptionState.queuePosition !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    Position in queue: #{transcriptionState.queuePosition}
                  </div>
                )}
                
                {transcriptionState.estimatedWaitTime !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    Estimated wait: {transcriptionState.estimatedWaitTime} seconds
                  </div>
                )}
              </div>
            )}

            {transcriptionState.isProcessing && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Processing your audio... (Attempt {transcriptionState.attempts}/{transcriptionState.maxAttempts})
                </div>
                <Progress value={65} className="h-2" /> {/* Indeterminate progress */}
              </div>
            )}

            {transcriptionState.isFailed && transcriptionState.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {transcriptionState.error}
              </div>
            )}
          </div>
        )}

        {/* Queue Statistics */}
        {showDetails && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="font-medium text-sm">Queue Statistics</h4>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-semibold text-blue-600">{queueStats.queueSize}</div>
                <div className="text-blue-500">Queued</div>
              </div>
              
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="font-semibold text-yellow-600">{queueStats.processing}</div>
                <div className="text-yellow-500">Processing</div>
              </div>
              
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-semibold text-green-600">{queueStats.completed}</div>
                <div className="text-green-500">Completed</div>
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {queueStats.queueSize === 0 && queueStats.processing === 0 ? (
            <span className="text-green-600">✓ System ready for new requests</span>
          ) : (
            <span>Processing {queueStats.processing} requests, {queueStats.queueSize} in queue</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
