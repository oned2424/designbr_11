import React, { useState } from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';

// Types and Constants
const AppView = {
    LANDING: 'LANDING',
    DESIGNER_SETUP: 'DESIGNER_SETUP', 
    REVIEW_WORKSPACE: 'REVIEW_WORKSPACE'
};

// Icons
const SparklesIcon = ({ className = 'w-6 h-6' }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    className
}, React.createElement('path', {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
}));

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

  const renderContent = () => {
    switch (view) {
      case AppView.LANDING:
        return React.createElement(LandingPage, { onDesignerStart: () => setView(AppView.DESIGNER_SETUP) });
      case AppView.DESIGNER_SETUP:
        return React.createElement('div', { className: "p-8" }, 
          React.createElement('h2', null, "この機能は開発中です。")
        );
      default:
        return React.createElement(LandingPage, { onDesignerStart: () => setView(AppView.DESIGNER_SETUP) });
    }
  };

  return React.createElement('div', { className: "h-screen w-screen" }, renderContent());
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(React.createElement(App));