import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
            Turn your spreadsheet into a
            <span className="text-blue-600"> map in 30 seconds</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Upload a CSV or Excel file with addresses or lat/lng. MapDrop geocodes, styles, and hosts
            an interactive map — no code required.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/mapdrop/dashboard"
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Upload Your Data — Free
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Upload',
                desc: 'Drop a CSV or Excel file. We auto-detect address or lat/lng columns.',
              },
              {
                step: '2',
                title: 'Geocode & Style',
                desc: 'We convert addresses to coordinates and let you color-code by any column.',
              },
              {
                step: '3',
                title: 'Share',
                desc: 'Get a shareable link or embed the map on your site. Updates in real-time.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: '150K+ points', desc: 'Handles massive datasets with vector tiles and clustering.' },
              { title: 'Auto Geocoding', desc: 'Address → lat/lng via Nominatim, LocationIQ, and Mapbox.' },
              { title: 'Spreadsheet Upload', desc: 'CSV, Excel, Google Sheets. Drag and drop.' },
              { title: 'Data-Driven Styling', desc: 'Color and size points by any column value.' },
              { title: 'Private or Public', desc: 'Password-protected maps or public share links.' },
              { title: 'Embeddable', desc: 'Iframe embed for Notion, WordPress, or any site.' },
            ].map((f) => (
              <div key={f.title} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
