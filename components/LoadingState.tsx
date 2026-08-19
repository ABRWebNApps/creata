export default function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        AI is discovering creators...
      </h3>
      <p className="text-gray-600">
        Analyzing TikTok profiles, calculating engagement rates, finding contact
        info
      </p>
    </div>
  );
}
