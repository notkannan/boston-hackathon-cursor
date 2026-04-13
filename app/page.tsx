import { SupportTickets } from "@/components/SupportTickets";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-8 p-8">
      <div className="flex flex-col gap-2 text-center pt-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Customer Support</h1>
        <p className="text-base text-muted-foreground">
          Raise a ticket or view the status of existing requests.
        </p>
      </div>
      <SupportTickets />
    </main>
  );
}
