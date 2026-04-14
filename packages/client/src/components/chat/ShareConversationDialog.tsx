import { CheckIcon, CopyIcon, Loader2, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	useDisableShare,
	useDisableShareFromSession,
	useEnableShare,
	useEnableShareFromSession,
} from "@/hooks/api/useShareConversation";

/**
 * Source of truth for the sharing call:
 *   - `conversationId` → authenticated Rita user sharing their own conversation
 *   - `sessionKey` → iframe Platform flow (Valkey session auth)
 * Exactly one must be provided.
 */
interface ShareConversationDialogProps {
	conversationId?: string;
	sessionKey?: string;
	trigger?: React.ReactNode;
	/** Controlled open state — when provided, dialog becomes controlled */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog to share/unshare a conversation via shareable link.
 * Single flow: Generate link → copy → (optional) disable.
 * The share link is an opaque 32-char hex shareId — that IS the secret.
 *
 * Can be used uncontrolled (provide `trigger`) or controlled (provide
 * `open` + `onOpenChange` from the parent, omit trigger).
 */
export function ShareConversationDialog({
	conversationId,
	sessionKey,
	trigger,
	open: openProp,
	onOpenChange: onOpenChangeProp,
}: ShareConversationDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = openProp !== undefined;
	const open = isControlled ? openProp : internalOpen;
	const setOpen = isControlled
		? (v: boolean) => onOpenChangeProp?.(v)
		: setInternalOpen;
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

	useEffect(() => {
		return () => clearTimeout(copyTimerRef.current);
	}, []);

	const enableAuth = useEnableShare();
	const disableAuth = useDisableShare();
	const enableSession = useEnableShareFromSession();
	const disableSession = useDisableShareFromSession();

	const isPending =
		enableAuth.isPending ||
		disableAuth.isPending ||
		enableSession.isPending ||
		disableSession.isPending;

	const error =
		enableAuth.error ||
		disableAuth.error ||
		enableSession.error ||
		disableSession.error;

	const handleEnable = async () => {
		setShareUrl(null);
		const res = conversationId
			? await enableAuth.mutateAsync(conversationId)
			: sessionKey
				? await enableSession.mutateAsync(sessionKey)
				: null;
		if (res) setShareUrl(res.shareUrl);
	};

	const handleDisable = async () => {
		if (conversationId) await disableAuth.mutateAsync(conversationId);
		else if (sessionKey) await disableSession.mutateAsync(sessionKey);
		setShareUrl(null);
	};

	const handleCopy = async () => {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			clearTimeout(copyTimerRef.current);
			copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard unavailable — leave icon as copy
		}
	};

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) {
			setShareUrl(null);
			setCopied(false);
			clearTimeout(copyTimerRef.current);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{!isControlled && (
				<DialogTrigger asChild>
					{trigger ?? (
						<Button variant="outline" size="sm">
							<Share2 className="size-4 mr-2" />
							Share
						</Button>
					)}
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share conversation</DialogTitle>
					<DialogDescription>
						Creates a read-only snapshot of this conversation at its current
						state. Anyone with the link can view it until you disable sharing.
					</DialogDescription>
				</DialogHeader>

				{!shareUrl ? (
					<Button
						onClick={handleEnable}
						disabled={isPending}
						className="w-full"
					>
						{isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
						Generate share link
					</Button>
				) : (
					<div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
						<input
							readOnly
							value={shareUrl}
							className="flex-1 bg-transparent text-xs outline-none"
							onClick={(e) => e.currentTarget.select()}
						/>
						<Button
							size="icon"
							variant="ghost"
							onClick={handleCopy}
							aria-label="Copy share link"
						>
							{copied ? (
								<CheckIcon className="size-4" />
							) : (
								<CopyIcon className="size-4" />
							)}
						</Button>
					</div>
				)}

				{error && (
					<p className="text-sm text-destructive">{(error as Error).message}</p>
				)}

				<DialogFooter className="sm:justify-between">
					<Button variant="ghost" onClick={handleDisable} disabled={isPending}>
						Disable sharing
					</Button>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
