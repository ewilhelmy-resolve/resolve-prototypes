const FormSectionTitle = ({ title }: { title: string }) => {
  return (
    <div className="inline-flex items-center gap-2">
          <h2 className="text-xl leading-7 tracking-[-0.01em] text-foreground">
            {title}
          </h2>
        </div>
    );
};

export default FormSectionTitle;