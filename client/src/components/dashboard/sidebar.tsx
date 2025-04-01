import React, { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { ChevronDown, ChevronRight, LayoutDashboard, Menu, FileIcon, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SidebarProps = {
  organizationName: string
}

export function Sidebar({ organizationName }: SidebarProps) {
  const [location] = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isListExpanded, setIsListExpanded] = useState(true)
  
  return (
    <div className="h-screen flex flex-col bg-white border-r">
      {/* Organization header */}
      <div className="p-4 bg-[#2c6e49] text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#2c6e49] font-bold">
            {organizationName.charAt(0)}
          </div>
          <span className="font-medium">{organizationName}</span>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation links */}
      <nav className={cn(
        "flex-1 overflow-y-auto",
        isMobileMenuOpen ? "block" : "hidden md:block"
      )}>
        <div className="px-3 py-2">
          <div className="space-y-1">
            <Link href="/dashboard">
              <a className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                location === "/dashboard" 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Dashboard
                <ChevronRight className="ml-auto h-5 w-5" />
              </a>
            </Link>
            
            <Link href="/updates">
              <a className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                location === "/updates" 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Updates
                <div className="ml-auto bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">3</div>
                <ChevronRight className="ml-2 h-5 w-5" />
              </a>
            </Link>
          </div>
          
          <div className="mt-6">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              APPLICATION
            </p>
            <div className="mt-2 space-y-1">
              <button 
                className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setIsListExpanded(!isListExpanded)}
              >
                <FileIcon className="mr-3 h-5 w-5" />
                List
                {isListExpanded ? 
                  <ChevronDown className="ml-auto h-5 w-5" /> : 
                  <ChevronRight className="ml-auto h-5 w-5" />
                }
              </button>
              
              {isListExpanded && (
                <div className="pl-10 space-y-1">
                  <Link href="/list">
                    <a className={cn(
                      "block px-3 py-2 rounded-md text-sm font-medium",
                      location === "/list" 
                        ? "bg-[#2c6e49] text-white" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}>
                      List
                    </a>
                  </Link>
                  <Link href="/list/1">
                    <a className="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                      List
                    </a>
                  </Link>
                  <Link href="/list/2">
                    <a className="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                      List
                    </a>
                  </Link>
                  <Link href="/list/3">
                    <a className="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                      List
                    </a>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <Link href="/roles">
              <a className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                location === "/roles" 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
                <Users className="mr-3 h-5 w-5" />
                Roles & Permissions
                <ChevronRight className="ml-auto h-5 w-5" />
              </a>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}