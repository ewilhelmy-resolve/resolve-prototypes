const ConnectionsForm =
  ({ children, handleSubmit, id }: { children: React.ReactNode; handleSubmit: (data: any) => void; id: string }) => {
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full" id={id}>
      {
        children
      }
    </form>
  );
};

export default ConnectionsForm;
