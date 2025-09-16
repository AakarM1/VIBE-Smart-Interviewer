
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InterviewMode } from '@/types';

interface MediaCaptureProps {
  onRecordingComplete: (mediaBlob: Blob, mediaDataUri: string) => void;
  isRecordingExternally: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
  captureMode: InterviewMode;
}

const MediaCapture: React.FC<MediaCaptureProps> = ({
  onRecordingComplete,
  isRecordingExternally,
  onStartRecording,
  onStopRecording,
  disabled,
  captureMode,
}) => {
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);
  const mediaRecorderRef = useRef<globalThis.MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const getMediaPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        toast({
          variant: 'destructive',
          title: 'Unsupported Browser',
          description: 'Your browser does not support media recording.',
        });
        return;
      }
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: captureMode === 'video' 
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        setHasPermission(true);
        if (videoRef.current && captureMode === 'video') {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setHasPermission(false);
        toast({
          variant: 'destructive',
          title: 'Permissions Denied',
          description: 'Please enable camera and microphone permissions in your browser settings.',
        });
      }
    };
    getMediaPermission();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast, captureMode]);

  const blobToDataURI = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URI.'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    if (!hasPermission || !stream) {
      toast({
        variant: "destructive",
        title: "Cannot Record",
        description: "Permissions are required and the camera/microphone stream must be active.",
      });
      return;
    }
    try {
      onStartRecording();
      setIsRecordingInternal(true);
      const mimeType = captureMode === 'video' ? 'video/webm' : 'audio/webm';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      mediaChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        mediaChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const completeBlob = new Blob(mediaChunksRef.current, { type: mimeType });
        try {
          const dataUri = await blobToDataURI(completeBlob);
          onRecordingComplete(completeBlob, dataUri);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error converting recording",
            description: "Could not process the recorded media.",
          });
        }
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: "Could not start recording. Please check permissions and devices.",
      });
      setIsRecordingInternal(false);
      onStopRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingInternal(false);
    onStopRecording();
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-border flex items-center justify-center">
          {captureMode === 'video' ? (
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
                <Mic className="h-16 w-16" />
                <p className="mt-4 text-lg font-semibold">Audio Recording Mode</p>
            </div>
          )}
          {!hasPermission && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                <VideoOff className="h-12 w-12 mb-4" />
                <p className="text-center font-semibold">Media access denied.</p>
                <p className="text-center text-sm text-muted-foreground">Please enable permissions in your browser settings and refresh the page.</p>
             </div>
          )}
      </div>

      {isRecordingInternal ? (
        <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full sm:w-auto" disabled={disabled}>
          <Square className="mr-2 h-5 w-5" /> Stop Recording
        </Button>
      ) : (
        <Button onClick={startRecording} variant="destructive" size="lg" className="w-full sm:w-auto" disabled={disabled || isRecordingExternally || !hasPermission}>
          {captureMode === 'video' ? <Video className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
           Record Answer
        </Button>
      )}
      {isRecordingInternal && <p className="text-sm text-primary animate-pulse">Recording...</p>}
    </div>
  );
};

export default MediaCapture;
