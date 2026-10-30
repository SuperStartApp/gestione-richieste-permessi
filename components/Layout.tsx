
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* CONTENUTO PRINCIPALE DELLA WEB APP */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

    </div>
  );
}
