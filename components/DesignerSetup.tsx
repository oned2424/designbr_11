import React, { useState } from 'react';
import { Button } from './common/Button';

interface DesignerSetupProps {
  onStartReview: (url: string) => void;
}

export const DesignerSetup: React.FC<DesignerSetupProps> = ({ onStartReview }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('FigmaのURLは空にできません。');
      return;
    }
    // Figmaのプロトタイプリンクとデザインリンクの両方を受け入れるように修正
    const isProto = url.includes('figma.com/proto/');
    const isDesign = url.includes('figma.com/design/');

    if (!isProto && !isDesign) {
      setError('有効なFigmaの共有リンク（プロトタイプまたはデザイン）を入力してください。');
      return;
    }
    setError('');
    onStartReview(url);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-full max-w-lg text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">新規デザインレビューを開始</h2>
        <p className="text-slate-500 mb-8">下にFigmaのプロトタイプまたはデザインのリンクを貼り付けて、レビューワークスペースを生成します。</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="figma-url-input" className="sr-only">FigmaプロトタイプまたはデザインのURL</label>
            <input
              id="figma-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.figma.com/proto/... または /design/..."
              className="w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              aria-describedby={error ? "url-error" : undefined}
            />
            {error && <p id="url-error" className="text-red-500 text-sm mt-2 text-left">{error}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full">
            レビューワークスペースを作成
          </Button>
        </form>
         <div className="mt-8 text-sm text-slate-500 bg-slate-100 p-4 rounded-lg text-left">
            <h4 className="font-semibold text-slate-600 mb-3">リンクの取得方法：</h4>
            <div className="space-y-4 text-slate-600">
                <div>
                    <strong className="text-slate-700">プロトタイプリンク (推奨)</strong>
                    <ol className="list-decimal list-inside space-y-1 mt-1 pl-1">
                        <li>Figmaでデザインファイルを開き、右上の「▶ Present」ボタンをクリックします。</li>
                        <li>プレゼンテーションビューで、「Share prototype」ボタンをクリックします。</li>
                        <li>「Copy link」をクリックして貼り付けます。</li>
                    </ol>
                </div>
                 <div>
                    <strong className="text-slate-700">デザインリンク</strong>
                    <ol className="list-decimal list-inside space-y-1 mt-1 pl-1">
                        <li>Figmaでデザインファイルを開きます。</li>
                        <li>右上の「Share」ボタンをクリックします。</li>
                        <li>ポップアップ右下の「Copy link」をクリックして貼り付けます。</li>
                    </ol>
                </div>
            </div>
             <p className="mt-4 text-xs text-slate-500">※ プロトタイプリンクを使用すると、クリック等のインタラクションも含めてレビューが可能です。</p>
        </div>
      </div>
    </div>
  );
};
