import VideoCard from "@/components/VideoCard";

export default async function HomePage() {
  let videos = [];
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      videos = data.videos || [];
    }
  } catch (error) {
    console.log("Backend not connected yet");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Recommended Videos</h1>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <h2 className="text-xl text-gray-500">No videos yet</h2>
          <p className="text-gray-400 mt-2">Videos will appear here once connected to backend</p>
        </div>
      )}
    </div>
  );
}