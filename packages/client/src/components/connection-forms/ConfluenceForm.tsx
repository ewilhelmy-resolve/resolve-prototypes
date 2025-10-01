import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConfluenceFormData {
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-full" id="connection-form">
      {/* Authentication */}
      <section className="self-stretch rounded-lg flex flex-col items-start gap-4">
        <div className="inline-flex items-center gap-2">
          <h2 className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">
            Authentication
          </h2>
        </div>

        <div className="self-stretch flex flex-col items-start gap-4">
          {/* URL */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://your-company.atlassian.net/wiki"
              {...register('url', { required: 'URL is required' })}
            />
            {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
          </div>

          {/* User email */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="email">User email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          {/* API token */}
          <div className="self-stretch flex flex-col items-start gap-2">
            <Label htmlFor="token">API token</Label>
            <Input
              id="token"
              type="password"
              placeholder="••••••••"
              {...register('token', { required: 'API token is required' })}
            />
            {errors.token && <p className="text-sm text-destructive">{errors.token.message}</p>}
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="self-stretch rounded-lg flex flex-col items-start gap-4">
        <div className="flex flex-col gap-4 self-stretch rounded-lg">
          <div className="inline-flex items-center gap-2">
            <h2 className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">
              Preferences
            </h2>
          </div>
          <div className="self-stretch flex flex-col items-start gap-4">
            <div className="self-stretch flex flex-col items-start gap-2">
              <Label htmlFor="spaces">Spaces</Label>
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
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
