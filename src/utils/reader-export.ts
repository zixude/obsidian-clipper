import browser from './browser-polyfill';

interface ReaderFrontmatterResponse {
	frontmatter?: string;
}

/**
 * Prefix the Reader export without passing its Markdown through template content.
 * generateFrontmatter() already ends with a newline; the extra newline keeps the
 * Reader body byte-for-byte intact behind a conventional blank separator.
 */
export function combineReaderMarkdown(frontmatter: string, readerMarkdown: string): string {
	return frontmatter ? frontmatter + '\n' + readerMarkdown : readerMarkdown;
}

/**
 * Ask the active Clipper panel for the frontmatter represented by its current,
 * already-compiled property fields. If no panel is active, preserve the existing
 * Reader export behavior rather than resolving templates a second time here.
 */
export async function applyCurrentClipperFrontmatter(readerMarkdown: string): Promise<string> {
	try {
		const response = await browser.runtime.sendMessage({
			action: 'getCurrentTemplateFrontmatter',
		}) as ReaderFrontmatterResponse | undefined;

		return combineReaderMarkdown(response?.frontmatter || '', readerMarkdown);
	} catch {
		return readerMarkdown;
	}
}
