import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { customFetch } from "@/lib/api-client";
import LatexRenderer from "@/components/latex-renderer";
import { Printer, Download, Eye, EyeOff, Loader2, BookOpen, CheckCircle2, Award } from "lucide-react";

interface Question {
  id: number;
  text: string;
  type: string;
  options?: string[] | null;
  points: number;
  difficulty?: string | null;
  hints?: string[];
  referenceSolution?: string | null;
}

interface ContestPaperData {
  exam: {
    id: number;
    title: string;
    description?: string | null;
    subject?: string | null;
    topic?: string | null;
    durationMinutes: number;
    contestType: string;
    instructorName?: string | null;
    institutionName?: string | null;
    questionCount: number;
  };
  questions: Question[];
}

export interface ContestPaperModalProps {
  examId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContestPaperModal({ examId, isOpen, onClose }: ContestPaperModalProps) {
  const [data, setData] = useState<ContestPaperData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    if (!isOpen || !examId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    customFetch<ContestPaperData>(`/exams/${examId}/printable`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to load printable paper:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, examId]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const totalPoints = data?.questions.reduce((sum, q) => sum + (q.points || 1), 0) || 0;
  const isMock = data?.exam.contestType === "mock_test";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
        {/* Modal Toolbar - Hidden during print */}
        <DialogHeader className="px-6 py-4 bg-white border-b flex flex-row items-center justify-between print:hidden">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Contest Paper Preview &amp; Download
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Official printable format with LaTeX typography and student working space.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isMock && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHints(!showHints)}
                  className="text-xs h-8 border-slate-300"
                >
                  {showHints ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showHints ? "Hide Hints" : "Include Hints"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSolutions(!showSolutions)}
                  className="text-xs h-8 border-slate-300"
                >
                  {showSolutions ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showSolutions ? "Hide Solutions" : "Include Solutions"}
                </Button>
              </>
            )}

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 font-semibold shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save as PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Printable Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Typesetting Contest Paper...</p>
            </div>
          ) : !data ? (
            <div className="text-center py-20 text-slate-500">
              <p>Unable to load contest paper. Please ensure this contest is public or shared with you.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white border border-slate-300/80 shadow-md print:shadow-none print:border-none p-8 sm:p-12 text-slate-900 font-serif leading-relaxed">
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-6 mb-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold font-sans text-xs">
                    ER
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-wide uppercase">
                    EduReach Assessment Series
                  </h1>
                </div>
                <h2 className="text-lg font-bold text-slate-800 font-sans mt-1">
                  {data.exam.title}
                </h2>
                <div className="flex items-center justify-center gap-4 text-xs font-sans text-slate-600 mt-2">
                  <span><strong>Discipline:</strong> {data.exam.subject || "Academic & Olympiad"}</span>
                  <span>•</span>
                  <span><strong>Time Allowed:</strong> {data.exam.durationMinutes} Minutes</span>
                  <span>•</span>
                  <span><strong>Total Marks:</strong> {totalPoints} Points</span>
                </div>
                {data.exam.institutionName && (
                  <p className="text-[11px] font-sans text-slate-500 mt-1 italic">
                    Organized by {data.exam.institutionName}
                  </p>
                )}
              </div>

              {/* Student Identification Box */}
              <div className="border border-slate-400 p-4 mb-8 text-xs font-sans rounded-xs bg-slate-50/50">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="font-semibold text-slate-700">Student Name:</span>
                    <div className="border-b border-slate-400 border-dotted mt-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Index / Student ID:</span>
                    <div className="border-b border-slate-400 border-dotted mt-4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-slate-700">School / Center:</span>
                    <div className="border-b border-slate-400 border-dotted mt-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Candidate Signature:</span>
                    <div className="border-b border-slate-400 border-dotted mt-4" />
                  </div>
                </div>
              </div>

              {/* General Instructions */}
              <div className="mb-8 p-4 border-l-4 border-slate-800 bg-slate-50 text-xs font-sans space-y-1 text-slate-700">
                <p className="font-bold text-slate-900 uppercase">Instructions to Candidates:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  <li>Write your name and identification number clearly in the spaces provided above.</li>
                  <li>Attempt all questions. Full marks are awarded only for clear, logical, and complete mathematical proofs.</li>
                  <li>Electronic calculators and mathematical tables are strictly NOT permitted.</li>
                  <li>All scratch work must be done on the provided paper or supplementary answer sheets.</li>
                </ul>
              </div>

              {/* Questions List */}
              <div className="space-y-8">
                {data.questions.map((q, idx) => (
                  <div key={q.id} className="pt-4 border-t border-slate-200 break-inside-avoid">
                    <div className="flex items-start justify-between gap-3 mb-2 font-sans">
                      <div className="font-bold text-sm text-slate-900">
                        Problem {idx + 1}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        [{q.points || 1} {q.points === 1 ? "Mark" : "Marks"}]
                      </div>
                    </div>

                    <div className="text-sm leading-relaxed text-slate-800 my-2 font-serif">
                      <LatexRenderer text={q.text} />
                    </div>

                    {/* Multiple Choice Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs font-sans">
                        {q.options.map((opt, oi) => {
                          const letter = String.fromCharCode(65 + oi);
                          return (
                            <div key={oi} className="flex items-start gap-2 p-2 border border-slate-200 rounded">
                              <span className="font-bold text-slate-700">({letter})</span>
                              <div className="text-slate-800">
                                <LatexRenderer text={opt} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Proof / Written Work Space */}
                    {(q.type === "essay" || q.type === "short_answer" || !q.options?.length) && (
                      <div className="mt-4 border border-dashed border-slate-300 rounded p-4 bg-slate-50/30 text-[11px] font-sans text-slate-400 min-h-[120px] flex flex-col justify-between">
                        <span className="italic uppercase font-medium">Working &amp; Proof Solution:</span>
                        <div className="text-right text-[10px] text-slate-400">
                          (Attach handwritten proof scan or continue on supplementary page)
                        </div>
                      </div>
                    )}

                    {/* Hints (if enabled) */}
                    {showHints && q.hints && q.hints.length > 0 && (
                      <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded text-xs font-sans text-amber-900">
                        <span className="font-bold">Coach's Hint:</span>
                        <div className="mt-1 space-y-1">
                          {q.hints.map((h, hi) => (
                            <div key={hi}>
                              • <LatexRenderer text={h} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Solutions (if enabled) */}
                    {showSolutions && q.referenceSolution && (
                      <div className="mt-3 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded text-xs font-sans text-indigo-950">
                        <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          Model Solution &amp; Rubric:
                        </span>
                        <div className="mt-1.5 leading-relaxed text-indigo-900 font-serif">
                          <LatexRenderer text={q.referenceSolution} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-slate-400 text-center text-[10px] font-sans text-slate-500">
                EduReach Assessment &amp; Olympiad Program • Official Examination Document • edureach.site
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContestPaperModal;
