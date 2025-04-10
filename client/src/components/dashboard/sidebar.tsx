// components/Sidebar.tsx
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  organization: { name: string };
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function Sidebar({ organization, activeMenu, setActiveMenu }: SidebarProps) {
  const [isListOpen, setIsListOpen] = useState(true);

  return (
    <div className="w-56 bg-white shadow-sm z-10 border-r">
      {/* Header */}
      <div className="p-4 bg-[#579189] text-white flex items-center">
        <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#2c6e49] font-bold">
          {organization.name.charAt(0)}
        </div>
        <span className="font-medium ml-2">{organization.name}</span>
        <button className="ml-auto">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="py-2">
        <ul>
          <li>
            <button 
              className={`w-full flex items-center px-4 py-2 ${activeMenu === 'dashboard' 
                ? 'bg-[#579189] text-white' 
                : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveMenu('dashboard')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
          </li>
          <li>
            <button 
              className={`w-full flex items-center px-4 py-2 ${activeMenu === 'updates' 
                ? 'bg-[#579189] text-white' 
                : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveMenu('updates')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Updates
              <span className="ml-auto bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
            </button>
          </li>

          {/* Application Section */}
          <li className="mt-6 px-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Application</p>
          </li>
          <li>
            <button 
              className={`w-full flex items-center px-4 py-2 ${activeMenu.startsWith('list') 
                ? 'bg-[#579189] text-white' 
                : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setIsListOpen(!isListOpen)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              List
              <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isListOpen && (
              <ul className="pl-10">
                {['list-main', 'list-1', 'list-2', 'list-3'].map((key) => (
                  <li key={key}>
                    <button 
                      className={`w-full text-left px-4 py-2 ${activeMenu === key 
                        ? 'bg-[#579189] text-white' 
                        : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => setActiveMenu(key)}
                    >
                      List
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
          <li>
            <button 
              className={`w-full flex items-center px-4 py-2 ${activeMenu === 'roles' 
                ? 'bg-[#579189] text-white' 
                : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveMenu('roles')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Roles & Permissions
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
