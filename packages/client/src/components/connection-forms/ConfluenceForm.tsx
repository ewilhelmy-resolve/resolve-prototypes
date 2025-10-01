import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { MultiSelectComboBox, type Option } from '@/components/ui/multi-select-combobox';
import FormSection from './FormSection';
import FormField from './FormField';
import ConnectionsForm from './ConnectionsForm';

export interface ConfluenceFormData {
  url: string;
  email: string;
  token: string;
  spaces?: string[];
}

interface ConfluenceFormProps {
  onSubmit: (data: ConfluenceFormData) => void;
}

const CONFLUENCE_SPACES: Option[] = [
  { label: "Architecture Team", value: "architecture" },
  { label: "Knowledge Base", value: "knowledge" },
  { label: "Engineering", value: "engineering" },
  { label: "Product Team", value: "product" },
  { label: "Sales and Marketing", value: "sales" },
  { label: "Design", value: "design" },
  { label: "IT", value: "it" },
];

export function ConfluenceForm({ onSubmit }: ConfluenceFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<ConfluenceFormData>();

  return (
    <ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
      {/* Authentication */}
      <FormSection title="Authentication">
        {/* URL */}
        <FormField label="URL" errors={errors} name="url">
          <Input
            id="url"
            type="url"
            placeholder="https://your-company.atlassian.net/wiki"
            {...register('url', { required: 'URL is required' })}
          />
        </FormField>

        {/* User email */}
        <FormField label="User email" errors={errors} name="email">
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register('email', { required: 'Email is required' })}
          />
        </FormField>

        {/* API token */}
        <FormField label="API token" errors={errors} name="token">
          <Input
            id="token"
            type="password"
            placeholder="••••••••"
            {...register('token', { required: 'API token is required' })}
          />
        </FormField>
      </FormSection>

      {/* Preferences */}
      <FormSection title="Preferences">
        <FormField label="Spaces" errors={errors} name="spaces">
          <Controller
            name="spaces"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <MultiSelectComboBox
                id="spaces"
                options={CONFLUENCE_SPACES}
                value={field.value}
                onChange={field.onChange}
                placeholder="Choose spaces..."
                searchPlaceholder="Search spaces..."
                emptyText="No spaces found."
              />
            )}
          />
        </FormField>
      </FormSection>
    </ConnectionsForm>
  );
}
