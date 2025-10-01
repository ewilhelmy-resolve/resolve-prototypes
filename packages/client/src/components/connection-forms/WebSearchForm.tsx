import { useForm } from 'react-hook-form';
import FormSection from './FormSection';

export  interface WebSearchFormData {
  enableSearch: boolean;
}

interface WebSearchFormProps {
  onSubmit: (data: WebSearchFormData) => void;
}

export function WebSearchForm({ onSubmit }: WebSearchFormProps) {
  const { handleSubmit } = useForm<WebSearchFormData>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-full" id="connection-form">
      {/* Settings */}
      <FormSection title="Settings">
           {/* Enable web search */}
           TODO
      </FormSection>
    </form>
  );
}
