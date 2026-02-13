import { App, Editor, Notice } from "obsidian";

/**
 * Strips basic Markdown formatting from text using regex patterns
 * Removes: headings (#), bold (**), italic (*), code (`), links, images, etc.
 */
export function stripBasicMarkdown(text: string): string {
    let s = text;

    // ═══════════════════════════════════════════════════════════
    // OBSIDIAN-SPECIFIC STRIPPING (must come first)
    // ═══════════════════════════════════════════════════════════

    // Strip callouts: > [!NOTE], > [!WARNING], etc.
    // Remove the callout marker but keep the content
    s = s.replace(/^>\s*\[![\w-]+\].*$/gm, '');

    // Strip embeds ![[...]] FIRST (before internal links)
    // ![[Note]] or ![[Note|Alias]] → empty string
    s = s.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '');

    // Strip internal wiki links [[...]]
    // [[Link]] → Link, [[Link|Alias]] → Alias
    s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, alias) => {
        return alias || target;
    });

    // Strip block IDs ^abcdef (end-of-line only, safer)
    s = s.replace(/\s+\^[A-Za-z0-9-]+\s*$/gm, '');

    // ═══════════════════════════════════════════════════════════
    // STANDARD MARKDOWN STRIPPING
    // ═══════════════════════════════════════════════════════════

    // 0) Strip code blocks with multiple backticks (``` to `````)
    // This must come before inline code stripping
    s = s.replace(/(`{3,5})[\w]*\n([\s\S]*?)\1/g, '$2');

    // 1) Strip heading hashes
    s = s.replace(/^#{1,6}\s+/gm, '');

    // 2) Unwrap bold & underline
    s = s.replace(/\*\*(.+?)\*\*/g, '$1');
    s = s.replace(/__(.+?)__/g, '$1');

    // 3) Unwrap italic
    s = s.replace(/\*(.+?)\*/g, '$1');
    s = s.replace(/_(.+?)_/g, '$1');

    // 4) Unwrap inline code (single backticks)
    s = s.replace(/`([^`\r\n]+)`/g, '$1');

    // 5) Strip blockquotes (> text)
    s = s.replace(/^>\s+/gm, '');

    // 6) Strip horizontal rules (---, ***, ___)
    s = s.replace(/^[\-\*_]{3,}\s*$/gm, '');

    // 7) Strip table separators (|---|---|)
    s = s.replace(/^\|?[\s\-:|]+\|?\s*$/gm, '');

    // 8) Strip table pipes at start/end of lines
    s = s.replace(/^\|\s*/gm, '');
    s = s.replace(/\s*\|$/gm, '');

    // 9) Strip remaining table pipes (between cells)
    s = s.replace(/\s*\|\s*/g, ' ');

    // 10) Images: ![alt](url) → alt
    s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

    // 11) Links: [text](url) → text
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 12) Collapse multiple blank lines
    s = s.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');

    return s.trim();
}

/**
 * Copies selected text without Markdown formatting to clipboard
 */
export function copyWithoutMarkdown(app: App, editor: Editor): void {
    const selection = editor.getSelection();

    if (!selection) {
        new Notice('No text selected');
        return;
    }

    const plainText = stripBasicMarkdown(selection);

    // Copy to clipboard
    navigator.clipboard.writeText(plainText).then(() => {
        new Notice('Copied as plain text');
    }).catch((err) => {
        new Notice('Failed to copy to clipboard');
        console.error('Copy failed:', err);
    });
}
