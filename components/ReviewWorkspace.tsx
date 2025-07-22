
import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import type { FeedbackPoint, Proposal } from '../types';
import { FeedbackStatus } from '../types';
import { generateDesignProposals, generateAgreementSummary, generateTaskFromResolution } from '../services/geminiService';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { SparklesIcon, CheckCircleIcon, PendingIcon, LightBulbIcon, PlusCircleIcon, ArrowPathIcon, UserCheckIcon, LockClosedIcon } from './Icons';

const statusDisplayInfo = {
  [FeedbackStatus.PENDING]: { text: '保留中', icon: <PendingIcon className="w-4 h-4 text-amber-500" />, color: 'bg-amber-100 border-amber-400' },
  [FeedbackStatus.PROPOSED]: { text: '提案済み', icon: <LightBulbIcon className="w-4 h-4 text-indigo-500" />, color: 'bg-indigo-100 border-indigo-400' },
  [FeedbackStatus.NEEDS_REVISION]: { text: '再提案待ち', icon: <ArrowPathIcon className="w-4 h-4 text-orange-500" />, color: 'bg-orange-100 border-orange-400' },
  [FeedbackStatus.RESOLVED]: { text: '解決済み', icon: <CheckCircleIcon className="w-4 h-4 text-green-500" />, color: 'bg-green-100 border-green-400' },
  [FeedbackStatus.PENDING_CLIENT_APPROVAL]: { text: 'クライアント承認待ち', icon: <UserCheckIcon className="w-4 h-4 text-sky-500" />, color: 'bg-sky-100 border-sky-400' },
  [FeedbackStatus.CLOSED]: { text: '完了', icon: <LockClosedIcon className="w-4 h-4 text-slate-500" />, color: 'bg-slate-200 border-slate-400' },
};


// Sub-component for a single feedback bubble/marker, memoized for performance
const FeedbackMarker: React.FC<{ point: FeedbackPoint; onSelect: (id: string) => void; isSelected: boolean; userRole: 'Client' | 'Designer' }> = memo(({ point, onSelect, isSelected, userRole }) => {
  const config = statusDisplayInfo[point.status];
  const canInteract = (userRole === 'Client' && (point.status === FeedbackStatus.PROPOSED || point.status === FeedbackStatus.PENDING_CLIENT_APPROVAL)) || (userRole === 'Designer');

  const handleSelect = useCallback(() => {
    onSelect(point.id);
  }, [onSelect, point.id]);

  return (
    <div
      style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
      className={`absolute z-20 flex items-center justify-center w-8 h-8 rounded-full shadow-lg cursor-pointer transition-all duration-200 ${isSelected ? 'scale-125 ring-4 ring-offset-2 ring-indigo-500' : ''} ${canInteract ? config.color : 'bg-gray-300 border-gray-400'}`}
      onClick={handleSelect}
      role="button"
      aria-label={`フィードバック: ${point.comment.substring(0, 20)}... (${config.text})`}
    >
      {config.icon}
    </div>
  );
});

// Helper to render Markdown from AI
const formattedTaskDescription = (text: string) => {
    if (!text) return { __html: "" };
    
    let html = text
        .replace(/^## (.*$)/gim, '<h5 class="font-bold text-lg text-slate-800 mt-4 mb-2">$1</h5>')
        .replace(/^### (.*$)/gim, '<h6 class="font-semibold text-base text-slate-700 mt-3 mb-1">$1</h6>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-indigo-600 rounded px-1.5 py-1 font-mono text-sm">$1</code>');

    // Process lists by wrapping blocks of list items
    html = html.replace(/^(?:\*|\d+\.) (.*$)/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');

    // Finally, handle line breaks for non-list content
    html = html.replace(/\n/g, '<br />');
    // Clean up extra breaks around the new list wrappers
    html = html.replace(/<br \/>(\s*<ul)/g, '$1');
    html = html.replace(/(<\/ul>)<br \/>/g, '$1');
    html = html.replace(/<\/li><br \/>/g, '</li>');


    return { __html: html };
};


// Sub-component for the side panel showing feedback details
const FeedbackPanel: React.FC<{
  point: FeedbackPoint;
  onClose: () => void;
  onUpdatePoint: (updatedPoint: FeedbackPoint) => void;
  userRole: 'Client' | 'Designer';
}> = ({ point, onClose, onUpdatePoint, userRole }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);
  const [generatedProposals, setGeneratedProposals] = useState<Omit<Proposal, 'id'>[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [selectedProposalsForDesigner, setSelectedProposalsForDesigner] = useState<Omit<Proposal, 'id'>[]>([]);
  const [clientSelectedIds, setClientSelectedIds] = useState<string[]>([]);
  const [clientResponseComment, setClientResponseComment] = useState('');
  // State for manual proposals
  const [manualProposals, setManualProposals] = useState<Omit<Proposal, 'id'>[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  // State for manual task description
  const [manualTaskDescription, setManualTaskDescription] = useState('');

  // Reset local state when the point changes
  useEffect(() => {
    setGeneratedSummary('');
    setClientResponseComment('');
    setClientSelectedIds([]);
    setGeneratedProposals([]);
    setSelectedProposalsForDesigner([]);
    // Reset manual input state
    setManualProposals([]);
    setManualTitle('');
    setManualDescription('');
    setManualTaskDescription('');
  }, [point.id]);

  const handleGenerateProposals = async () => {
    setIsLoading(true);
    const proposals = await generateDesignProposals(point.comment);
    setGeneratedProposals(proposals);
    // If AI fails, clear any manual proposals to start fresh
    if (proposals.length > 0 && proposals[0].title === "手動入力") {
        setManualProposals([]);
    }
    setIsLoading(false);
  };
  
  const handleAddManualProposal = () => {
    if (!manualTitle.trim() || !manualDescription.trim()) return;
    setManualProposals(prev => [...prev, { title: manualTitle, description: manualDescription }]);
    setManualTitle('');
    setManualDescription('');
  };

  const handleRemoveManualProposal = (indexToRemove: number) => {
    setManualProposals(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const handleProposeToClient = () => {
    const isManualMode = generatedProposals.length > 0 && generatedProposals[0].title === "手動入力";
    const proposalsToSubmit = isManualMode ? manualProposals : selectedProposalsForDesigner;

     if (proposalsToSubmit.length === 0) return;
     const proposalsWithIds: Proposal[] = proposalsToSubmit.map(p => ({ ...p, id: `prop-${Date.now()}-${Math.random()}` }));
     const updatedPoint = { ...point, proposals: proposalsWithIds, status: FeedbackStatus.PROPOSED, clientResolutionComment: null }; // Clear previous rejection comment
     onUpdatePoint(updatedPoint);
  };

  const handleClientApproval = () => {
    if (clientSelectedIds.length === 0) return;
    const updatedPoint = { ...point, status: FeedbackStatus.RESOLVED, finalChoiceIds: clientSelectedIds, clientResolutionComment: clientResponseComment };
    onUpdatePoint(updatedPoint);
  };

  const handleClientRejection = () => {
    const updatedPoint = {
      ...point,
      status: FeedbackStatus.NEEDS_REVISION,
      finalChoiceIds: [],
      proposals: [], // Clear old proposals
      clientResolutionComment: clientResponseComment.trim() || null, // Store rejection reason
    };
    onUpdatePoint(updatedPoint);
  };
  
  const handleGenerateSummary = async () => {
      if (!point || point.finalChoiceIds.length === 0) return;
      const chosenProposals = point.proposals.filter(p => point.finalChoiceIds.includes(p.id));
      if (chosenProposals.length === 0) return;
      
      setIsGeneratingSummary(true);
      const summary = await generateAgreementSummary(point.comment, chosenProposals, point.clientResolutionComment);
      setGeneratedSummary(summary);
      setIsGeneratingSummary(false);
  };

  const handleShareSummary = () => {
      if (!generatedSummary.trim()) return;
      const updatedPoint = { ...point, status: FeedbackStatus.PENDING_CLIENT_APPROVAL, agreementSummary: generatedSummary };
      onUpdatePoint(updatedPoint);
  };
  
  const handleClientApproveSummary = () => {
      const updatedPoint = { ...point, status: FeedbackStatus.CLOSED };
      onUpdatePoint(updatedPoint);
  };

  const handleClientRequestSummaryRevision = () => {
      if (!clientResponseComment.trim()) return;
      const updatedPoint = {
          ...point,
          status: FeedbackStatus.RESOLVED, // Go back to RESOLVED state
          agreementSummary: undefined, // Clear summary
          // Append revision request to the comment for context
          clientResolutionComment: `${point.clientResolutionComment || ''}\n[サマリー修正依頼]: ${clientResponseComment}`.trim(),
      };
      onUpdatePoint(updatedPoint);
  };

  const handleGenerateTask = async () => {
    if (!point || point.finalChoiceIds.length === 0) return;
    const chosenProposals = point.proposals.filter(p => point.finalChoiceIds.includes(p.id));
    if (chosenProposals.length === 0) return;
    
    setIsGeneratingTask(true);
    const taskDescription = await generateTaskFromResolution(point.comment, chosenProposals, point.clientResolutionComment);
    const updatedPoint = { ...point, taskDescription };
    onUpdatePoint(updatedPoint);
    setIsGeneratingTask(false);
  };

  const handleSaveManualTask = () => {
      if (!manualTaskDescription.trim()) return;
      const updatedPoint = { ...point, taskDescription: manualTaskDescription };
      onUpdatePoint(updatedPoint);
  };

  const toggleDesignerProposalSelection = (proposal: Omit<Proposal, 'id'>) => {
    setSelectedProposalsForDesigner(prev => prev.some(p => p.title === proposal.title) ? prev.filter(p => p.title !== proposal.title) : [...prev, proposal]);
  };

  const toggleClientProposalSelection = (proposalId: string) => {
    setClientSelectedIds(prev => prev.includes(proposalId) ? prev.filter(id => id !== proposalId) : [...prev, proposalId]);
  };

  const renderClientView = () => (
    <>
      <div className="p-4 bg-slate-100 rounded-lg mb-4">
        <p className="text-sm text-slate-600 mb-1">あなたのフィードバック：</p>
        <p className="font-medium text-slate-800 whitespace-pre-wrap">"{point.comment}"</p>
      </div>

      {point.status === FeedbackStatus.PROPOSED && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">デザイナーから以下の解決策が提案されています：</h4>
          <div className="space-y-3">
            {point.proposals.map(p => (
              <div key={p.id} className="flex items-start p-3 border border-slate-300 rounded-lg has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400 transition">
                  <input id={`client-prop-${p.id}`} type="checkbox" onChange={() => toggleClientProposalSelection(p.id)} checked={clientSelectedIds.includes(p.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                  <label htmlFor={`client-prop-${p.id}`} className="ml-3 cursor-pointer flex-1">
                      <p className="font-semibold text-indigo-700">{p.title}</p>
                      <p className="text-sm text-slate-600">{p.description}</p>
                  </label>
              </div>
            ))}
          </div>
          <div className="mt-4">
              <label htmlFor="client-comment" className="block text-sm font-medium text-slate-700 mb-1">追加のコメント・要望</label>
              <textarea id="client-comment" value={clientResponseComment} onChange={(e) => setClientResponseComment(e.target.value)} placeholder="選択を承認する場合の補足や、再提案を依頼する場合の理由などをご記入ください。" rows={3} className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400"/>
          </div>
          <div className="mt-4 space-y-2">
            <Button onClick={handleClientApproval} disabled={clientSelectedIds.length === 0} className="w-full"> {clientSelectedIds.length}件の提案を承認して次へ </Button>
            <Button onClick={handleClientRejection} variant="secondary" className="w-full"> イメージに合うものがない（再提案を依頼） </Button>
          </div>
        </div>
      )}

      {point.status === FeedbackStatus.RESOLVED && (
        <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-center">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-green-800">ご回答ありがとうございます！</h4>
            <p className="text-sm text-green-700 mt-1"> デザイナーが合意内容のまとめを作成しています。 </p>
        </div>
      )}

       {point.status === FeedbackStatus.PENDING_CLIENT_APPROVAL && (
        <div className="space-y-4">
           <h4 className="font-semibold text-slate-800">最終確認：修正内容のまとめ</h4>
           <p className="text-sm text-slate-600">デザイナーがあなたの選択に基づき、以下の通り修正を進めます。内容をご確認いただき、問題がなければ「承認」してください。</p>
            <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {point.agreementSummary}
            </div>
            <Button onClick={handleClientApproveSummary} className="w-full">この内容で最終承認する</Button>
            <div>
              <p className="text-sm font-medium text-slate-700 mt-4 mb-2">修正を依頼する場合：</p>
              <textarea value={clientResponseComment} onChange={e => setClientResponseComment(e.target.value)} placeholder="修正してほしい点を具体的にご記入ください。" rows={3} className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400"/>
              <Button onClick={handleClientRequestSummaryRevision} disabled={!clientResponseComment.trim()} variant="secondary" className="w-full mt-2"> 修正を依頼する </Button>
            </div>
        </div>
       )}

       {point.status === FeedbackStatus.CLOSED && (
          <div className="p-4 bg-slate-200 border border-slate-400 rounded-lg text-center">
            <LockClosedIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800">レビュー完了</h4>
            <p className="text-sm text-slate-700 mt-1">ご協力ありがとうございました！</p>
          </div>
       )}
    </>
  );

  const renderDesignerView = () => {
    const canGenerateProposals = point.status === FeedbackStatus.PENDING || point.status === FeedbackStatus.NEEDS_REVISION;
    const isManualMode = generatedProposals.length > 0 && generatedProposals[0].title === "手動入力";

    return (
        <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-600 mb-1">クライアントのフィードバック履歴：</p>
                <p className="font-medium text-blue-900 whitespace-pre-wrap">"{point.comment}"</p>
            </div>

            {point.status === FeedbackStatus.NEEDS_REVISION && (
                 <div className="p-3 mb-4 bg-orange-100 border-l-4 border-orange-400 text-orange-800" role="alert">
                    <p className="font-bold">再提案が必要です</p>
                    {point.clientResolutionComment && (
                        <div className="mt-2 pt-2 border-t border-orange-300">
                            <p className="text-sm font-semibold">クライアントからのコメント：</p>
                            <p className="text-sm italic">"{point.clientResolutionComment}"</p>
                        </div>
                    )}
                     {!point.clientResolutionComment && <p className="text-sm mt-2">クライアントが提案を承認しませんでした。新しい解決策を提案してください。</p>}
                </div>
            )}

            {canGenerateProposals && (
                <div>
                    <Button onClick={handleGenerateProposals} disabled={isLoading} className="w-full" leftIcon={isLoading ? <Spinner size="sm"/> : <SparklesIcon className="w-5 h-5"/>}>
                        {isLoading ? 'AIで翻訳中...' : 'AIで解決策を提案'}
                    </Button>
                    {generatedProposals.length > 0 && (
                        <div className="mt-4 space-y-3">
                            {isManualMode ? (
                                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                                    <p className="text-amber-800 font-semibold">{generatedProposals[0].description}</p>
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label htmlFor="manual-title" className="block text-sm font-medium text-slate-700">提案タイトル</label>
                                            <input type="text" id="manual-title" value={manualTitle} onChange={e => setManualTitle(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="例：フォントの太さを調整する"/>
                                        </div>
                                        <div>
                                            <label htmlFor="manual-desc" className="block text-sm font-medium text-slate-700">説明</label>
                                            <textarea id="manual-desc" value={manualDescription} onChange={e => setManualDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" placeholder="クライアント向けの簡単な説明"></textarea>
                                        </div>
                                        <Button onClick={handleAddManualProposal} size="sm" variant="secondary" disabled={!manualTitle.trim() || !manualDescription.trim()}>この提案を追加する</Button>
                                    </div>
                                    <div className="mt-4">
                                        <h6 className="font-semibold text-sm text-slate-800">追加した提案リスト</h6>
                                        {manualProposals.length > 0 ? (
                                            <ul className="mt-2 space-y-2">
                                                {manualProposals.map((p, i) => (
                                                    <li key={i} className="p-2 bg-white border border-slate-200 rounded-md flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm text-slate-800">{p.title}</p>
                                                            <p className="text-xs text-slate-600">{p.description}</p>
                                                        </div>
                                                        <button onClick={() => handleRemoveManualProposal(i)} className="text-red-500 hover:text-red-700 text-xs font-semibold p-1">削除</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-500">まだ提案が追加されていません。</p>
                                        )}
                                    </div>
                                    <Button onClick={handleProposeToClient} disabled={manualProposals.length === 0} className="w-full mt-4">
                                        {manualProposals.length}件の手動提案をクライアントに提案
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <h5 className="font-semibold mb-2">AIによる提案（クライアントに提示するものを選択）：</h5>
                                    <div className="space-y-2">
                                    {generatedProposals.map((p, i) => (
                                        <div key={i} className="flex items-start p-3 bg-slate-100 rounded-md has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400">
                                            <input id={`proposal-check-${i}`} type="checkbox" onChange={() => toggleDesignerProposalSelection(p)} className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                            <label htmlFor={`proposal-check-${i}`} className="ml-3 cursor-pointer flex-1">
                                                <p className="font-medium text-slate-800">{p.title}</p>
                                                <p className="text-sm text-slate-600">{p.description}</p>
                                            </label>
                                        </div>
                                    ))}
                                    </div>
                                    <Button onClick={handleProposeToClient} disabled={selectedProposalsForDesigner.length === 0} className="w-full mt-4">
                                        {selectedProposalsForDesigner.length}件の選択肢をクライアントに提案
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {point.status === FeedbackStatus.PROPOSED && (
                <div className="p-4 bg-indigo-100 border-l-4 border-indigo-400">
                    <h4 className="font-semibold text-indigo-800 mb-2">クライアントのレビュー待ち</h4>
                    <p className="text-sm text-indigo-700">提案内容について、クライアントの回答を待っています。</p>
                </div>
            )}
            
            {point.status === FeedbackStatus.RESOLVED && (
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-bold text-lg text-green-800 mb-3">クライアントが解決策を選択しました</h4>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <h5 className="font-semibold text-slate-800 mb-2 text-base">次のステップ：クライアントへの合意確認</h5>
                         <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                            <h6 className="font-semibold text-slate-700">サマリー作成のコンテキスト</h6>
                            <div>
                                <p className="text-xs font-medium text-slate-500">元のフィードバック:</p>
                                <p className="text-sm text-slate-800 italic whitespace-pre-wrap">"{point.comment}"</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">承認された解決策:</p>
                                <ul className="space-y-2 mt-1">
                                    {point.proposals.filter(p => point.finalChoiceIds.includes(p.id)).map(p => (
                                        <li key={p.id} className="p-2 bg-white border border-slate-200 rounded-md">
                                            <p className="font-semibold text-sm text-indigo-700">{p.title}</p>
                                            <p className="text-sm text-slate-600 pl-2">{p.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {point.clientResolutionComment && (
                                <div>
                                    <p className="text-xs font-medium text-slate-500">クライアントの追加コメント:</p>
                                    <p className="text-sm text-slate-800 italic whitespace-pre-wrap">"{point.clientResolutionComment}"</p>
                                </div>
                            )}
                        </div>

                        {generatedSummary ? (
                             <div>
                                <label htmlFor="summary-edit" className="block text-sm font-medium text-slate-700 mb-1">AIが生成した合意サマリー（編集可）：</label>
                                <textarea id="summary-edit" value={generatedSummary} onChange={e => setGeneratedSummary(e.target.value)} rows={6} className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400"/>
                                <Button onClick={handleShareSummary} className="w-full mt-2">この内容でクライアントに確認を依頼</Button>
                            </div>
                        ) : (
                             <>
                                <p className="text-sm text-slate-500 mb-3">承認された解決策を基に、クライアント向けの分かりやすい合意内容のサマリーを生成します。</p>
                                <Button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="w-full" leftIcon={isGeneratingSummary ? <Spinner size="sm"/> : <SparklesIcon className="w-5 h-5"/>}>
                                    {isGeneratingSummary ? 'サマリーを生成中...' : 'AIで合意サマリーを作成'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {point.status === FeedbackStatus.PENDING_CLIENT_APPROVAL && (
                <div className="p-4 bg-sky-100 border-l-4 border-sky-400">
                    <h4 className="font-semibold text-sky-800 mb-2">クライアントの最終承認待ち</h4>
                    <p className="text-sm text-sky-700">作成した合意サマリーについて、クライアントの確認を待っています。</p>
                </div>
            )}

            {point.status === FeedbackStatus.CLOSED && (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-200 border-l-4 border-slate-400">
                        <div className="flex items-center gap-2">
                            <LockClosedIcon className="w-6 h-6 text-slate-600" />
                            <h4 className="font-semibold text-slate-800 mb-0">このフィードバックは完了しました</h4>
                        </div>
                    </div>
                    {point.agreementSummary && (
                        <div>
                            <h5 className="font-semibold text-slate-800 mb-2">クライアントとの最終合意内容</h5>
                            <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                                {point.agreementSummary}
                            </div>
                        </div>
                    )}
                    <div className="border-t border-slate-200 pt-4">
                        <h5 className="font-semibold text-slate-800 mb-2">デザイナー向けタスク指示書</h5>
                        {point.taskDescription ? (
                            point.taskDescription.includes("タスク生成エラー") ? (
                                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                                  <p className="text-amber-800 font-semibold">タスクの自動生成に失敗しました。</p>
                                  <p className="text-amber-700 text-sm mb-3">手動でタスクをMarkdown形式で入力してください。</p>
                                  <textarea 
                                      value={manualTaskDescription} 
                                      onChange={e => setManualTaskDescription(e.target.value)}
                                      rows={8}
                                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400 font-mono text-sm"
                                      placeholder="## Figmaタスク指示書&#x0a;* **見出しテキスト:**&#x0a;  * `fontSize` を `48px` に拡大。"
                                      aria-label="手動タスク入力"
                                  />
                                  <Button 
                                      onClick={handleSaveManualTask} 
                                      disabled={!manualTaskDescription.trim()} 
                                      className="w-full mt-2"
                                  >
                                      このタスクを保存
                                  </Button>
                                </div>
                            ) : (
                                <div className="p-4 bg-white rounded-lg border border-slate-200 text-sm text-slate-800 space-y-2 prose prose-sm max-w-none"
                                     dangerouslySetInnerHTML={formattedTaskDescription(point.taskDescription)}
                                />
                            )
                        ) : (
                            <>
                               <p className="text-sm text-slate-500 mb-3">最終合意に基づき、具体的な作業タスクを生成します。</p>
                               <Button onClick={handleGenerateTask} disabled={isGeneratingTask} className="w-full" leftIcon={isGeneratingTask ? <Spinner size="sm"/> : <SparklesIcon className="w-5 h-5"/>}>
                                   {isGeneratingTask ? 'タスクを生成中...' : 'AIでタスクを生成する'}
                               </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
  };

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out" role="dialog" aria-labelledby="feedback-panel-title">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h3 id="feedback-panel-title" className="font-bold text-lg text-slate-800">フィードバック詳細</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-2xl font-bold leading-none flex items-center justify-center w-8 h-8" aria-label="閉じる">&times;</button>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        {userRole === 'Client' ? renderClientView() : renderDesignerView()}
      </div>
    </div>
  );
};

// Main Component
export const ReviewWorkspace: React.FC<{ figmaUrl: string; onExit: () => void }> = ({ figmaUrl, onExit }) => {
  const [feedbackPoints, setFeedbackPoints] = useState<FeedbackPoint[]>([]);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [isAddingFeedback, setIsAddingFeedback] = useState<{ x: number; y: number } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [userRole, setUserRole] = useState<'Client' | 'Designer'>('Client');
  const [isPinMode, setIsPinMode] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  
  const stageRef = useRef<HTMLDivElement>(null);

  const handleSelectPoint = useCallback((id: string) => {
    setActivePointId(id);
    setIsPinMode(false);
  }, []);

  const handlePinModeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || !stageRef.current) return;
    
    const rect = stageRef.current.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsAddingFeedback({ x, y });
    setIsPinMode(false);
  };
  
  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAddingFeedback) return;
    
    const newPoint: FeedbackPoint = {
      id: `fb-${Date.now()}`,
      x: isAddingFeedback.x,
      y: isAddingFeedback.y,
      comment: newComment,
      status: FeedbackStatus.PENDING,
      proposals: [],
      finalChoiceIds: [],
      clientResolutionComment: null,
      author: 'Client'
    };
    
    setFeedbackPoints(prev => [...prev, newPoint]);
    setNewComment('');
    setIsAddingFeedback(null);
  };

  const cancelAddFeedback = () => {
    setIsAddingFeedback(null);
    setNewComment('');
  };

  const handleUpdatePoint = (updatedPoint: FeedbackPoint) => {
    setFeedbackPoints(prev => prev.map(p => p.id === updatedPoint.id ? updatedPoint : p));
    const shouldClosePanelOnUpdate = updatedPoint.status === FeedbackStatus.PROPOSED;
    
    if (shouldClosePanelOnUpdate) {
        setActivePointId(null);
    }
  };
  
  const activePoint = feedbackPoints.find(p => p.id === activePointId);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-200">
      <header className="bg-white shadow-md z-50 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">デザインブリッジ</h1>
             <div className="bg-slate-100 p-1 rounded-md flex text-sm" role="radiogroup" aria-label="ビューの切り替え">
                <button role="radio" aria-checked={userRole === 'Client'} onClick={() => setUserRole('Client')} className={`px-3 py-1 rounded transition-colors ${userRole === 'Client' ? 'bg-white shadow' : 'text-slate-500 hover:bg-slate-200'}`}>クライアントビュー</button>
                <button role="radio" aria-checked={userRole === 'Designer'} onClick={() => setUserRole('Designer')} className={`px-3 py-1 rounded transition-colors ${userRole === 'Designer' ? 'bg-white shadow' : 'text-slate-500 hover:bg-slate-200'}`}>デザイナービュー</button>
             </div>
        </div>
        <div className="flex items-center gap-4">
          {userRole === 'Client' && (
            <Button 
                onClick={() => setIsPinMode(true)} 
                disabled={isPinMode || !!activePointId || !!isAddingFeedback}
                variant="primary"
                leftIcon={<PlusCircleIcon className="w-5 h-5"/>}
            >
              フィードバックを追加
            </Button>
          )}
          <Button onClick={onExit} variant="secondary">ワークスペースを終了</Button>
        </div>
      </header>

      <main className="flex-grow relative overflow-hidden p-4 bg-slate-800/10">
        <div 
          ref={stageRef}
          className="relative w-full h-full bg-white shadow-2xl"
        >
          {isIframeLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-100/80 backdrop-blur-sm">
                <Spinner size="lg" />
                <p className="mt-4 text-slate-600 font-semibold">Figmaのデザインを読み込んでいます...</p>
            </div>
          )}
          <iframe
            className={`w-full h-full border-4 border-slate-600 rounded-lg transition-opacity duration-500 ${isIframeLoading ? 'opacity-0' : 'opacity-100'} ${isPinMode ? 'opacity-50' : ''}`}
            src={figmaUrl}
            allowFullScreen
            title="Figmaプロトタイプ"
            style={{ pointerEvents: isPinMode ? 'none' : 'auto' }}
            onLoad={() => setIsIframeLoading(false)}
          ></iframe>
          
           <div className="absolute inset-0 pointer-events-none">
            {feedbackPoints.map(point => (
                <div data-feedback-marker="true" key={point.id} className="pointer-events-auto">
                <FeedbackMarker
                    point={point}
                    isSelected={point.id === activePointId}
                    onSelect={handleSelectPoint}
                    userRole={userRole}
                />
                </div>
            ))}
           </div>

          {isPinMode && (
             <div 
                className="absolute inset-0 z-30 cursor-crosshair"
                onClick={handlePinModeClick}
             >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-2xl text-center border border-slate-200">
                    <h3 className="text-lg font-bold text-indigo-600">ピン留めモード</h3>
                    <p className="text-slate-600 mt-2">フィードバックしたい場所を画面上でクリックしてください。</p>
                    <Button variant="secondary" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); setIsPinMode(false); }}>
                        キャンセル
                    </Button>
                </div>
            </div>
          )}

          {isAddingFeedback && (
             <div data-new-feedback-form="true" style={{ left: `${isAddingFeedback.x}%`, top: `${isAddingFeedback.y}%` }} className="absolute z-30 p-4 bg-white rounded-lg shadow-xl -translate-x-1/2 -translate-y-[calc(100%+20px)] w-72">
                 <form onSubmit={handleAddFeedback}>
                    <label htmlFor="comment" className="block text-sm font-medium text-slate-700">気になることは何ですか？</label>
                    <textarea 
                        id="comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="例：「これをもう少し「シュッ」とした感じにできますか？」"
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white text-slate-900 placeholder-slate-400"
                        rows={3}
                        autoFocus
                    />
                    <div className="mt-3 flex justify-end gap-2">
                         <Button type="button" variant="secondary" size="sm" onClick={cancelAddFeedback}>キャンセル</Button>
                         <Button type="submit" size="sm">フィードバックを追加</Button>
                    </div>
                 </form>
             </div>
          )}
        </div>
      </main>
      
      {activePoint && <FeedbackPanel point={activePoint} onClose={() => setActivePointId(null)} onUpdatePoint={handleUpdatePoint} userRole={userRole} />}
    </div>
  );
};
