
import { GoogleGenAI, Type } from "@google/genai";
import type { Proposal } from '../types';

// ★★★ ローカルで実行するために、ここにあなたのAPIキーを設定してください ★★★
// Google AI Studio (https://aistudio.google.com/app/apikey) でキーを取得できます。
// キーが設定されていなくてもアプリは起動し、AI機能が失敗した場合は手動入力モードで動作します。
const API_KEY = "ここにあなたのAPIキーを貼り付けてください"; 

// 起動時にAPIキーをチェックしてアプリをクラッシュさせるのではなく、
// 各AI機能の呼び出しをtry...catchで囲むことで、キーが不正な場合でも
// 手動入力モードにフォールバックできるようにしています。
const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "提案されるデザイン変更の簡潔で実行可能なタイトル（例：「フォントの太さを調整する」、「セクションの余白を増やす」）。"
      },
      description: {
        type: Type.STRING,
        description: "変更内容と、それが元のフィードバックにどのように対応するかの、クライアントに分かりやすい簡単な説明。"
      },
    },
    required: ["title", "description"]
  },
};


export const generateDesignProposals = async (clientComment: string): Promise<Omit<Proposal, 'id'>[]> => {
  try {
    const prompt = `クライアントから次のデザインフィードバックが提供されました: 「${clientComment}」。
    
    この曖昧な可能性のあるフィードバックを、デザイナーがクライアントに提案できる、具体的で実行可能、かつ明確に区別された3〜4個のUI/UXデザイン提案のリストに翻訳してください。提案は具体的で、専門知識のない人にも理解しやすいようにしてください。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const proposals = JSON.parse(jsonText);
    
    if (!Array.isArray(proposals)) {
        throw new Error("APIが配列を返しませんでした。");
    }

    return proposals.map(p => ({
        title: p.title || "無題の提案",
        description: p.description || "説明がありません。"
    }));

  } catch (error) {
    console.error("デザイン提案の生成中にエラーが発生しました:", error);
    return [
        { title: "手動入力", description: "AIによる提案の生成に失敗しました。手動で提案を入力してください。" }
    ];
  }
};

export const generateAgreementSummary = async (
  originalComment: string,
  chosenProposals: Proposal[],
  clientResolutionComment: string | null
): Promise<string> => {
  try {
    const prompt = `
      クライアントとのデザイン修正の合意内容を、丁寧で分かりやすい言葉で要約してください。
      この要約は、クライアントが最終確認するためのものです。専門用語は完全に避け、誰にでも理解できるように、何がどのように変更されるのかが伝わるように記述してください。

      ## 入力情報
      - **クライアントの元のフィードバック:** "${originalComment}"
      - **合意した解決策:**
        ${chosenProposals.map(p => `  - ${p.title}: ${p.description}`).join('\n')}
      - **クライアントからの追加コメント:** ${clientResolutionComment || "なし"}

      ## 出力形式の指示
      - クライアントへのメッセージとして、丁寧な言葉遣いで記述する。
      - 「ご承認ありがとうございます。いただいたフィードバックとご選択に基づき、以下の通りデザインを更新いたします。」といった導入で始める。
      - 合意した解決策と追加コメントの内容を統合し、箇条書きで分かりやすく要約する。
      - 最後に、「上記内容でデザイン修正を進めさせていただきます。よろしければ最終のご承認をお願いいたします。」といった結びの言葉を入れる。
      - 全体で2〜3文の短いパラグラフと箇条書き程度に収める。

      ## 出力例
      ご承認ありがとうございます。
      いただいたフィードバックとご選択に基づき、以下の通りデザインを更新いたします。

      - **テキストの調整:** 全体的に文字を大きくし、より読みやすくします。
      - **配色の変更:** ブランドカラーである青をより効果的に使い、ボタンの視認性を高めます。
      - **レイアウトの改善:** セクション間の余白を広げ、すっきりとした印象にします。

      上記内容でデザイン修正を進めさせていただきます。よろしければ最終のご承認をお願いいたします。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    return response.text.trim();
  } catch (error) {
    console.error("合意サマリーの生成中にエラーが発生しました:", error);
    return "合意サマリーの自動生成に失敗しました。手動で入力してください。";
  }
};


export const generateTaskFromResolution = async (
  originalComment: string,
  chosenProposals: Proposal[],
  clientResolutionComment: string | null
): Promise<string> => {
  try {
    const prompt = `
      デザインプロジェクトにおいて、クライアントからのフィードバック、それに対する承認済みの解決策、そして最終的な調整指示コメントがあります。
      これらの情報をすべて統合し、デザイナーがFigmaなどのデザインツールで実行すべき、具体的で実践的な作業タスクリストを生成してください。
      **出力は必ずMarkdown形式で行い**、見出し、箇条書き、コードブロック（バッククオート\`\`使用）を駆使して、構造化されたチェックリストとしてください。
      タスクは明確で、デザイナーが迷わず作業に着手できるように、具体的な数値を提示してください。
      **特に「クライアントからの追加コメント」は最終的な要望として最優先で考慮し、承認された解決策を調整する形でタスクに反映させてください。**

      ## 入力情報
      - **クライアントの元のフィードバック (初期段階):** "${originalComment}"
      - **承認された解決策リスト (基本方針):**
        ${chosenProposals.map(p => `  - **${p.title}**: ${p.description}`).join('\n')}
      - **クライアントからの追加コメント (最終指示・最優先):** ${clientResolutionComment || "なし"}

      ## 出力形式の指示
      - **必ずMarkdown形式で出力すること。**
      - 見出しとして「## Figmaタスク指示書」を含める。
      - 承認された解決策をベースにしつつ、クライアントの追加コメントの内容を最優先で反映させる形で、具体的なタスクを記述する。
        (例: 解決策が「フォントサイズを大きくする」で、追加コメントが「でも大きくしすぎないで」なら、フォントサイズを少しだけ大きくするタ.スクを生成)
      - CSSのプロパティ名（例: \`fontSize\`, \`color\`, \`margin\`）や具体的な値（例: \`18px\`, \`#333333\`）を提示する。

      ---
      ## 出力例
      
      ## Figmaタスク指示書

      **ゴール:** クライアントの「もっとインパクトが欲しい」という要望と、「テキストを大きくする」「ブランドカラーを強調する」という承認された解決策を両立させ、追加コメント「ボタンはもう少し控えめに」を反映させる。

      **対象コンポーネント:** メインヒーローセクション

      ### 変更リスト
      *   **見出しテキスト (h1):**
          *   \`fontSize\` を \`36px\` から \`48px\` に拡大。
          *   \`fontWeight\` を \`bold\` (700) に変更。
      *   **CTAボタン:**
          *   背景色を現在の淡い青から、ブランドのプライマリーカラーである \`#4F46E5\` (Indigo 600) に変更。
          *   **(最終指示を反映)** ホバー時のエフェクトを、少し控えめな \`#6366F1\` (Indigo 500) にする。
      *   **背景画像:**
          *   画像の透明度を \`70%\` にし、背後に \`#E0E7FF\` (Indigo 100) の薄いカラーオーバーレイを追加して、テキストの可読性を確保する。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.4, 
      },
    });

    return response.text.trim();

  } catch (error) {
    console.error("タスクの生成中にエラーが発生しました:", error);
    return "## タスク生成エラー\nタスクの自動生成に失敗しました。手動でタスクを定義してください。";
  }
};
