import FormSectionTitle from "./FormSectionTitle";

const FormSection =  ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <section className="self-stretch rounded-lg flex flex-col items-start gap-4">
       <FormSectionTitle title={title} />
       <div className="self-stretch flex flex-col items-start gap-4">
        {children}
      </div>
    </section>
  )
}

export default FormSection; 