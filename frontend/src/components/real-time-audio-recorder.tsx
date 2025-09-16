"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InterviewMode } from '@/types';

interface RealTimeMediaCaptureProps {
  onRecordingComplete: (mediaBlob: Blob, mediaDataUri: string) => void;
  onRealtimeTranscription: (transcription: string) => void;
  isRecordingExternally: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
  captureMode: InterviewMode;
}

// Declare the webkitSpeechRecognition interface for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const RealTimeMediaCapture: React.FC<RealTimeMediaCaptureProps> = ({
  onRecordingComplete,
  onRealtimeTranscription,
  isRecordingExternally,
  onStartRecording,
  onStopRecording,
  disabled,
  captureMode,
}) => {
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);
  const mediaRecorderRef = useRef<globalThis.MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupportsSpeechRecognition(!!SpeechRecognition);
  }, []);

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

  const startSpeechRecognition = useCallback(() => {
    if (!supportsSpeechRecognition) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const currentText = finalTranscript + interimTranscript;
      setCurrentTranscription(currentText);
      onRealtimeTranscription(currentText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please allow microphone access for real-time transcription.',
        });
      }
    };

    recognition.onend = () => {
      // Auto-restart if still recording
      if (isRecordingInternal) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
    };

    speechRecognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        variant: 'destructive',
        title: 'Speech Recognition Error',
        description: 'Could not start real-time transcription. Recording will continue without live transcription.',
      });
    }
  }, [supportsSpeechRecognition, isRecordingInternal, onRealtimeTranscription, toast]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
  }, []);

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
      setCurrentTranscription('');
      
      // Start speech recognition for real-time transcription
      if (supportsSpeechRecognition) {
        startSpeechRecognition();
      } else {
        toast({
          title: 'Real-time Transcription Unavailable',
          description: 'Your browser does not support real-time transcription. Audio will be transcribed after recording.',
        });
      }

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
    // Stop speech recognition
    stopSpeechRecognition();
    
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
                {!supportsSpeechRecognition && (
                  <p className="mt-2 text-sm text-yellow-300">
                    Real-time transcription not supported in this browser
                  </p>
                )}
            </div>
          )}
          {!hasPermission && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                <VideoOff className="h-12 w-12 mb-4" />
                <p className="text-center font-semibold">Media access denied.</p>
                <p className="text-center text-sm text-muted-foreground">Please enable permissions in your browser settings and refresh the page.</p>
             </div>
          )}
          {isRecordingInternal && supportsSpeechRecognition && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/70 text-white p-2 rounded-lg text-sm">
                <span className="text-green-400 animate-pulse">● </span>
                Live transcription active
              </div>
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
      {isRecordingInternal && (
        <div className="text-center">
          <p className="text-sm text-primary animate-pulse">Recording...</p>
          {supportsSpeechRecognition && (
            <p className="text-xs text-gray-500 mt-1">Real-time transcription enabled</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeMediaCapture;
