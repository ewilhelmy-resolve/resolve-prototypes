import { useForm } from 'react-hook-form';
import FormSection from './FormSection';
import ConnectionsForm from './ConnectionsForm';

export  interface WebSearchFormData {
  enableSearch: boolean;
}

interface WebSearchFormProps {
  onSubmit: (data: WebSearchFormData) => void;
}

export function WebSearchForm({ onSubmit }: WebSearchFormProps) {
  const { handleSubmit } = useForm<WebSearchFormData>();

  return (
    <ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
      {/* Settings */}
      <FormSection title="Settings">
           {/* Enable web search */}
           TODO
      </FormSection>
    </ConnectionsForm>
  );
}
