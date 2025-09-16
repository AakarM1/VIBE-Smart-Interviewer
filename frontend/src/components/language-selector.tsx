/**
 * Language Selector Component
 * Allows users to choose their preferred language for the interface
 */

'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Languages, Globe, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'card' | 'inline';
  showFlag?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  showFlag = true,
  className = ''
}) => {
  const { 
    currentLanguage, 
    setLanguage, 
    supportedLanguages,
    isMultilingualEnabled,
    ready 
  } = useLanguage();
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);
  
  // Don't render if multilingual is disabled or not ready
  if (!isMultilingualEnabled || !ready) {
    return null;
  }
  
  // Don't render if only one language is supported
  if (supportedLanguages.length <= 1) {
    return null;
  }
  
  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === currentLanguage) return;
    
    setIsChanging(true);
    try {
      await setLanguage(newLanguage);
      
      const selectedLang = supportedLanguages.find(lang => lang.code === newLanguage);
      toast({
        title: 'Language Changed',
        description: `Interface language changed to ${selectedLang?.nativeName || newLanguage}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Language Change Failed',
        description: 'Could not change language. Please try again.',
      });
    } finally {
      setIsChanging(false);
    }
  };
  
  const getFlagEmoji = (languageCode: string): string => {
    const flagMap: Record<string, string> = {
      'en': '🇺🇸',
      'es': '🇪🇸',
      'ar': '🇸🇦',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'zh': '🇨🇳',
      'hi': '🇮🇳',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'ja': '🇯🇵'
    };
    return flagMap[languageCode] || '🌐';
  };
  
  if (variant === 'dropdown') {
    return (
      <div className={`language-selector ${className}`}>
        <Select 
          value={currentLanguage} 
          onValueChange={handleLanguageChange}
          disabled={isChanging}
        >
          <SelectTrigger className="w-48">
            <div className="flex items-center gap-2">
              {showFlag && (
                <span className="text-lg">{getFlagEmoji(currentLanguage)}</span>
              )}
              <Globe className="h-4 w-4" />
              <SelectValue placeholder="Select language" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {supportedLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2">
                  {showFlag && (
                    <span className="text-lg">{getFlagEmoji(lang.code)}</span>
                  )}
                  <span>{lang.nativeName}</span>
                  {lang.code === currentLanguage && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  if (variant === 'card') {
    return (
      <Card className={`language-selector-card ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Choose Your Language</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {supportedLanguages.map((lang) => (
              <Button
                key={lang.code}
                variant={lang.code === currentLanguage ? 'default' : 'outline'}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={isChanging}
                className="justify-start"
              >
                <div className="flex items-center gap-2">
                  {showFlag && (
                    <span className="text-lg">{getFlagEmoji(lang.code)}</span>
                  )}
                  <span className="text-sm">{lang.nativeName}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'inline') {
    return (
      <div className={`language-selector-inline flex items-center gap-2 ${className}`}>
        <Languages className="h-4 w-4 text-gray-500" />
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isChanging}
          className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {showFlag ? `${getFlagEmoji(lang.code)} ` : ''}{lang.nativeName}
            </option>
          ))}
        </select>
      </div>
    );
  }
  
  return null;
};
