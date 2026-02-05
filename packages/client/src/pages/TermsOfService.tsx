/**
 * Terms of Service Page
 * Displays the terms and conditions that users must accept during signup
 */

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export function TermsOfService() {
	const [markdown, setMarkdown] = useState("");

	useEffect(() => {
		// Load the markdown file
		fetch(new URL("../content/terms-of-service.md", import.meta.url).href)
			.then((response) => response.text())
			.then((text) => setMarkdown(text))
			.catch((error) => console.error("Error loading terms:", error));
	}, []);

	// Custom components to preserve list numbering for legal documents
	const components: Components = {
		ol: ({ start, ...props }) => {
			return (
				<ol
					{...props}
					start={start}
					style={{ listStyleType: "decimal", counterReset: start ? `item ${start - 1}` : undefined }}
				/>
			);
		},
	};

	return (
		<div className="min-h-screen w-full bg-gray-50">
			<div className="max-w-5xl mx-auto">
				{/* Header Section with Gradient */}
				<div className="bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] rounded-t-lg py-16 px-8 text-center">
					<h1 className="text-5xl font-serif text-white mb-3">
						Terms of Service
					</h1>
					<p className="text-blue-400 text-sm">Last updated October 2025</p>
				</div>

				{/* Content Section */}
				<div className="bg-white text-black rounded-b-lg p-12 shadow-lg">
					<div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-li:text-gray-700 prose-strong:text-black prose-strong:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-table:w-full prose-table:border-collapse prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-th:border prose-th:border-gray-300 prose-th:p-2 prose-th:bg-gray-100 prose-th:font-bold [&_ol]:list-decimal">
						{markdown ? (
							<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
								{markdown}
							</ReactMarkdown>
						) : (
							<p className="text-center text-gray-500">Loading terms...</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default TermsOfService;
