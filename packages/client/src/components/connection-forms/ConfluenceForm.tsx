import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormSection from './FormSection';
import FormField from './FormField';
import ConnectionsForm from './ConnectionsForm';

export interface ConfluenceFormData {
  url: string;
  email: string;
  token: string;
  spaces?: string;
}

interface ConfluenceFormProps {
  onSubmit: (data: ConfluenceFormData) => void;
}

export function ConfluenceForm({ onSubmit }: ConfluenceFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ConfluenceFormData>();

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
          <Select>
            <SelectTrigger id="spaces">
              <SelectValue placeholder="Choose a space" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="it">IT</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>
    </ConnectionsForm>
  );
}
