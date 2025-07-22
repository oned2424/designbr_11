
export enum AppView {
  LANDING,
  DESIGNER_SETUP,
  REVIEW_WORKSPACE,
}

export enum FeedbackStatus {
  PENDING = 'PENDING',
  PROPOSED = 'PROPOSED',
  RESOLVED = 'RESOLVED',
  NEEDS_REVISION = 'NEEDS_REVISION',
  PENDING_CLIENT_APPROVAL = 'PENDING_CLIENT_APPROVAL',
  CLOSED = 'CLOSED',
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
}

export interface FeedbackPoint {
  id:string;
  x: number;
  y: number;
  comment: string;
  status: FeedbackStatus;
  proposals: Proposal[];
  finalChoiceIds: string[];
  clientResolutionComment: string | null;
  author: 'Client' | 'Designer';
  agreementSummary?: string; // クライアント向けの合意サマリー
  taskDescription?: string;  // デザイナー向けの内部タスクリスト
}