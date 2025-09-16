'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data for competencies - in a real app, this would come from a DB
const competencies = [
  { id: 'problem-solving', name: 'Problem Solving', meta: 'Core Skills' },
  { id: 'communication', name: 'Communication', meta: 'Core Skills' },
  { id: 'teamwork', name: 'Teamwork', meta: 'Core Skills' },
  { id: 'adaptability', name: 'Adaptability', meta: 'Core Skills' },
  { id: 'initiative', name: 'Initiative', meta: 'Professionalism' },
  { id: 'dependability', name: 'Dependability', meta: 'Professionalism' },
  { id: 'domain-knowledge', name: 'Domain Knowledge', meta: 'Role-Specific' },
];

interface StarterQuestion {
  id: number;
  text: string;
  competency: string;
}

const PDFConfigPage = () => {
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<StarterQuestion[]>([
    { id: 1, text: '', competency: '' }
  ]);

  const handleQuestionChange = (id: number, field: 'text' | 'competency', value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Date.now(), text: '', competency: '' }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || questions.some(q => !q.text || !q.competency)) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Form',
        description: 'Please upload a PDF and fill out all starter questions and their competencies.',
      });
      return;
    }
    console.log({
      pdfFile: pdfFile.name,
      questions,
    });
    toast({
      title: 'Configuration Saved!',
      description: 'The PDF-based interview has been successfully saved (simulation).',
    });
  };

  return (
    <div className="p-4 sm:p-8 mt-20">
      <header className="mb-8">
        <h1 className="text-4xl font-headline text-primary flex items-center gap-4">
          <FileText className="h-10 w-10" />
          PDF-Based Interview Configuration
        </h1>
        <p className="text-muted-foreground">Set up interviews based on uploaded PDF documents.</p>
      </header>
      <main>
        <form onSubmit={handleSubmit}>
          <Card className="bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Define PDF Interview</CardTitle>
              <CardDescription>
                Upload a PDF (e.g., a case study or resume) and define starter questions mapped to competencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">Upload PDF Document</Label>
                <Input id="pdf-upload" type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)} required className="pt-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"/>
              </div>

              <div className="space-y-4">
                <Label>Starter Questions</Label>
                {questions.map((q, index) => (
                  <div key={q.id} className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-md">
                    <div className="flex-grow w-full space-y-2">
                       <Label htmlFor={`question-text-${q.id}`} className="sr-only">Question Text</Label>
                       <Input 
                         id={`question-text-${q.id}`}
                         placeholder={`Starter Question ${index + 1}`}
                         value={q.text}
                         onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                         required
                       />
                       <Label htmlFor={`question-competency-${q.id}`} className="sr-only">Competency</Label>
                       <Select
                         value={q.competency}
                         onValueChange={(value) => handleQuestionChange(q.id, 'competency', value)}
                         required
                       >
                         <SelectTrigger id={`question-competency-${q.id}`}>
                           <SelectValue placeholder="Select a competency" />
                         </SelectTrigger>
                         <SelectContent>
                           {competencies.map(c => (
                             <SelectItem key={c.id} value={c.id}>{c.name} ({c.meta})</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>
                    {questions.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} type="button">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addQuestion} type="button">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="ml-auto">
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
};

const ProtectedPDFConfigPage = () => {
  return (
    <ProtectedRoute>
      <PDFConfigPage />
    </ProtectedRoute>
  )
}

export default ProtectedPDFConfigPage;
