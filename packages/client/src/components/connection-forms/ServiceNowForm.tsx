import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import FormSection from './FormSection';
import FormField from './FormField';

export interface ServiceNowFormData {
  instanceUrl: string;
  username: string;
  password: string;
}

interface ServiceNowFormProps {
  onSubmit: (data: ServiceNowFormData) => void;
}

export function ServiceNowForm({ onSubmit }: ServiceNowFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ServiceNowFormData>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-full" id="connection-form">
      {/* Authentication */}
      <FormSection title="Authentication">
           {/* Instance URL */}
           <FormField label="Instance URL" errors={errors} name="instanceUrl">
             <Input
               id="instance-url"
               type="url"
               placeholder="https://your-instance.service-now.com"
               {...register('instanceUrl', { required: 'Instance URL is required' })}
             />
           </FormField>

          {/* Username */}
          <FormField label="Username" errors={errors} name="username">
            <Input
              id="username"
              type="text"
              placeholder="your-username"
              {...register('username', { required: 'Username is required' })}
            />
          </FormField>

          {/* Password */}
          <FormField label="Password" errors={errors} name="password">
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
            />
          </FormField>

      </FormSection>
    </form>
  );
}
