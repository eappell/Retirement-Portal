import Link from "next/link";

export const metadata = {
  title: "About Us - RetireWise",
  description: "About RetireWise — mission and product overview.",
};

export default function AboutPage() {
  return (
    <main className="max-w-[780px] mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-4">About RetireWise</h1>
      <p className="text-sm text-gray-600 mb-4">
        RetireWise helps people plan and visualize retirement income scenarios. This is a placeholder About page — replace with final copy when ready.
      </p>
      <p className="text-sm text-gray-600 mb-6">If you'd like to update this page now, paste the content and I will add it.</p>
      <Link href="/dashboard" className="text-sm underline">Back to Dashboard</Link>
    </main>
  );
}
