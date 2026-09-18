import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, UserCheck, MapPin, FileText,
  RefreshCw, AlertTriangle, Ticket, Eye, ClipboardCheck,
  ShieldCheck, ParkingSquare, Building2, BarChart3, TrendingUp,
  Route, Brain, BookOpen, Settings, Bell, ChevronRight,
  ChevronLeft, LogOut, Shield, Cpu, Map, Camera, ClipboardList, Moon, Sun
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabel, cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

export interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  navSections: NavSection[];
}

export function Sidebar({ collapsed, onToggle, navSections }: SidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      style={{
        width: collapsed ? 64 : 260,
        minWidth: collapsed ? 64 : 260,
        backgroundColor: '#0f172a', 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '1px solid #1e293b',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', padding: '0 16px',
        borderBottom: '1px solid #1e293b',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          {}
          <img
            src="/govserve.png"
            alt="GOVSERVE Logo"
            style={{
              width: collapsed ? 32 : 36,
              height: collapsed ? 32 : 36,
              objectFit: 'contain',
              flexShrink: 0,
              borderRadius: 4,
              filter: 'brightness(1.1)',
              transition: 'width 0.3s, height 0.3s',
            }}
          />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                GOV<span style={{ color: '#3b82f6' }}>SERVE</span>
              </span>
              <div style={{ fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: -1 }}>
                Transport Management
              </div>
            </div>
          )}
        </div>
      </div>

      {}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute', right: -12, top: 18,
          width: 24, height: 24, borderRadius: '50%',
          backgroundColor: '#1e293b', border: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#94a3b8', zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#475569'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 12px', scrollbarWidth: 'none' }}>
        {navSections.map((section, si) => (
          <div key={si} style={{ marginBottom: section.title ? 16 : 8 }}>
            {section.title && !collapsed && (
              <div style={{
                padding: '0 8px 8px', fontSize: '0.6875rem', fontWeight: 600,
                color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                {section.title}
              </div>
            )}
            {section.title && collapsed && <div style={{ height: 16 }} />}

            {section.items.map(item => {
              const isActive = location.pathname === item.to ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive: routerActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: (isActive || routerActive) ? '#ffffff' : '#94a3b8',
                    textDecoration: 'none',
                    margin: '2px 0',
                    transition: 'all 0.1s',
                    backgroundColor: (isActive || routerActive) ? '#1e293b' : 'transparent',
                    whiteSpace: 'nowrap',
                  })}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                      e.currentTarget.style.color = '#f8fafc';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {}
      <div style={{
        borderTop: '1px solid #1e293b',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 8,
        backgroundColor: '#0f172a'
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: '#334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
        }}>
          {user?.full_name?.[0] ?? 'U'}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{roleLabel(user?.role ?? '')}</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 8, marginLeft: collapsed ? 0 : 'auto' }}>
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={signOut}
            title="Sign out"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
