import Link from "next/link";

export const metadata = {
  title: "FAQs - RetireWise",
  description: "Frequently asked questions about RetireWise.",
};

export default function FaqsPage() {
  return (
    <main className="max-w-[780px] mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-4">FAQs</h1>

      <dl className="space-y-4 text-sm text-gray-600">
        <div>
          <dt className="font-medium">How secure is my data?</dt>
          <dd className="mt-1">We take security seriously — this is placeholder text. Replace with your security summary.</dd>
        </div>
        <div>
          <dt className="font-medium">Can I export my plans?</dt>
          <dd className="mt-1">Yes — export options exist in the app. This page is a placeholder for more detailed answers.</dd>
        </div>
      </dl>

      <div className="mt-6">
        <Link href="/dashboard" className="text-sm underline">Back to Dashboard</Link>
      </div>
    </main>
  );
}
