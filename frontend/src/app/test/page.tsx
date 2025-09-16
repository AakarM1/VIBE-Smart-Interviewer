export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🎉 Server is Working!
        </h1>
        <p className="text-gray-600 mb-4">
          The Next.js development server is running successfully.
        </p>
        <div className="text-sm text-gray-500">
          <p>Port: 3000</p>
          <p>Environment: Development</p>
          <p>Status: ✅ Ready</p>
        </div>
        <div className="mt-6">
          <a 
            href="/" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Go to Main App
          </a>
        </div>
      </div>
    </div>
  );
}
