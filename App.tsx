import React, { useState } from 'react';
import { AppView } from './types.ts';
import { DesignerSetup } from './components/DesignerSetup.tsx';
import { ReviewWorkspace } from './components/ReviewWorkspace.tsx';
import { SparklesIcon } from './components/Icons.tsx';

const LandingPage: React.FC<{ onDesignerStart: () => void }> = ({ onDesignerStart }) => {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-100 p-8">
            <div className="text-center max-w-2xl">
                <div className="inline-flex items-center justify-center bg-white p-4 rounded-full shadow-lg mb-6">
                    <SparklesIcon className="w-10 h-10 text-indigo-500" />
                </div>
                <h1 className="text-5xl font-extrabold text-slate-800 mb-4 leading-tight">
                    ビジョンとデザインの<br/>ギャップを埋める
                </h1>
                <p className="text-lg text-slate-600 mb-8">
                    デザインブリッジは、「もっとシュッと」のような曖昧なクライアントのフィードバックを、AIが実行可能なデザイン提案に翻訳し、より明確なコミュニケーションと迅速な修正を促進します。
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onDesignerStart} className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 flex items-center gap-2">
                        デザイナーとして始める
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
                        </svg>
                    </button>
                </div>
                 <div className="mt-12 text-slate-500 text-sm">
                    <p>デモのため、「クライアントビュー」はデザイナーのワークスペース内で切り替え可能です。</p>
                </div>
            </div>
        </div>
    );
};


function App() {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);

  const handleStartReview = (url: string) => {
    // Figma embed URLs need a specific format
    const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    setFigmaUrl(embedUrl);
    setView(AppView.REVIEW_WORKSPACE);
  };
  
  const handleExitWorkspace = () => {
    setFigmaUrl(null);
    setView(AppView.DESIGNER_SETUP);
  }

  const renderContent = () => {
    switch (view) {
      case AppView.LANDING:
        return <LandingPage onDesignerStart={() => setView(AppView.DESIGNER_SETUP)} />;
      case AppView.DESIGNER_SETUP:
        return <DesignerSetup onStartReview={handleStartReview} />;
      case AppView.REVIEW_WORKSPACE:
        if (figmaUrl) {
          return <ReviewWorkspace figmaUrl={figmaUrl} onExit={handleExitWorkspace} />;
        }
        // Fallback if URL is missing
        setView(AppView.DESIGNER_SETUP);
        return null;
      default:
        return <LandingPage onDesignerStart={() => setView(AppView.DESIGNER_SETUP)} />;
    }
  };

  return <div className="h-screen w-screen">{renderContent()}</div>;
}

export default App;