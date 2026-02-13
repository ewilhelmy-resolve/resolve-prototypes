/**
 * RITA Embed Script — Tier 1 Host Full-Screen Modal
 *
 * Drop-in script for host pages embedding RITA iframe cross-origin.
 * Listens for RITA_FORM_MODAL postMessage from iframe, renders a
 * full-screen modal overlay on the host page, and sends form data back.
 *
 * Usage:
 *   <script src="https://onboarding.resolve.io/embed/rita-embed.js"></script>
 *   <iframe src="https://onboarding.resolve.io/iframe/chat?sessionKey=..."></iframe>
 */
(() => {
	// Prevent double-init
	if (window.__ritaEmbedInitialized) return;
	window.__ritaEmbedInitialized = true;

	// ---- Styles (injected once) ----
	var STYLES = [
		"#rita-form-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);z-index:10001;display:flex;align-items:center;justify-content:center;animation:ritaFormFadeIn .2s ease}",
		"@keyframes ritaFormFadeIn{from{opacity:0}to{opacity:1}}",
		"#rita-form-modal{background:#fff;border-radius:12px;width:95%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.4)}",
		"#rita-form-modal.size-full{max-width:95vw;width:95vw;height:90vh;max-height:90vh}",
		"#rita-form-modal.size-xl{max-width:1200px}",
		"#rita-form-modal.size-lg{max-width:900px}",
		"#rita-form-modal.size-md{max-width:600px}",
		"#rita-form-modal.size-sm{max-width:400px}",
		"#rita-form-modal-header{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 20px;flex-shrink:0;display:flex;justify-content:space-between;align-items:flex-start}",
		"#rita-form-modal-header-text h3{margin:0 0 4px 0;font-size:18px;font-weight:600;color:#1e293b}",
		"#rita-form-modal-header-text p{margin:0;font-size:14px;color:#64748b}",
		"#rita-form-modal-close{background:#e2e8f0;border:none;color:#64748b;width:32px;height:32px;border-radius:6px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}",
		"#rita-form-modal-close:hover{background:#cbd5e1;color:#1e293b}",
		"#rita-form-modal-body{flex:1;overflow-y:auto;padding:20px}",
		"#rita-form-modal-footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 20px;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0}",
		".rita-form-field{margin-bottom:16px}",
		".rita-form-field label{display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px}",
		".rita-form-field input,.rita-form-field select,.rita-form-field textarea{width:100%;padding:10px 12px;font-size:14px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#1e293b;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}",
		".rita-form-field input:focus,.rita-form-field select:focus,.rita-form-field textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}",
		".rita-form-field textarea{min-height:100px;resize:vertical}",
		".rita-form-btn{padding:10px 20px;font-size:14px;font-weight:500;border-radius:6px;cursor:pointer;transition:all .15s}",
		".rita-form-btn-cancel{background:#fff;border:1px solid #d1d5db;color:#374151}",
		".rita-form-btn-cancel:hover{background:#f9fafb;border-color:#9ca3af}",
		".rita-form-btn-submit{background:#3b82f6;border:1px solid #3b82f6;color:#fff}",
		".rita-form-btn-submit:hover{background:#2563eb;border-color:#2563eb}",
		".rita-form-btn-destructive{background:#ef4444;border:1px solid #ef4444;color:#fff}",
		".rita-form-btn-destructive:hover{background:#dc2626;border-color:#dc2626}",
	].join("\n");

	function injectStyles() {
		if (document.getElementById("rita-embed-styles")) return;
		var s = document.createElement("style");
		s.id = "rita-embed-styles";
		s.textContent = STYLES;
		document.head.appendChild(s);
	}

	// ---- Find the RITA iframe ----
	function findRitaIframe() {
		return document.querySelector('iframe[src*="iframe/chat"]');
	}

	// ---- Current modal state ----
	var currentConfig = null;
	var escHandler = null;

	// ---- Close modal ----
	function closeModal() {
		var overlay = document.getElementById("rita-form-modal-overlay");
		if (overlay) overlay.remove();
		if (escHandler) {
			document.removeEventListener("keydown", escHandler);
			escHandler = null;
		}
		currentConfig = null;
	}

	// ---- Send message back to iframe ----
	function postToIframe(msg) {
		var iframe = findRitaIframe();
		if (iframe && iframe.contentWindow) {
			iframe.contentWindow.postMessage(msg, "*");
		}
	}

	// ---- Render a form field ----
	function renderField(field) {
		var id = "rita-field-" + field.name;
		var label = field.label
			? '<label for="' + id + '">' + field.label + "</label>"
			: "";
		var opts;

		if (field.type === "select" && field.options) {
			opts = field.options
				.map((o) => {
					var sel = o.value === field.defaultValue ? " selected" : "";
					return (
						'<option value="' +
						o.value +
						'"' +
						sel +
						">" +
						o.label +
						"</option>"
					);
				})
				.join("");
			return (
				'<div class="rita-form-field">' +
				label +
				'<select id="' +
				id +
				'" name="' +
				field.name +
				'">' +
				'<option value="">' +
				(field.placeholder || "Select...") +
				"</option>" +
				opts +
				"</select></div>"
			);
		}

		if (field.type === "textarea" || field.inputType === "textarea") {
			return (
				'<div class="rita-form-field">' +
				label +
				'<textarea id="' +
				id +
				'" name="' +
				field.name +
				'" placeholder="' +
				(field.placeholder || "") +
				'">' +
				(field.defaultValue || "") +
				"</textarea></div>"
			);
		}

		// input / text / default
		return (
			'<div class="rita-form-field">' +
			label +
			'<input type="' +
			(field.inputType || "text") +
			'" id="' +
			id +
			'" name="' +
			field.name +
			'" placeholder="' +
			(field.placeholder || "") +
			'" value="' +
			(field.defaultValue || "") +
			'" /></div>'
		);
	}

	// ---- Open modal ----
	function openModal(config) {
		injectStyles();
		closeModal();
		currentConfig = config;

		var fieldsHtml = (config.fields || []).map(renderField).join("");
		var submitClass =
			config.submitVariant === "destructive"
				? "rita-form-btn rita-form-btn-destructive"
				: "rita-form-btn rita-form-btn-submit";

		var html =
			'<div id="rita-form-modal-overlay">' +
			'<div id="rita-form-modal" class="size-' +
			(config.size || "full") +
			'">' +
			'<div id="rita-form-modal-header">' +
			'<div id="rita-form-modal-header-text">' +
			"<h3>" +
			(config.title || "Form") +
			"</h3>" +
			(config.description ? "<p>" + config.description + "</p>" : "") +
			"</div>" +
			'<button type="button" id="rita-form-modal-close">\u00d7</button>' +
			"</div>" +
			'<form id="rita-form-modal-form">' +
			'<div id="rita-form-modal-body">' +
			fieldsHtml +
			"</div>" +
			'<div id="rita-form-modal-footer">' +
			'<button type="button" class="rita-form-btn rita-form-btn-cancel" id="rita-form-cancel">' +
			(config.cancelLabel || "Cancel") +
			"</button>" +
			'<button type="submit" class="' +
			submitClass +
			'">' +
			(config.submitLabel || "Submit") +
			"</button>" +
			"</div></form></div></div>";

		document.body.insertAdjacentHTML("beforeend", html);

		var overlay = document.getElementById("rita-form-modal-overlay");

		// Cancel helpers
		function doCancel() {
			closeModal();
			postToIframe({
				type: "FORM_MODAL_CANCELLED",
				requestId: config.requestId,
			});
		}

		// Overlay click — dismiss only (no cancel)
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) {
				closeModal();
			}
		});

		// Cancel button
		overlay
			.querySelector("#rita-form-cancel")
			.addEventListener("click", doCancel);

		// Close (X) button — dismiss only (no cancel)
		overlay
			.querySelector("#rita-form-modal-close")
			.addEventListener("click", closeModal);

		// Form submit
		overlay
			.querySelector("#rita-form-modal-form")
			.addEventListener("submit", (e) => {
				e.preventDefault();
				var fd = new FormData(e.target);
				var data = {};
				fd.forEach((v, k) => {
					data[k] = v;
				});
				closeModal();
				postToIframe({
					type: "FORM_MODAL_SUBMITTED",
					requestId: config.requestId,
					action: config.submitAction,
					data: data,
				});
			});

		// ESC key — dismiss only (no cancel)
		escHandler = (e) => {
			if (e.key === "Escape") {
				closeModal();
			}
		};
		document.addEventListener("keydown", escHandler);
	}

	// ---- PostMessage listener ----
	window.addEventListener("message", (event) => {
		var msg = event.data;
		var ackIframe;
		if (!msg || typeof msg !== "object") return;

		if (msg.type === "RITA_FORM_MODAL") {
			// ACK immediately so iframe knows host will handle it
			ackIframe = findRitaIframe();
			if (ackIframe && ackIframe.contentWindow) {
				ackIframe.contentWindow.postMessage(
					{ type: "RITA_FORM_MODAL_ACK" },
					"*",
				);
			}
			openModal(msg.payload);
		} else if (msg.type === "RITA_CLOSE_FORM_MODAL") {
			closeModal();
		}
	});
})();
