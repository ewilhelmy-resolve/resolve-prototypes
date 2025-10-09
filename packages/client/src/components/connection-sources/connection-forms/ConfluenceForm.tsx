import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import {
	parseAvailableSpaces,
	parseSelectedSpaces,
} from "@/lib/dataSourceUtils";
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

	const [availableSpaces, setAvailableSpaces] = useState<string[]>([]);
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
	} = useForm<ConfluenceFormData>({
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

	// Parse available spaces from latest_options (discovered during verification)
	// and pre-select spaces from settings (already configured)
	useEffect(() => {
		const available = parseAvailableSpaces(source.backendData?.latest_options);
		const selected = parseSelectedSpaces(source.backendData?.settings);

		if (available.length > 0) {
			setAvailableSpaces(available);
		}

		if (selected.length > 0) {
			setSelectedSpaces(selected);
		}
	}, [source.backendData?.latest_options, source.backendData?.settings]);

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
						spaces: selectedSpaces.join(","),
					},
					enabled: true,
				},
			});

			toast.success("Connection Configured", {
				description: "Your Confluence connection has been configured successfully",
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
				<FormField label="URL" errors={errors} name="url">
					<Input
						id="url"
						type="url"
						placeholder="https://your-company.atlassian.net"
						{...register("url", { required: "URL is required" })}
					/>
				</FormField>

				{/* User email */}
				<FormField label="User email" errors={errors} name="email">
					<Input
						id="email"
						type="email"
						placeholder="you@company.com"
						{...register("email", { required: "Email is required" })}
					/>
				</FormField>

				{/* API token */}
				<FormField label="API token" errors={errors} name="token">
					<Input
						id="token"
						type="password"
						placeholder="••••••••"
						{...register("token", { required: "API token is required" })}
					/>
				</FormField>

				{/* Spaces Selection - Show if available from latest_options (populated after verification) */}
				{availableSpaces.length > 0 && (
					<FormField label="Spaces (Optional)" errors={errors} name="spaces">
						<MultiSelect
							options={availableSpaces.map((space) => ({
								label: space,
								value: space,
							}))}
							defaultValue={selectedSpaces}
							onValueChange={setSelectedSpaces}
							placeholder="Select spaces to sync"
						/>
					</FormField>
				)}

				{/* Connect Button with optional Cancel */}
				<div className="flex justify-end gap-2 w-full">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button
						type="button"
						onClick={handleConnect}
						disabled={verifyMutation.isPending || updateMutation.isPending}
					>
						{verifyMutation.isPending || updateMutation.isPending
							? "Connecting..."
							: "Connect"}
					</Button>
				</div>
			</FormSection>
		</ConnectionsForm>
	);
}
