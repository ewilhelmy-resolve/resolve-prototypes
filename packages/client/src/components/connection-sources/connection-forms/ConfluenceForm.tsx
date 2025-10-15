import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import { toast } from "@/lib/toast";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

export interface ConfluenceFormData {
	url: string;
	email: string;
	token: string;
	spaces?: string[];
}

interface ConfluenceFormProps {
	onCancel?: () => void;
}

export function ConfluenceForm({ onCancel }: ConfluenceFormProps = {}) {
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
		getValues,
	} = useForm<ConfluenceFormData>({
		mode: "onChange",
		defaultValues: {
			url: source.backendData?.settings?.url || "",
			email: source.backendData?.settings?.email || "",
			token: "",
			spaces:
				source.backendData?.settings?.spaces
					?.split(",")
					.map((s: string) => s.trim()) || [],
		},
	});

	const handleConnect = async () => {
		const formData = getValues();

		if (!formData.url || !formData.email || !formData.token) {
			toast.error("Validation Error", {
				description: "Please fill in all authentication fields",
			});
			return;
		}

		try {
			// Step 1: Verify credentials
			await verifyMutation.mutateAsync({
				id: source.id,
				payload: {
					settings: {
						url: formData.url,
						email: formData.email,
					},
					credentials: {
						apiToken: formData.token,
					},
				},
			});

			// Step 2: Save configuration immediately after verification
			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {
						url: formData.url,
						email: formData.email,
					},
					enabled: true,
				},
			});

			toast.success("Connection Configured", {
				description:
					"Your Confluence connection has been configured successfully",
			});
		} catch (error) {
			toast.error("Connection Failed", {
				description:
					error instanceof Error
						? error.message
						: "Failed to configure connection",
			});
		}
	};

	const onSubmit = async () => {
		await handleConnect();
	};

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Authentication */}
			<FormSection title="Authentication">
				{/* URL */}
				<FormField label="URL" errors={errors} name="url" required>
					<Input
						id="url"
						type="url"
						placeholder="https://your-company.atlassian.net"
						{...register("url", {
							required: "URL is required",
							pattern: {
								value: /^https?:\/\/.+/,
								message: "Please enter a valid URL",
							},
						})}
					/>
				</FormField>

				{/* User email */}
				<FormField label="User email" errors={errors} name="email" required>
					<Input
						id="email"
						type="email"
						placeholder="you@company.com"
						{...register("email", {
							required: "Email is required",
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: "Please enter a valid email address",
							},
						})}
					/>
				</FormField>

				{/* API token */}
				<FormField label="API token" errors={errors} name="token" required>
					<Input
						id="token"
						type="password"
						placeholder="••••••••"
						{...register("token", {
							required: "API token is required",
							minLength: {
								value: 1,
								message: "API token cannot be empty",
							},
						})}
					/>
				</FormField>

				{/* Connect Button with optional Cancel */}
				<div className="flex justify-start gap-2 w-full">
					<Button
						type="button"
						onClick={handleConnect}
						disabled={
							!isValid || verifyMutation.isPending || updateMutation.isPending
						}
					>
						{verifyMutation.isPending || updateMutation.isPending ? (
							<>
								<Spinner className="mr-2" />
								Connecting...
							</>
						) : (
							"Connect"
						)}
					</Button>

					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>

				{verifyMutation.isPending && (
					<StatusAlert variant="info">
						<p className=" text-accent-foreground">Connection may take time</p>
						<p>You can leave this page while it is connecting</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}
