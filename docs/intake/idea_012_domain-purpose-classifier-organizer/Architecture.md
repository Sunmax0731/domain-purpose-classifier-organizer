# Architecture

## Prompt Architecture Considerations

- Goal: ブックマーク取得、分類、プレビュー、適用、ロールバックの責務を分ける。
- Constraints: Chrome API の権限制約とストア審査要件を前提にする。
- Quality Attributes: 可逆性、説明可能性、大量データでの操作性を重視する。
