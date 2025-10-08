/**
 * dataSourceUtils.test.ts - Unit tests for data source utility functions
 */

import { describe, it, expect } from 'vitest';
import {
	parseCommaSeparatedString,
	parseAvailableSpaces,
	parseSelectedSpaces,
} from './dataSourceUtils';

describe('dataSourceUtils', () => {
	describe('parseCommaSeparatedString', () => {
		it('should parse comma-separated string', () => {
			const result = parseCommaSeparatedString('space1, space2, space3');
			expect(result).toEqual(['space1', 'space2', 'space3']);
		});

		it('should trim whitespace from values', () => {
			const result = parseCommaSeparatedString('  space1  ,  space2  ');
			expect(result).toEqual(['space1', 'space2']);
		});

		it('should filter out empty strings', () => {
			const result = parseCommaSeparatedString('space1,,space2,');
			expect(result).toEqual(['space1', 'space2']);
		});

		it('should handle array input', () => {
			const result = parseCommaSeparatedString(['space1', 'space2']);
			expect(result).toEqual(['space1', 'space2']);
		});

		it('should filter falsy values from array', () => {
			const result = parseCommaSeparatedString(['space1', '', 'space2', null as any]);
			expect(result).toEqual(['space1', 'space2']);
		});

		it('should return empty array for null', () => {
			const result = parseCommaSeparatedString(null);
			expect(result).toEqual([]);
		});

		it('should return empty array for undefined', () => {
			const result = parseCommaSeparatedString(undefined);
			expect(result).toEqual([]);
		});

		it('should return empty array for empty string', () => {
			const result = parseCommaSeparatedString('');
			expect(result).toEqual([]);
		});
	});

	describe('parseAvailableSpaces', () => {
		it('should parse spaces from latest_options', () => {
			const latestOptions = { spaces: 'ENG,PROD,DOCS' };
			const result = parseAvailableSpaces(latestOptions);
			expect(result).toEqual(['ENG', 'PROD', 'DOCS']);
		});

		it('should return empty array if spaces not present', () => {
			const latestOptions = { other: 'value' };
			const result = parseAvailableSpaces(latestOptions);
			expect(result).toEqual([]);
		});

		it('should return empty array for null', () => {
			const result = parseAvailableSpaces(null);
			expect(result).toEqual([]);
		});

		it('should return empty array for undefined', () => {
			const result = parseAvailableSpaces(undefined);
			expect(result).toEqual([]);
		});
	});

	describe('parseSelectedSpaces', () => {
		it('should parse spaces from settings', () => {
			const settings = { spaces: 'space1, space2, space3' };
			const result = parseSelectedSpaces(settings);
			expect(result).toEqual(['space1', 'space2', 'space3']);
		});

		it('should return empty array if spaces not present', () => {
			const settings = { url: 'https://example.com' };
			const result = parseSelectedSpaces(settings);
			expect(result).toEqual([]);
		});

		it('should return empty array for undefined', () => {
			const result = parseSelectedSpaces(undefined);
			expect(result).toEqual([]);
		});

		it('should handle settings with other properties', () => {
			const settings = {
				url: 'https://example.com',
				email: 'user@example.com',
				spaces: 'ENG, PROD',
			};
			const result = parseSelectedSpaces(settings);
			expect(result).toEqual(['ENG', 'PROD']);
		});
	});
});
