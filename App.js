import React, { useState } from 'react';
import { AppView } from './types.js';
import { SparklesIcon } from './components/Icons.js';

const LandingPage = ({ onDesignerStart }) => {
    return React.createElement('div', { className: "h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-100 p-8" },
        React.createElement('div', { className: "text-center max-w-2xl" },
            React.createElement('div', { className: "inline-flex items-center justify-center bg-white p-4 rounded-full shadow-lg mb-6" },
                React.createElement(SparklesIcon, { className: "w-10 h-10 text-indigo-500" })
            ),
            React.createElement('h1', { className: "text-5xl font-extrabold text-slate-800 mb-4 leading-tight" },
                "ビジョンとデザインの",
                React.createElement('br'),
                "ギャップを埋める"
            ),
            React.createElement('p', { className: "text-lg text-slate-600 mb-8" },
                "デザインブリッジは、「もっとシュッと」のような曖昧なクライアントのフィードバックを、AIが実行可能なデザイン提案に翻訳し、より明確なコミュニケーションと迅速な修正を促進します。"
            ),
            React.createElement('div', { className: "flex justify-center gap-4" },
                React.createElement('button', {
                    onClick: onDesignerStart,
                    className: "px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 flex items-center gap-2"
                },
                    "デザイナーとして始める",
                    React.createElement('svg', {
                        xmlns: "http://www.w3.org/2000/svg",
                        fill: "none",
                        viewBox: "0 0 24 24",
                        strokeWidth: 2,
                        stroke: "currentColor",
                        className: "w-6 h-6"
                    }, React.createElement('path', {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        d: "M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
                    }))
                )
            ),
            React.createElement('div', { className: "mt-12 text-slate-500 text-sm" },
                React.createElement('p', null, "デモのため、「クライアントビュー」はデザイナーのワークスペース内で切り替え可能です。")
            )
        )
    );
};

function App() {
  const [view, setView] = useState(AppView.LANDING);
  const [figmaUrl, setFigmaUrl] = useState(null);

  const handleStartReview = (url) => {
    const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    setFigmaUrl(embedUrl);
    setView(AppView.REVIEW_WORKSPACE);
  };
  
  const handleExitWorkspace = () => {
    setFigmaUrl(null);
    setView(AppView.DESIGNER_SETUP);
  };

  const renderContent = () => {
    switch (view) {
      case AppView.LANDING:
        return React.createElement(LandingPage, { onDesignerStart: () => setView(AppView.DESIGNER_SETUP) });
      case AppView.DESIGNER_SETUP:
        return React.createElement('div', { className: "p-8" }, 
          React.createElement('h2', null, "デザイナー設定画面（開発中）")
        );
      case AppView.REVIEW_WORKSPACE:
        if (figmaUrl) {
          return React.createElement('div', { className: "p-8" }, 
            React.createElement('h2', null, "レビューワークスペース（開発中）")
          );
        }
        setView(AppView.DESIGNER_SETUP);
        return null;
      default:
        return React.createElement(LandingPage, { onDesignerStart: () => setView(AppView.DESIGNER_SETUP) });
    }
  };

  return React.createElement('div', { className: "h-screen w-screen" }, renderContent());
}

export default App;