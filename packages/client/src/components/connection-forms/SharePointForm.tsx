import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormSectionTitle from './FormSectionTitle';

interface SharePointFormData {
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-full" id="connection-form">
      {/* Authentication */}
      <section className="self-stretch rounded-lg flex flex-col items-start gap-4">
      <FormSectionTitle title="Authentication" />

        <div className="self-stretch flex flex-col items-start gap-4">
          {/* Tenant ID */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="tenant-id">Tenant ID</Label>
            <Input
              id="tenant-id"
              type="text"
              placeholder="your-tenant-id"
              {...register('tenantId', { required: 'Tenant ID is required' })}
            />
            {errors.tenantId && <p className="text-sm text-destructive">{errors.tenantId.message}</p>}
          </div>

          {/* Client ID */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="client-id">Client ID</Label>
            <Input
              id="client-id"
              type="text"
              placeholder="your-client-id"
              {...register('clientId', { required: 'Client ID is required' })}
            />
            {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
          </div>

          {/* Client Secret */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="client-secret">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="••••••••"
              {...register('clientSecret', { required: 'Client Secret is required' })}
            />
            {errors.clientSecret && <p className="text-sm text-destructive">{errors.clientSecret.message}</p>}
          </div>

          {/* Site URL */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="site-url">Site URL</Label>
            <Input
              id="site-url"
              type="url"
              placeholder="https://your-company.sharepoint.com"
              {...register('siteUrl', { required: 'Site URL is required' })}
            />
            {errors.siteUrl && <p className="text-sm text-destructive">{errors.siteUrl.message}</p>}
          </div>
        </div>
      </section>
    </form>
  );
}
