import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { X, CheckCircle2, ChevronRight, HelpCircle, BrainCircuit, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useDarwinity } from '@/contexts/DarwinityStoreContext';

export function LessonView() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  const courseIdParam = params.courseId;
  const lessonIdParam = params.lessonId;
  
  const courseIdNum = Number(courseIdParam);
  const lessonIdNum = Number(lessonIdParam);
  const isTrpc = !isNaN(courseIdNum) && !isNaN(lessonIdNum);
  
  const [blocks, setBlocks] = useState<any[]>([]);
  const [generating, setGenerating] = useState(true);
  
  const { state: darwinityState } = useDarwinity();
  const generateLesson = trpc.study.generateLesson.useMutation();

  useEffect(() => {
    if (isTrpc) {
      generateLesson.mutateAsync({ courseId: courseIdNum, lessonId: lessonIdNum })
        .then(res => {
          if (res.success && res.blocks) {
            setBlocks(res.blocks);
          } else {
            console.error("Failed to generate lesson:", res.error);
          }
          setGenerating(false);
        })
        .catch(err => {
          console.error(err);
          setGenerating(false);
        });
    } else {
      // Find in DarwinityStore
      const course = darwinityState.courses.find(c => c.id === courseIdParam);
      const lesson = course?.lessons?.find(l => l.id === lessonIdParam);
      if (lesson && lesson.blocks) {
        setBlocks(lesson.blocks);
      }
      setGenerating(false);
    }
  }, [courseIdParam, lessonIdParam, isTrpc]);
  
  const [currentBlockIdx, setCurrentBlockIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  if (generating) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-800">Generating Personalized Lesson...</h2>
        <p className="text-gray-500 mt-2">AI is reading the source material to create interactive content.</p>
      </div>
    );
  }

  if (blocks.length === 0) return <div className="p-10 text-center text-gray-500 font-medium mt-10">This lesson could not be generated.</div>;

  const currentBlock = blocks[currentBlockIdx];
  const isLastBlock = currentBlockIdx === blocks.length - 1;

  const markLessonComplete = trpc.study.markLessonComplete.useMutation();

  const handleNext = () => {
    if (isLastBlock) {
      if (isTrpc) {
        // Mark as completed via TRPC
        markLessonComplete.mutateAsync({
          courseId: courseIdNum,
          lessonId: lessonIdNum,
          score: 100 // mock score for now
        }).finally(() => {
          setLocation(`/courses/${courseIdParam}`);
        });
      } else {
        setLocation(`/courses/${courseIdParam}`);
      }
    } else {
      setCurrentBlockIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOption(idx);
    setIsAnswerRevealed(true);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Topbar */}
      <header className="h-16 border-b border-gray-100 flex items-center px-6 justify-between shrink-0">
        <button 
          onClick={() => setLocation(`/courses/${courseIdParam}`)}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
        >
          <X size={20} />
        </button>
        
        <div className="flex-1 max-w-xl mx-8">
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentBlockIdx + 1) / blocks.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 font-bold text-gray-600">
          <HelpCircle size={20} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex justify-center pb-32">
        <div className="w-full max-w-2xl px-6 pt-12">
          
          {currentBlock?.type === 'concept' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-6">{currentBlock.title}</h2>
              <div className="text-xl text-gray-800 leading-relaxed font-medium">
                {currentBlock.content}
              </div>
            </div>
          )}

          {currentBlock?.type === 'quiz' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <BrainCircuit size={20} />
                </div>
                <span className="text-sm font-extrabold text-purple-700 uppercase tracking-widest">Knowledge Check</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-8">{currentBlock.question}</h2>
              
              <div className="space-y-3">
                {currentBlock.options?.map((opt: string, idx: number) => {
                  const isCorrect = idx === currentBlock.correctIndex;
                  const isSelected = selectedOption === idx;
                  
                  let stateClass = "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50";
                  if (isAnswerRevealed) {
                    if (isCorrect) stateClass = "bg-green-50 border-green-500 text-green-900 font-bold";
                    else if (isSelected) stateClass = "bg-red-50 border-red-500 text-red-900";
                    else stateClass = "bg-white border-gray-200 opacity-50";
                  } else if (isSelected) {
                    stateClass = "bg-blue-50 border-blue-500";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={isAnswerRevealed}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${stateClass}`}
                    >
                      <span className="text-lg">{opt}</span>
                      {isAnswerRevealed && isCorrect && <CheckCircle2 className="text-green-500" />}
                      {isAnswerRevealed && isSelected && !isCorrect && <X className="text-red-500" />}
                    </button>
                  );
                })}
              </div>
              
              {isAnswerRevealed && currentBlock.feedback && (
                <div className={`mt-6 p-5 rounded-xl border ${selectedOption === currentBlock.correctIndex ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <p className="font-medium text-lg">{currentBlock.feedback}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`fixed bottom-0 left-0 right-0 p-6 border-t transition-colors duration-300 ${
        isAnswerRevealed && selectedOption === currentBlock.correctIndex ? 'bg-green-100 border-green-200' : 
        isAnswerRevealed ? 'bg-red-100 border-red-200' : 'bg-white border-gray-100'
      }`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            {isAnswerRevealed && selectedOption === currentBlock.correctIndex && (
              <div className="flex items-center gap-3 text-green-700">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-500" />
                </div>
                <div className="font-extrabold text-2xl">Excellent!</div>
              </div>
            )}
            {isAnswerRevealed && selectedOption !== currentBlock.correctIndex && (
              <div className="flex items-center gap-3 text-red-700">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <X size={28} className="text-red-500" />
                </div>
                <div className="font-extrabold text-2xl">Not quite.</div>
              </div>
            )}
          </div>
          
          <Button 
            size="lg" 
            onClick={handleNext}
            disabled={currentBlock?.type === 'quiz' && !isAnswerRevealed}
            className={`px-12 py-6 text-xl rounded-2xl font-bold shadow-sm transition-all ${
              isAnswerRevealed && selectedOption === currentBlock.correctIndex ? 'bg-green-500 hover:bg-green-600 text-white' : 
              isAnswerRevealed ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isLastBlock ? 'Finish Lesson' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
