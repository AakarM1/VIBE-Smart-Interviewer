/**
 * 🔒 MINIMAL IMPACT SESSION RECOVERY - Optional recovery UI
 * Only appears when recovery is available and enabled
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Circle } from 'lucide-react';
import type { SessionRecovery } from '@/types/partial-submission';

interface SessionRecoveryModalProps {
  isOpen: boolean;
  recovery: SessionRecovery | null;
  onResume: (sessionId: string) => void;
  onStartNew: () => void;
  onClose: () => void;
}

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  isOpen,
  recovery,
  onResume,
  onStartNew,
  onClose
}) => {
  if (!recovery) {
    return null;
  }
  
  const formatTimeAgo = (date: Date): string => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hours ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };
  
  const progressPercentage = Math.round((recovery.completedQuestions / recovery.totalQuestions) * 100);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Resume Your Interview?
          </DialogTitle>
          <DialogDescription>
            We found an incomplete {recovery.interviewType} interview from{' '}
            <span className="font-medium">
              {formatTimeAgo(recovery.lastActivityAt)}
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress Overview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <Badge variant="secondary">
                {recovery.completedQuestions} of {recovery.totalQuestions} completed
              </Badge>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <p className="text-xs text-gray-600 mt-2">
              {progressPercentage}% complete
            </p>
          </div>
          
          {/* Question Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Question Status</h4>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: recovery.totalQuestions }, (_, index) => {
                const isCompleted = recovery.partialSubmissions.some(
                  p => p.questionIndex === index
                );
                const isCurrent = index === recovery.lastQuestionIndex + 1;
                
                return (
                  <div 
                    key={index}
                    className={`
                      flex items-center justify-center p-2 rounded-md text-xs font-medium
                      ${isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : isCurrent
                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                    <span className="ml-1">Q{index + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Recovery Info */}
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p>
              <strong>Interview:</strong> {recovery.candidateName} - {recovery.interviewType}
            </p>
            <p>
              <strong>Started:</strong> {recovery.startedAt.toLocaleString()}
            </p>
            <p>
              <strong>Last Activity:</strong> {recovery.lastActivityAt.toLocaleString()}
            </p>
          </div>
          
          {!recovery.canResume && (
            <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p>
                <strong>Note:</strong> This session is older than 24 hours. 
                You can still resume, but some data may need to be re-entered.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onStartNew}
            className="flex-1"
          >
            Start New Interview
          </Button>
          <Button
            onClick={() => onResume(recovery.sessionId)}
            className="flex-1"
          >
            Resume from Question {recovery.lastQuestionIndex + 2}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
