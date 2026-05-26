import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="p-7 max-w-6xl">
      <h1 className="font-display text-2xl font-black tracking-tight text-gray-900">
        Dashboard
      </h1>
      <p className="font-mono text-sm text-gray-400 mt-1">
        Bienvenido a RENUX
      </p>
    </div>
  );
}
