export function PreviewPanel() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="aspect-video bg-black/90 w-full max-w-4xl mx-4 rounded-lg shadow-lg relative group">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors">
          Drop media here or click to import
        </div>
      </div>
    </div>
  );
}
