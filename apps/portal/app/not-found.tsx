import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-0 h-full flex items-center justify-center bg-gray-50">
      <div className="text-center px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">404: Page not found</h1>
        <p className="text-gray-600 mt-2">The page you were looking for doesn’t exist.</p>
        <div className="mt-6">
          <Link href="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
