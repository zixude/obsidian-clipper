import { describe, expect, test } from 'vitest';
import { matchTemplate } from '../api';
import type { Template } from '../types/types';
import { generateFrontmatter } from './shared';
import { combineReaderMarkdown } from './reader-export';

function exportWithProperties(
	readerMarkdown: string,
	properties: Template['properties'],
	propertyTypes: Record<string, string> = {},
): string {
	return combineReaderMarkdown(
		generateFrontmatter(properties, propertyTypes),
		readerMarkdown,
	);
}

function template(id: string, properties: Template['properties'], triggers: string[] = []): Template {
	return {
		id,
		name: id,
		behavior: 'create',
		noteNameFormat: '{{title}}',
		path: '',
		noteContentFormat: '{{content}}',
		properties,
		triggers,
	};
}

describe('Reader template export', () => {
	test('prefixes frontmatter while preserving Reader markdown exactly', () => {
		const body = '# Reader heading\n\nOriginal body.';
		const result = exportWithProperties(body, [
			{ name: 'title', value: 'Reader title' },
		]);

		expect(result).toBe('---\ntitle: "Reader title"\n---\n\n' + body);
		expect(result.endsWith(body)).toBe(true);
	});

	test('returns Reader markdown unchanged when properties are empty', () => {
		const body = '# Reader heading\n\n---\n\nBody';
		expect(exportWithProperties(body, [])).toBe(body);
	});

	test('uses the official YAML escaping for special title characters', () => {
		const body = 'Body';
		const result = exportWithProperties(body, [
			{ name: 'title', value: 'A: "quoted" title\nsecond line' },
		]);

		expect(result).toBe(
			'---\ntitle: "A: \\"quoted\\" title\nsecond line"\n---\n\nBody',
		);
	});

	test('uses the official multitext serialization for author arrays and wikilinks', () => {
		const result = exportWithProperties('Body', [
			{ name: 'author', value: '[[Alice]], [[Bob]]' },
		], { author: 'multitext' });

		expect(result).toContain('author:\n  - "[[Alice]]"\n  - "[[Bob]]"\n');
	});

	test('keeps headings and horizontal rules at the start of Reader markdown intact', () => {
		const body = '# Heading\n\n---\n\nText';
		const result = exportWithProperties(body, [
			{ name: 'source', value: 'https://example.com' },
		]);

		expect(result.slice(-body.length)).toBe(body);
		expect(result).toContain('---\n\n# Heading\n\n---\n\nText');
	});

	test('uses properties from a trigger-selected template', () => {
		const fallback = template('fallback', [{ name: 'kind', value: 'fallback' }]);
		const twitter = template(
			'twitter',
			[{ name: 'kind', value: 'twitter' }],
			['https://x.com/'],
		);
		const selected = matchTemplate([twitter, fallback], 'https://x.com/example/status/1');

		expect(selected).toBe(twitter);
		expect(exportWithProperties('Body', selected!.properties)).toContain('kind: "twitter"');
	});

	test('uses the current manually selected properties rather than fallback properties', () => {
		const fallback = template('fallback', [{ name: 'kind', value: 'fallback' }]);
		const manuallySelected = template('manual', [{ name: 'kind', value: 'manual' }]);
		const currentTemplate = manuallySelected;
		const result = exportWithProperties('Body', currentTemplate.properties);

		expect(result).toContain('kind: "manual"');
		expect(result).not.toContain('kind: "fallback"');
		expect(fallback.properties).not.toBe(currentTemplate.properties);
	});
});
