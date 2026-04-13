import { ApiHealthButton } from "@/components/ApiHealthButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">API Health Check</h1>
      <ApiHealthButton />
    </main>
  );
}
