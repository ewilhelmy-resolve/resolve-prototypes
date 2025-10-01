import { useForm } from 'react-hook-form';
import FormSectionTitle from './FormSectionTitle';

interface WebSearchFormData {
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
      <section className="self-stretch rounded-lg flex flex-col items-start gap-4">
      <FormSectionTitle title="Authentication" />

        <div className="self-stretch flex flex-col items-start gap-4">
          {/* Enable web search */}
           TODO
        </div>
      </section>
    </form>
  );
}
