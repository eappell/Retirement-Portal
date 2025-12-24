import Link from "next/link";

export const metadata = {
  title: "Contact Us - RetireWise",
  description: "Contact RetireWise support and general inquiries.",
};

export default function ContactPage() {
  return (
    <main className="max-w-[780px] mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-4">Contact Us</h1>
      <p className="text-sm text-gray-600 mb-4">For support or general inquiries, email us at <a href="mailto:support@retirewise.example" className="underline">support@retirewise.example</a>.</p>
      <p className="text-sm text-gray-600 mb-4">If you prefer, leave a short message below (this is just a placeholder form):</p>
      <form className="flex flex-col gap-3 max-w-md">
        <input className="border rounded px-3 py-2" placeholder="Your name" />
        <input className="border rounded px-3 py-2" placeholder="Your email" />
        <textarea className="border rounded px-3 py-2" rows={4} placeholder="Your message"></textarea>
        <div className="text-sm text-gray-500">This form is a placeholder and not functional yet.</div>
      </form>
      <div className="mt-6">
        <Link href="/dashboard" className="text-sm underline">Back to Dashboard</Link>
      </div>
    </main>
  );
}
