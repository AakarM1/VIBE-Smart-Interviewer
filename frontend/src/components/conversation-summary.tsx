
"use client";

import React from 'react';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ConversationEntry, AnalysisResult, MetaCompetency, Competency, QuestionwiseDetail } from '@/types';
import { MessageSquare, ThumbsUp, ThumbsDown, BarChartHorizontal, RefreshCcw, Download, Loader2, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ConversationSummaryProps {
  analysisResult: AnalysisResult;
  history: ConversationEntry[];
  onReattempt: () => void;
  reattemptText?: string;
}

const CompetencyChart = ({ metaCompetency }: { metaCompetency: MetaCompetency }) => (
  <div className="mb-6">
    <h4 className="text-lg font-semibold mb-2 text-primary">{metaCompetency.name}</h4>
    <div className="h-40 w-full">
       <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={metaCompetency.competencies}
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <XAxis type="number" domain={[0, 10]} hide />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={120}
            tick={{ dx: -5 }}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--secondary))' }}
            contentStyle={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
             formatter={(value: number) => [`${value}/10`, 'Score']}
          />
          <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
             <LabelList dataKey="score" position="right" style={{ fill: 'hsl(var(--foreground))' }} formatter={(value: number) => `${value}/10`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Section 1: Scores Summary Table
const ScoresSummarySection = ({ scoresSummary }: { scoresSummary: any }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center">
        <BarChartHorizontal className="mr-2 h-6 w-6 text-primary" />
        Section 1: Competency Scores Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Overall Performance: <span className="font-semibold text-foreground">{scoresSummary.overallPerformance}</span></p>
        <p className="text-sm text-muted-foreground">{scoresSummary.penaltySummary}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 font-semibold">Competency</th>
              <th className="text-center p-2 font-semibold">Final Score</th>
              <th className="text-center p-2 font-semibold">Pre-Penalty</th>
              <th className="text-center p-2 font-semibold">Performance Level</th>
            </tr>
          </thead>
          <tbody>
            {scoresSummary.competencyScores.map((comp: Competency) => (
              <tr key={comp.name} className="border-b last:border-b-0">
                <td className="p-2">{comp.name}</td>
                <td className="text-center p-2 font-semibold">{comp.score}/10</td>
                <td className="text-center p-2">{comp.prePenaltyScore}/10</td>
                <td className="text-center p-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    comp.score >= 8 ? 'bg-green-100 text-green-800' :
                    comp.score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {comp.score >= 8 ? 'Excellent' : comp.score >= 6 ? 'Good' : 'Needs Improvement'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// Section 2: Qualitative Competency Summaries
const QualitativeCompetencySummary = ({ competencies }: { competencies: Competency[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center">
        <BrainCircuit className="mr-2 h-6 w-6 text-primary" />
        Section 2: Competency Analysis Summary
      </CardTitle>
      <CardDescription>Individual competency strengths and development areas</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {competencies.map((comp) => (
          <div key={comp.name} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">{comp.name}</h4>
              <span className="text-2xl font-bold text-primary">{comp.score}/10</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  Strengths
                </h5>
                <p className="text-sm text-green-700">{comp.strengthSummary || 'No specific strengths identified.'}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                <h5 className="font-semibold text-red-800 mb-2 flex items-center">
                  <ThumbsDown className="mr-1 h-4 w-4" />
                  Development Areas
                </h5>
                <p className="text-sm text-red-700">{comp.weaknessSummary || 'No specific development areas identified.'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Section 3: Question-wise Details
const QuestionwiseDetailsSection = ({ details }: { details: QuestionwiseDetail[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center">
        <MessageSquare className="mr-2 h-6 w-6 text-primary" />
        Section 3: Detailed Question-wise Analysis
      </CardTitle>
      <CardDescription>Comprehensive breakdown of each response with AI feedback</CardDescription>
    </CardHeader>
    <CardContent>
      <Accordion type="single" collapsible className="w-full">
        {details.map((detail, index) => (
          <AccordionItem value={`detail-${index}`} key={index} className="border-b border-border/50 last:border-b-0">
            <AccordionTrigger className="text-left hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <span>
                  <span className="font-semibold text-primary mr-2">Q{detail.questionNumber}:</span>
                  {detail.question.substring(0, 80)}{detail.question.length > 80 ? '...' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{detail.competency}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    detail.postPenaltyScore >= 8 ? 'bg-green-100 text-green-800' :
                    detail.postPenaltyScore >= 6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {detail.postPenaltyScore}/10
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 px-4 bg-secondary/20 rounded-b-md space-y-4">
              <div>
                <p className="font-semibold text-sm mb-1">Question:</p>
                <p className="text-muted-foreground">{detail.question}</p>
              </div>
              
              <div>
                <p className="font-semibold text-sm mb-1">Candidate's Answer:</p>
                <p className="text-muted-foreground italic">"{detail.candidateAnswer}"</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Pre-penalty Score:</span>
                    <span className="font-semibold">{detail.prePenaltyScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Final Score:</span>
                    <span className="font-semibold">{detail.postPenaltyScore}/10</span>
                  </div>
                  {detail.hasFollowUp && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Penalty Applied:</span>
                      <span className="font-semibold text-red-600">{detail.penaltyApplied}%</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Follow-up Generated:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      detail.hasFollowUp ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {detail.hasFollowUp ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <span className="text-sm font-medium">Competency:</span>
                  <span className="ml-2 text-sm">{detail.competency}</span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-sm mb-1">AI Assessment Rationale:</p>
                <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                  {detail.rationale}
                </p>
              </div>

              {detail.followUpQuestions && detail.followUpQuestions.length > 0 && (
                <div>
                  <p className="font-semibold text-sm mb-2">Follow-up Questions:</p>
                  <div className="space-y-2">
                    {detail.followUpQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                        <p className="text-sm">{q}</p>
                        {detail.followUpAnswers && detail.followUpAnswers[qIndex] && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            Answer: "{detail.followUpAnswers[qIndex]}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </CardContent>
  </Card>
);


const ConversationSummary: React.FC<ConversationSummaryProps> = ({ analysisResult, history, onReattempt, reattemptText = "Re-attempt" }) => {
  // Add debugging logs to understand the structure
  console.log('🔍 ConversationSummary received analysisResult:', analysisResult);
  console.log('🔍 Type of analysisResult:', typeof analysisResult);
  console.log('🔍 Keys in analysisResult:', analysisResult ? Object.keys(analysisResult) : 'null/undefined');
  
  // Add defensive checks for analysisResult structure
  if (!analysisResult) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center text-red-600">
          <h2 className="text-2xl font-bold mb-4">Analysis Result Missing</h2>
          <p>The analysis result is not available. Please try submitting again.</p>
          <Button onClick={onReattempt} className="mt-4">
            {reattemptText}
          </Button>
        </div>
      </div>
    );
  }

  if (!analysisResult.competencyAnalysis) {
    console.error('❌ Missing competencyAnalysis in analysisResult:', analysisResult);
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center text-red-600">
          <h2 className="text-2xl font-bold mb-4">Analysis Data Incomplete</h2>
          <p>The competency analysis data is missing. Please try submitting again.</p>
          <Button onClick={onReattempt} className="mt-4">
            {reattemptText}
          </Button>
        </div>
      </div>
    );
  }
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const isAdminView = reattemptText !== "Re-attempt";

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
        const pdfDoc = await PDFDocument.create();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        let page = pdfDoc.addPage();

        const { width, height } = page.getSize();
        const FONT_SIZE = 10;
        const PADDING = 40;
        let y = height - PADDING;

        const primaryColor = rgb(0/255, 128/255, 0/255); // Green
        const textColor = rgb(0,0,0);
        const mutedColor = rgb(0.3, 0.3, 0.3);

        const checkY = (spaceNeeded: number) => {
            if (y - spaceNeeded < PADDING) {
                page = pdfDoc.addPage();
                y = height - PADDING;
            }
        };

        const drawWrappedText = (text: string, font: PDFFont, size: number, x: number, maxWidth: number, color: any, lineHeight: number) => {
            // Clean text to remove problematic characters and normalize newlines
            const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            
            // Split by newlines first to handle paragraph breaks
            const paragraphs = cleanText.split('\n');
            
            paragraphs.forEach((paragraph, paragraphIndex) => {
                // Skip empty paragraphs but add some space
                if (paragraph.trim() === '') {
                    if (paragraphIndex > 0) {
                        y -= lineHeight * 0.5; // Half line for paragraph spacing
                    }
                    return;
                }
                
                // Process each paragraph for word wrapping
                const words = paragraph.trim().split(' ');
                let line = '';
                
                for(const word of words) {
                    const testLine = line + word + ' ';
                    try {
                        const testWidth = font.widthOfTextAtSize(testLine, size);
                        if (testWidth > maxWidth && line !== '') {
                            checkY(lineHeight);
                            page.drawText(line.trim(), { x, y, font, size, color });
                            y -= lineHeight;
                            line = word + ' ';
                        } else {
                            line = testLine;
                        }
                    } catch (error) {
                        // If we can't measure the text, just add the word and continue
                        console.warn('Error measuring text width:', error);
                        line = testLine;
                    }
                }
                
                // Draw the remaining line
                if (line.trim() !== '') {
                    checkY(lineHeight);
                    page.drawText(line.trim(), { x, y, font, size, color });
                    y -= lineHeight;
                }
                
                // Add extra space between paragraphs (except for the last one)
                if (paragraphIndex < paragraphs.length - 1) {
                    y -= lineHeight * 0.3;
                }
            });
        }

        // Title with Logo
        try {
            // Using a reliable placeholder for PDF generation to avoid fetch issues.
            const logoUrl = 'https://placehold.co/280x60/FFFFFF/000000.png?text=Logo'; 
            const logoImageBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
            const logoImage = await pdfDoc.embedPng(logoImageBytes);
            const logoHeight = 25;
            const logoWidth = 120;
            checkY(logoHeight + 20);
            page.drawImage(logoImage, { x: PADDING, y: y - logoHeight + 10, width: logoWidth, height: logoHeight });
            page.drawText('Verbal Insights Report', { x: width - PADDING - helveticaBoldFont.widthOfTextAtSize('Verbal Insights Report', 18), y, font: helveticaBoldFont, size: 18, color: primaryColor });
            y -= (logoHeight + 20);
        } catch (e) {
             console.error("Could not load logo for PDF, using text fallback.", e);
             checkY(40);
             page.drawText('Verbal Insights Report', { x: PADDING, y, font: helveticaBoldFont, size: 24, color: primaryColor });
             y -= 30;
        }


        // Summary
        checkY(20);
        page.drawText('Overall Summary', { x: PADDING, y, font: helveticaBoldFont, size: 16 });
        y -= 20;
        drawWrappedText(analysisResult.summary, helveticaFont, FONT_SIZE, PADDING, width - 2 * PADDING, textColor, 15);
        y -= 20;
        
        // Strengths
        checkY(20);
        page.drawText('Strengths', { x: PADDING, y, font: helveticaBoldFont, size: 16 });
        y -= 20;
        drawWrappedText(analysisResult.strengths, helveticaFont, FONT_SIZE, PADDING, width - 2 * PADDING, textColor, 15);
        y -= 20;

        // Weaknesses
        checkY(20);
        page.drawText('Weaknesses', { x: PADDING, y, font: helveticaBoldFont, size: 16 });
        y -= 20;
        drawWrappedText(analysisResult.weaknesses, helveticaFont, FONT_SIZE, PADDING, width - 2 * PADDING, textColor, 15);
        y -= 20;

        // Competency Scores
        checkY(40);
        page.drawText('Competency Scores', { x: PADDING, y, font: helveticaBoldFont, size: 16 });
        y -= 20;

        analysisResult.competencyAnalysis?.forEach(meta => {
            checkY(20);
            page.drawText(meta.name, { x: PADDING, y, font: helveticaBoldFont, size: 12 });
            y -= 15;
            meta.competencies.forEach(comp => {
                checkY(15);
                page.drawText(`${comp.name}: ${comp.score}/10`, { x: PADDING + 15, y, font: helveticaFont, size: FONT_SIZE });
                y -= 15;
            });
        });
        y -= 20;
        
        // Transcript
        checkY(40);
        page.drawText('Full Conversation Transcript', { x: PADDING, y, font: helveticaBoldFont, size: 16 });
        y -= 25;

        history.forEach((entry, index) => {
            checkY(40);
            drawWrappedText(`Q${index + 1}: ${entry.question}`, helveticaBoldFont, FONT_SIZE, PADDING, width - 2 * PADDING, textColor, 15);
            y -= 10;
            drawWrappedText(`A: ${entry.answer || "No answer recorded."}`, helveticaFont, FONT_SIZE, PADDING + 15, width - 2 * PADDING - 15, mutedColor, 15);
            y -= 20;
        });

        // Disclaimer
        const disclaimerText = "This AI-powered assessment is designed to provide behavioral insights for HR purposes and is not the sole basis for employment decisions. Your participation helps us improve our system.";
        const disclaimerLines = Math.ceil(helveticaFont.widthOfTextAtSize(disclaimerText, FONT_SIZE - 1) / (width - 2 * PADDING)) + 1;
        checkY(30 + disclaimerLines * 12);
        y -= 20;
        page.drawText('Disclaimer', { x: PADDING, y, font: helveticaBoldFont, size: 12, color: mutedColor });
        y -= 15;
        drawWrappedText(disclaimerText, helveticaFont, FONT_SIZE - 1, PADDING, width - 2 * PADDING, mutedColor, 12);


        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Verbal-Insights-Report.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast({
            title: "PDF Generated",
            description: "Your report has been downloaded.",
        });
    } catch(error) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: "PDF Generation Failed",
            description: "There was an issue creating the PDF file.",
        });
    } finally {
        setIsGeneratingPdf(false);
    }
  };


  return (
    <div className="w-full max-w-4xl">       
       <Card className="bg-card backdrop-blur-xl border-border shadow-xl animate-fadeIn">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex justify-center items-center mb-4 gap-2">
              <BrainCircuit className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Analysis Report</CardTitle>
          </div>
          <CardDescription>A comprehensive analysis with detailed competency assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
            {/* New Chunked Analysis Sections */}
            {analysisResult.scoresSummary && (
              <ScoresSummarySection scoresSummary={analysisResult.scoresSummary} />
            )}
            
            {analysisResult.competencyQualitativeSummary && (
              <QualitativeCompetencySummary competencies={analysisResult.competencyQualitativeSummary} />
            )}
            
            {analysisResult.questionwiseDetails && (
              <QuestionwiseDetailsSection details={analysisResult.questionwiseDetails} />
            )}

            {/* COMMENTED OUT - Legacy sections for backward compatibility (Sections 4, 5, 6, 7) */}
            {/* 
            <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-3 text-foreground font-headline flex items-center">
                <BarChartHorizontal className="mr-2 h-6 w-6 text-primary" />
                Legacy Competency Scores (For Reference)
                </h3>
                <div className="p-4 border rounded-lg bg-secondary/30 shadow-inner">
                {analysisResult.competencyAnalysis?.map(mc => (
                    <CompetencyChart key={mc.name} metaCompetency={mc} />
                )) || (
                    <p className="text-muted-foreground">No competency analysis available.</p>
                )}
                </div>
            </div>
            <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-secondary/30 shadow-inner">
                <h3 className="text-xl font-semibold mb-2 text-green-600 font-headline flex items-center">
                    <ThumbsUp className="mr-2 h-6 w-6" /> Overall Strengths
                </h3>
                <p className="text-foreground whitespace-pre-wrap text-sm">{analysisResult.strengths}</p>
                </div>
                <div className="p-4 border rounded-lg bg-secondary/30 shadow-inner">
                <h3 className="text-xl font-semibold mb-2 text-red-600 font-headline flex items-center">
                    <ThumbsDown className="mr-2 h-6 w-6" /> Overall Weaknesses
                </h3>
                <p className="text-foreground whitespace-pre-wrap text-sm">{analysisResult.weaknesses}</p>
                </div>
                <div className="p-4 border rounded-lg bg-secondary/30 shadow-inner">
                <h3 className="text-xl font-semibold mb-2 text-foreground font-headline">Overall Summary:</h3>
                <p className="text-foreground whitespace-pre-wrap text-sm">{analysisResult.summary}</p>
                </div>
            </div>
             <div>
              <h3 className="text-xl font-semibold mb-3 text-foreground font-headline flex items-center">
              <MessageSquare className="mr-2 h-6 w-6 text-primary" />
              Legacy Full Conversation Transcript:
              </h3>
              <Accordion type="single" collapsible className="w-full">
              {history.map((entry, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="border-b border-border/50 last:border-b-0">
                  <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-primary mr-2">Q{index + 1}:</span> {entry.question}
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 px-4 bg-secondary/20 rounded-b-md space-y-4">
                      <div>
                      <p className="font-semibold text-sm mb-1">Candidate's Answer:</p>
                      <p className="text-muted-foreground italic">
                          {entry.answer ? `"${entry.answer}"` : "No answer recorded."}
                      </p>
                      </div>
                      {entry.videoDataUri && (
                      <div>
                          <p className="font-semibold text-sm mb-1">Recording:</p>
                          {(entry.videoDataUri.startsWith('data:video') || entry.videoDataUri.includes('_video.')) ? (
                              <video controls src={entry.videoDataUri} className="mt-2 w-full rounded-md" />
                          ) : (
                              <audio controls src={entry.videoDataUri} className="mt-2 w-full" />
                          )}
                      </div>
                      )}
                  </AccordionContent>
                  </AccordionItem>
              ))}
              </Accordion>
          </div>
          */}
        </CardContent>
          <CardFooter className="flex-col sm:flex-row items-center justify-between gap-4 pt-6">
              <p className="text-xs text-muted-foreground">This analysis is AI-generated and includes follow-up penalty calculations for comprehensive assessment.</p>
              <div className="flex gap-2">
                <Button onClick={handleDownloadPdf} variant="outline" disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button onClick={onReattempt} variant="outline">
                    <RefreshCcw className="mr-2 h-4 w-4" /> {reattemptText}
                </Button>
              </div>
          </CardFooter>
      </Card>
    </div>
  );
};

export default ConversationSummary;

    