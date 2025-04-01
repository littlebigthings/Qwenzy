import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Link } from "wouter"

export default function HomeNew() {
  const { user } = useAuth()
  const [userName, setUserName] = useState("Sarah")
  const [organizationName, setOrganizationName] = useState("Lit Big Things")

  useEffect(() => {
    // Update user info when available
    if (user) {
      // Use user's name or extract from email
      setUserName(user.email?.split('@')[0] || "User")
    }
  }, [user])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r flex-shrink-0">
        {/* Organization header */}
        <div className="bg-[#2c6e49] text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#2c6e49] font-bold">
              {organizationName.charAt(0)}
            </div>
            <span className="ml-2 font-medium">{organizationName}</span>
          </div>
          <button>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-2">
          <ul>
            <li>
              <Link href="/dashboard">
                <a className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                  <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/updates">
                <a className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Updates
                  <span className="ml-auto bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </Link>
            </li>

            {/* APPLICATION section */}
            <li className="mt-6 px-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">APPLICATION</p>
            </li>
            <li>
              <button className="w-full flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                List
                <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <ul className="pl-10">
                <li>
                  <Link href="/list">
                    <a className="block px-4 py-2 text-white bg-[#2c6e49]">List</a>
                  </Link>
                </li>
                <li>
                  <Link href="/list/1">
                    <a className="block px-4 py-2 text-gray-600 hover:bg-gray-100">List</a>
                  </Link>
                </li>
                <li>
                  <Link href="/list/2">
                    <a className="block px-4 py-2 text-gray-600 hover:bg-gray-100">List</a>
                  </Link>
                </li>
                <li>
                  <Link href="/list/3">
                    <a className="block px-4 py-2 text-gray-600 hover:bg-gray-100">List</a>
                  </Link>
                </li>
              </ul>
            </li>

            <li>
              <Link href="/roles">
                <a className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Roles & Permissions
                  <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <main className="p-8">
          {/* Welcome header */}
          <div className="max-w-4xl mx-auto mb-10 bg-white p-8 rounded-lg shadow-sm">
            <div className="text-center max-w-md mx-auto">
              <h1 className="text-3xl font-semibold text-[#2c6e49] mb-4">Welcome {userName}!</h1>
              <h2 className="text-xl font-medium mb-2">Kickstart Your Workspace Creation</h2>
              <p className="text-gray-600 mb-6">
                A workspace is your central hub for organizing projects, tasks, and teams. 
                Create one to start managing your work efficiently and collaborate seamlessly
              </p>
              <Button className="bg-[#2c6e49] hover:bg-[#26593d] px-6">
                <span className="mr-2">+</span> Create a workspace
              </Button>
            </div>
          </div>

          {/* Project grids */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Active projects */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-700">No Active Projects</h2>
                <button className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  Join a workspace or create your own to start adding & tracking your projects
                </p>
              </div>
            </div>

            {/* Recent projects */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-700">No recently opened projects</h2>
              </div>
              
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  Join a workspace or create your own to start adding & tracking your projects
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}