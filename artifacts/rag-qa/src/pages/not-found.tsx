export default function NotFound() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-foreground flex-col gap-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-primary tracking-tighter">404</h1>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">System Not Found</h2>
        <p className="mt-2 text-muted-foreground">The resource you are looking for does not exist in the index.</p>
      </div>
    </div>
  );
}