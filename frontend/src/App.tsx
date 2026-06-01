function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-yellow-400">
          Stock Dashboard
        </h1>

        <div className="text-sm">
          Bertrandt Electronics Inventory
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-gray-900 text-white p-4">
          <nav className="space-y-4">
            <div className="cursor-pointer hover:text-yellow-400">
              Dashboard
            </div>

            <div className="cursor-pointer hover:text-yellow-400">
              Inventory
            </div>

            <div className="cursor-pointer hover:text-yellow-400">
              Reservations
            </div>

            <div className="cursor-pointer hover:text-yellow-400">
              Collaborators
            </div>

            <div className="cursor-pointer hover:text-yellow-400">
              Analytics
            </div>

            <div className="cursor-pointer hover:text-yellow-400">
              Settings
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8">
          <h2 className="text-3xl font-bold mb-8">
            Dashboard Overview
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Total Parts</p>
              <h3 className="text-3xl font-bold">1,250</h3>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Available</p>
              <h3 className="text-3xl font-bold text-green-600">
                980
              </h3>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Borrowed</p>
              <h3 className="text-3xl font-bold text-blue-600">
                210
              </h3>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Low Stock</p>
              <h3 className="text-3xl font-bold text-red-600">
                18
              </h3>
            </div>
          </div>

          {/* Placeholder Table */}
          <div className="mt-10 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">
              Recent Reservations
            </h3>

            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Collaborator</th>
                  <th className="text-left py-2">Part</th>
                  <th className="text-left py-2">Quantity</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="py-2">Ahmed</td>
                  <td>STM32 Nucleo</td>
                  <td>2</td>
                  <td>Borrowed</td>
                </tr>

                <tr>
                  <td className="py-2">Sara</td>
                  <td>Ultrasonic Sensor</td>
                  <td>5</td>
                  <td>Reserved</td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
