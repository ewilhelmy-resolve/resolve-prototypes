import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ServiceNowFormData {
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
      <section className="self-stretch rounded-lg flex flex-col items-start gap-4">
        <div className="inline-flex items-center gap-2">
          <h2 className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">
            Authentication
          </h2>
        </div>

        <div className="self-stretch flex flex-col items-start gap-4">
          {/* Instance URL */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="instance-url">Instance URL</Label>
            <Input
              id="instance-url"
              type="url"
              placeholder="https://your-instance.service-now.com"
              {...register('instanceUrl', { required: 'Instance URL is required' })}
            />
            {errors.instanceUrl && <p className="text-sm text-destructive">{errors.instanceUrl.message}</p>}
          </div>

          {/* Username */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="your-username"
              {...register('username', { required: 'Username is required' })}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>

          {/* Password */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
        </div>
      </section>
    </form>
  );
}
