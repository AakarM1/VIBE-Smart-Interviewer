'use client';

import { useState, useEffect } from 'react';
import { X, Database, HardDrive } from 'lucide-react';
import { getStorageConfig } from '@/lib/storage-config';

export default function StorageNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    storageType: 'firestore' | 'localStorage';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Only show notification on client side
    if (typeof window !== 'undefined') {
      const config = getStorageConfig();
      setStorageInfo({
        storageType: config.storageType,
        message: config.message
      });
      
      // Console log for debugging
      console.log('🗄️ Storage Configuration:', {
        type: config.storageType,
        useFirestore: config.useFirestore,
        message: config.message
      });
      
      // Show notification for 8 seconds
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible || !storageInfo) return null;

  const isFirestore = storageInfo.storageType === 'firestore';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`
        p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300
        ${isFirestore 
          ? 'bg-green-50/90 border-green-200 text-green-800' 
          : 'bg-blue-50/90 border-blue-200 text-blue-800'
        }
      `}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isFirestore ? (
              <Database className="h-5 w-5 text-green-600" />
            ) : (
              <HardDrive className="h-5 w-5 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">
              Storage Mode: {isFirestore ? 'Cloud Database' : 'Local Storage'}
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              {storageInfo.message}
            </p>
            {!isFirestore && (
              <p className="text-xs opacity-75 mt-2 italic">
                Data is stored locally and won't be shared across devices
              </p>
            )}
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
