import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import FormSection from './FormSection';
import FormField from './FormField';
import ConnectionsForm from './ConnectionsForm';

export interface SharePointFormData {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
}

interface SharePointFormProps {
  onSubmit: (data: SharePointFormData) => void;
}

export function SharePointForm({ onSubmit }: SharePointFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<SharePointFormData>();

  return (
    <ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
      {/* Authentication */}
      <FormSection title='Authentication'>
           {/* Tenant ID */}
           <FormField label="Tenant ID" errors={errors} name="tenantId">
             <Input
               id="tenant-id"
               type="text"
               placeholder="your-tenant-id"
               {...register('tenantId', { required: 'Tenant ID is required' })}
             />
           </FormField>

          {/* Client ID */}
          <FormField label="Client ID" errors={errors} name="clientId">
            <Input
              id="client-id"
              type="text"
              placeholder="your-client-id"
              {...register('clientId', { required: 'Client ID is required' })}
            />
          </FormField>
          {/* Client Secret */}
          <FormField label="Client Secret" errors={errors} name="clientSecret">
            <Input
              id="client-secret"
              type="password"
              placeholder="••••••••"
              {...register('clientSecret', { required: 'Client Secret is required' })}
            />
          </FormField>

          {/* Site URL */}
          <FormField label="Site URL" errors={errors} name="siteUrl">
            <Input
              id="site-url"
              type="url"
              placeholder="https://your-company.sharepoint.com"
              {...register('siteUrl', { required: 'Site URL is required' })}
            />
          </FormField>
      </FormSection>
    </ConnectionsForm>
  );
}
