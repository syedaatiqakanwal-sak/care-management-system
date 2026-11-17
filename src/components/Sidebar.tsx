import { Stack, UnstyledButton, Group, Text, rem, Box, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { Users, Phone, LogOut, BookOpen, Settings, UserPlus, FileText, PanelLeftClose, PanelLeft, User, ClipboardCheck, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check } from 'lucide-react';
import { logout } from '../utils/auth';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSidebar } from '../contexts/SidebarContext';

const sidebarStyles = `
  .cpd-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    background: #ffffff;
  }

  .cpd-sidebar-nav {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .cpd-sidebar-nav::-webkit-scrollbar {
    display: none;
  }

  .cpd-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border-radius: 10px;
    box-sizing: border-box;
    border: none;
    background: transparent;
    color: #495057;
    font-weight: 600;
    font-size: 13.5px;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .cpd-nav-item:hover:not(.cpd-nav-item--active) {
    background: rgba(30, 186, 242, 0.08);
    color: #212529;
  }

  .cpd-nav-item:focus-visible {
    outline: 2px solid rgba(30, 186, 242, 0.65);
    outline-offset: 2px;
  }

  .cpd-nav-item--active {
    color: #ffffff;
    font-weight: 700;
    background: linear-gradient(135deg, #1EBAF2 0%, #E51690 100%);
    box-shadow: 0 4px 14px rgba(30, 186, 242, 0.28);
  }

  .cpd-nav-item--active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.45);
  }

  .cpd-nav-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
  }

  .cpd-nav-icon svg {
    width: 18px;
    height: 18px;
  }

  .cpd-sidebar-close {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #f8f9fa;
    color: #495057;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, color 160ms ease;
  }

  .cpd-sidebar-close:hover {
    background: #ffffff;
    border-color: rgba(30, 186, 242, 0.35);
    color: #1EBAF2;
    box-shadow: 0 2px 8px rgba(30, 186, 242, 0.18);
    transform: scale(1.04);
  }

  .cpd-sidebar-close:focus-visible {
    outline: 2px solid rgba(30, 186, 242, 0.65);
    outline-offset: 2px;
  }

  .cpd-sidebar-footer {
    flex-shrink: 0;
    padding-top: 12px;
    margin-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .cpd-signout {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: rgba(248, 249, 250, 0.95);
    color: #c92a2a;
    cursor: pointer;
    transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .cpd-signout:hover {
    background: rgba(250, 82, 82, 0.08);
    border-color: rgba(250, 82, 82, 0.18);
    box-shadow: 0 2px 8px rgba(250, 82, 82, 0.1);
    transform: translateY(-1px);
  }

  .cpd-signout:focus-visible {
    outline: 2px solid rgba(250, 82, 82, 0.55);
    outline-offset: 2px;
  }

  .cpd-signout-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(250, 82, 82, 0.1);
    flex-shrink: 0;
  }
`;

const data = [
    { link: '/dashboard', label: 'Staff', icon: Users },
    { link: '/register', label: 'Add Staff', icon: UserPlus },
    { link: '/dashboard/me', label: 'View Profile', icon: User },
    { link: '/courses', label: 'Courses', icon: BookOpen },
    { link: '/dashboard/policies', label: 'Policies', icon: FileText },
    { link: '/dashboard/references/analytics', label: 'Reference', icon: ClipboardCheck },
    { link: 'https://wa.me/447999378090', label: 'Contact', icon: Phone },
    { link: '/settings', label: 'Settings', icon: Settings },
];

function isNavItemActive(link: string, pathname: string): boolean {
    if (link.startsWith('http')) return false;
    if (link === '/dashboard') {
        return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    if (link === '/dashboard/me' && pathname.startsWith('/dashboard/me')) {
        return true;
    }
    return pathname === link;
}

export function Sidebar({
    onLinkClick,
    hideHeader = false,
    onClose,
}: {
    onLinkClick?: () => void;
    hideHeader?: boolean;
    onClose?: () => void;
} = {}) {
    const navigate = useNavigate();
    const location = useLocation();
    const { collapsed, toggle } = useSidebar();

    const role = (localStorage.getItem('role') || '').toLowerCase();
    const token = localStorage.getItem('token');
    const isAdmin = role === 'admin';
    const portalTitle = isAdmin ? 'Admin Portal' : 'Staff Portal';
    const portalSubtitle = isAdmin ? 'Administrator' : 'Staff Member';
    // Mobile drawer always shows expanded labels
    const isCompact = onClose ? false : collapsed;

    const [unreadPolicyCount, setUnreadPolicyCount] = useState(0);

    useEffect(() => {
        if (role !== 'staff' || !token) return;

        const fetchPolicyNotifs = async () => {
            try {
                const res = await axios.get('/api/v1/policy-notifications/my', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const unread = (res.data || []).filter((n: any) => !n.isRead).length;
                setUnreadPolicyCount(unread);
            } catch {
                // ignore
            }
        };

        fetchPolicyNotifs();
        const interval = setInterval(fetchPolicyNotifs, 60000);

        const onPolicyNotifsUpdated = () => fetchPolicyNotifs();
        window.addEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);
        };
    }, [role, token]);

    // Filter links based on role
    const filteredLinks = data.filter((item) => {
        if ((item.label === 'Staff' || item.label === 'Add Staff' || item.label === 'Settings' || item.label === 'Reference') && role !== 'admin') return false;
        if (item.label === 'View Profile' && role !== 'staff') return false;
        if (item.label === 'Courses' && role !== 'admin') return false;
        return true;
    });

    const handleNavClick = (link: string) => {
        if (link.startsWith('http')) {
            window.open(link, '_blank');
        } else if (link !== '#') {
            navigate(link);
        }
        if (onLinkClick) {
            onLinkClick();
        }
    };

    const handleSignOut = () => {
        logout();
        notifications.show({
            title: 'Signed Out',
            message: 'You have been successfully logged out.',
            color: 'blue',
            icon: <Check size={16} />,
        });
        navigate('/');
        if (onLinkClick) {
            onLinkClick();
        }
    };

    const links = filteredLinks.map((item) => {
        const isActive = isNavItemActive(item.link, location.pathname);
        return (
            <Tooltip key={item.label} label={item.label} position="right" disabled={!isCompact} openDelay={200}>
                <UnstyledButton
                    className={`cpd-nav-item${isActive ? ' cpd-nav-item--active' : ''}`}
                    onClick={() => handleNavClick(item.link)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                        justifyContent: isCompact ? 'center' : 'flex-start',
                        gap: isCompact ? 0 : 10,
                        paddingLeft: isCompact ? 0 : 12,
                        paddingRight: isCompact ? 0 : 12,
                    }}
                >
                    <span className="cpd-nav-icon" aria-hidden>
                        <item.icon />
                    </span>
                    {!isCompact && (
                        <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                            <Text
                                component="span"
                                size="sm"
                                fw={isActive ? 700 : 600}
                                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                                {item.label}
                            </Text>
                            {item.label === 'Policies' && role === 'staff' && unreadPolicyCount > 0 && (
                                <Badge size="sm" color="red" variant="filled" style={{ flexShrink: 0 }}>
                                    {unreadPolicyCount}
                                </Badge>
                            )}
                        </Group>
                    )}
                    {isCompact && item.label === 'Policies' && role === 'staff' && unreadPolicyCount > 0 && (
                        <Box
                            aria-hidden
                            style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: 'var(--mantine-color-red-6)',
                            }}
                        />
                    )}
                </UnstyledButton>
            </Tooltip>
        );
    });

    return (
        <>
            <style>{sidebarStyles}</style>
            <nav className="cpd-sidebar" aria-label="Main navigation" style={{ padding: isCompact ? '12px 8px' : '14px 12px' }}>
                {!hideHeader && (
                    <Box
                        mb={14}
                        style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isCompact ? 'center' : 'space-between',
                            gap: 8,
                            minHeight: 44,
                        }}
                    >
                        {!isCompact && (
                            <Box style={{ minWidth: 0, flex: 1 }}>
                                <Text
                                    fw={800}
                                    size="sm"
                                    style={{
                                        color: '#1EBAF2',
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {portalTitle}
                                </Text>
                                <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1.3, marginTop: 2 }}>
                                    {portalSubtitle}
                                </Text>
                            </Box>
                        )}
                        <Tooltip
                            label={onClose ? 'Close menu' : isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
                            position="right"
                        >
                            <ActionIcon
                                className="cpd-sidebar-close"
                                variant="subtle"
                                onClick={onClose || toggle}
                                aria-label={onClose ? 'Close menu' : isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {onClose ? (
                                    <X size={14} strokeWidth={2.25} />
                                ) : isCompact ? (
                                    <PanelLeft size={15} strokeWidth={2} />
                                ) : (
                                    <PanelLeftClose size={15} strokeWidth={2} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                    </Box>
                )}

                <Stack className="cpd-sidebar-nav" gap={4} role="list">
                    {links}
                </Stack>

                <Box className="cpd-sidebar-footer">
                    <Tooltip label="Sign Out" position="right" disabled={!isCompact} openDelay={200}>
                        <UnstyledButton
                            className="cpd-signout"
                            onClick={handleSignOut}
                            aria-label="Sign out"
                            style={{
                                justifyContent: isCompact ? 'center' : 'flex-start',
                                padding: isCompact ? 8 : '10px 12px',
                            }}
                        >
                            <span className="cpd-signout-icon" aria-hidden>
                                <LogOut style={{ width: rem(16), height: rem(16) }} />
                            </span>
                            {!isCompact && (
                                <Box style={{ minWidth: 0, textAlign: 'left' }}>
                                    <Text size="sm" fw={700} c="#c92a2a" style={{ lineHeight: 1.2 }}>
                                        Sign Out
                                    </Text>
                                    <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1.2, marginTop: 2 }}>
                                        End current session
                                    </Text>
                                </Box>
                            )}
                        </UnstyledButton>
                    </Tooltip>
                </Box>
            </nav>
        </>
    );
}
