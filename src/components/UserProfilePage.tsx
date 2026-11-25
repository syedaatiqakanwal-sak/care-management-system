import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Paper,
    Title,
    Text,
    TextInput,
    PasswordInput,
    Button,
    Group,
    Stack,
    Avatar,
    Badge,
    Progress,
    Divider,
    SimpleGrid,
    ActionIcon,
    Tooltip,
    Alert,
    Center,
    Loader,
} from '@mantine/core';
import {
    User,
    Mail,
    Lock,
    Camera,
    Check,
    X,
    ShieldCheck,
    KeyRound,
    AlertCircle,
    UploadCloud,
    CheckCircle2,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

// Allowed image formats
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/jfif', 'image/pjpeg'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.jfif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function UserProfilePage() {
    const role = (localStorage.getItem('role') || '').toLowerCase();
    const isAdmin = role === 'admin';
    const token = localStorage.getItem('token');

    // Profile state
    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const avatarBlobRef = useRef<string | null>(null);

    // Password change state (Admin only)
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (avatarBlobRef.current) {
                URL.revokeObjectURL(avatarBlobRef.current);
            }
        };
    }, []);

    // Load current user profile
    const loadProfile = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const res = await axios.get('/api/v1/staff/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const p = res.data;
            setFirstName(p.firstName || '');
            setLastName(p.lastName || '');
            setEmail(p.user?.email || p.email || '');

            // Load profile picture as blob if available
            if (p.profilePicture) {
                try {
                    const imgRes = await axios.get(`/api/v1/staff/me/profile-picture?t=${Date.now()}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: 'blob'
                    });
                    if (avatarBlobRef.current) {
                        URL.revokeObjectURL(avatarBlobRef.current);
                    }
                    const blobUrl = URL.createObjectURL(imgRes.data);
                    avatarBlobRef.current = blobUrl;
                    setAvatarUrl(blobUrl);
                } catch {
                    // ignore if no photo exists
                }
            } else {
                if (avatarBlobRef.current) {
                    URL.revokeObjectURL(avatarBlobRef.current);
                    avatarBlobRef.current = null;
                }
                setAvatarUrl(null);
            }
        } catch (err: any) {
            console.error('Failed to load profile:', err);
            // Fallback to localStorage data
            setEmail(localStorage.getItem('userEmail') || '');
            const storedName = localStorage.getItem('userName') || '';
            const parts = storedName.split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // Password Strength Meter Calculations (Admin only)
    const passwordRequirements = useMemo(() => {
        const val = newPassword;
        return [
            { label: '8 digits / characters complete', met: val.length >= 8 },
            { label: 'Number added (0–9)', met: /\d/.test(val) },
            { label: 'Symbol added (!@#$%^&*...)', met: /[!@#$%^&*(),.?":{}|<>]/.test(val) },
            { label: 'Capital letter added (A–Z)', met: /[A-Z]/.test(val) },
        ];
    }, [newPassword]);

    const strengthScore = useMemo(() => {
        if (!newPassword) return 0;
        const metCount = passwordRequirements.filter((r) => r.met).length;
        return (metCount / 4) * 100;
    }, [newPassword, passwordRequirements]);

    const strengthColor = useMemo(() => {
        if (strengthScore <= 25) return 'red';
        if (strengthScore <= 50) return 'orange';
        if (strengthScore <= 75) return 'yellow';
        return 'teal';
    }, [strengthScore]);

    const strengthLabel = useMemo(() => {
        if (strengthScore === 0) return 'None';
        if (strengthScore <= 25) return 'Weak';
        if (strengthScore <= 50) return 'Fair';
        if (strengthScore <= 75) return 'Good';
        return 'Strong (Meets All Requirements)';
    }, [strengthScore]);

    // Handle Profile Picture File Upload (Max 5MB, png, jfif, jpeg, webp, jpg)
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Check size (max 5 MB)
        if (file.size > MAX_FILE_SIZE) {
            notifications.show({
                title: 'File Too Large',
                message: 'Profile picture must not exceed 5 MB in size.',
                color: 'red',
                icon: <X size={16} />,
            });
            return;
        }

        // 2. Check format (.png, .jpg, .jpeg, .webp, .jfif)
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(fileExt) && !ALLOWED_MIME_TYPES.includes(file.type)) {
            notifications.show({
                title: 'Unsupported Format',
                message: 'Only PNG, JPG, JPEG, WEBP, and JFIF image formats are allowed.',
                color: 'red',
                icon: <X size={16} />,
            });
            return;
        }

        // Instant local preview
        if (avatarBlobRef.current) {
            URL.revokeObjectURL(avatarBlobRef.current);
        }
        const localPreview = URL.createObjectURL(file);
        avatarBlobRef.current = localPreview;
        setAvatarUrl(localPreview);

        // Upload to server
        try {
            setUploadingPhoto(true);
            const formData = new FormData();
            formData.append('file', file);

            await axios.post('/api/v1/staff/me/profile-picture', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            notifications.show({
                title: 'Profile Picture Updated',
                message: 'Your new profile image has been saved successfully.',
                color: 'teal',
                icon: <Check size={16} />,
            });

            // Reload profile from server to ensure fresh blob is bound
            await loadProfile(false);

            // Notify header to refresh
            window.dispatchEvent(new Event('userProfileUpdated'));
        } catch (err: any) {
            console.error('Failed to upload profile picture:', err);
            notifications.show({
                title: 'Upload Failed',
                message: err.response?.data?.message || 'Could not upload image.',
                color: 'red',
                icon: <X size={16} />,
            });
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle Name Update (Admin only)
    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;

        if (!firstName.trim()) {
            notifications.show({
                title: 'Required Field',
                message: 'First name cannot be empty.',
                color: 'red',
            });
            return;
        }

        try {
            setSavingName(true);
            await axios.put(
                '/api/v1/staff/me',
                {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
            localStorage.setItem('userName', fullName);

            notifications.show({
                title: 'Name Updated',
                message: 'Your profile name has been saved.',
                color: 'teal',
                icon: <Check size={16} />,
            });

            // Immediately update the header name
            window.dispatchEvent(new Event('userProfileUpdated'));
        } catch (err: any) {
            console.error('Failed to save name:', err);
            notifications.show({
                title: 'Save Failed',
                message: err.response?.data?.message || 'Could not update name.',
                color: 'red',
            });
        } finally {
            setSavingName(false);
        }
    };

    // Handle Password Change (Admin only)
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;

        if (strengthScore < 100) {
            notifications.show({
                title: 'Password Too Weak',
                message: 'Please meet all 4 password strength requirements before updating.',
                color: 'red',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            notifications.show({
                title: 'Passwords Do Not Match',
                message: 'New password and confirm password must match.',
                color: 'red',
            });
            return;
        }

        try {
            setUpdatingPassword(true);
            await axios.post(
                '/api/v1/auth/change-password',
                {
                    currentPassword: currentPassword || undefined,
                    newPassword,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            notifications.show({
                title: 'Password Changed',
                message: 'Your password has been updated successfully.',
                color: 'teal',
                icon: <Check size={16} />,
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Failed to change password:', err);
            notifications.show({
                title: 'Password Change Failed',
                message: err.response?.data?.message || 'Could not change password.',
                color: 'red',
            });
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loading) {
        return (
            <Center h="60vh">
                <Stack align="center" gap="sm">
                    <Loader size="lg" color="blue" />
                    <Text size="sm" c="dimmed">Loading your profile...</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <Box w="100%" px={{ base: 'xs', sm: 'md', md: 'lg' }} py="md" style={{ boxSizing: 'border-box' }}>
            {/* Top Page Header */}
            <Box mb="xl">
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                    <Box>
                        <Title order={1} size={28} fw={900} c="#0f172a" style={{ letterSpacing: '-0.6px', lineHeight: 1.15 }}>
                            My Profile
                        </Title>
                        <Text size="sm" c="#64748b" fw={500} mt={4}>
                            Manage your account information, profile picture, and credentials.
                        </Text>
                    </Box>

                    <Badge
                        size="lg"
                        radius="md"
                        variant="gradient"
                        gradient={isAdmin ? { from: '#1EBAF2', to: '#0284c7' } : { from: '#E51690', to: '#db2777' }}
                        fw={800}
                    >
                        {isAdmin ? 'ADMINISTRATOR' : 'STAFF MEMBER'}
                    </Badge>
                </Group>
            </Box>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" style={{ alignItems: 'flex-start' }}>
                {/* LEFT COLUMN: Profile Picture Card (Max 5MB, png, jfif, jpeg, webp, jpg) */}
                <Paper
                    p="xl"
                    radius={20}
                    style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.07)',
                        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)',
                        textAlign: 'center',
                    }}
                >
                    <Stack align="center" gap="md">
                        {/* Avatar with Camera Overlay */}
                        <Box style={{ position: 'relative', display: 'inline-block' }}>
                            <Avatar
                                src={avatarUrl}
                                size={120}
                                radius={999}
                                styles={{
                                    root: {
                                        border: '4px solid #ffffff',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                        backgroundColor: '#0284c7',
                                    },
                                    placeholder: {
                                        color: '#ffffff',
                                        fontSize: '38px',
                                        fontWeight: 900,
                                    },
                                    image: {
                                        objectFit: 'cover',
                                    }
                                }}
                                imageProps={{
                                    loading: 'lazy', // Lazy loading for optimal performance
                                }}
                            >
                                {firstName?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>

                            <Tooltip label="Upload new profile picture (Max 5MB)">
                                <ActionIcon
                                    size="lg"
                                    radius="xl"
                                    color="blue"
                                    variant="filled"
                                    loading={uploadingPhoto}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        right: 4,
                                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
                                    }}
                                >
                                    <Camera size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </Box>

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".png,.jpg,.jpeg,.webp,.jfif,image/png,image/jpeg,image/webp,image/jfif"
                            onChange={handleFileSelect}
                        />

                        <Box>
                            <Text fw={900} size="lg" c="#0f172a">
                                {firstName} {lastName}
                            </Text>
                            <Text size="xs" c="#64748b" fw={600} mt={2}>
                                {email}
                            </Text>
                        </Box>

                        <Button
                            variant="light"
                            color="blue"
                            size="xs"
                            radius="md"
                            leftSection={<UploadCloud size={14} />}
                            loading={uploadingPhoto}
                            onClick={() => fileInputRef.current?.click()}
                            fullWidth
                            mt="xs"
                        >
                            Change Picture
                        </Button>

                        <Text size="11px" c="dimmed" lh={1.4}>
                            Allowed: PNG, JPG, JPEG, WEBP, JFIF. Maximum file size: 5 MB.
                        </Text>
                    </Stack>
                </Paper>

                {/* RIGHT TWO COLUMNS: Personal Details & Password (if Admin) */}
                <Box style={{ gridColumn: 'span 2' }}>
                    <Stack gap="xl">
                        {/* CARD 1: Personal Details */}
                        <Paper
                            p="xl"
                            radius={20}
                            style={{
                                background: '#ffffff',
                                border: '1.5px solid rgba(0, 0, 0, 0.07)',
                                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)',
                            }}
                        >
                            <Group justify="space-between" align="center" mb="lg">
                                <Box>
                                    <Title order={3} size={18} fw={800} c="#0f172a">
                                        Personal Information
                                    </Title>
                                    <Text size="xs" c="dimmed" mt={2}>
                                        {isAdmin
                                            ? 'You can update your display name. Email address is permanent.'
                                            : 'Your name and email are maintained by administrators and cannot be edited.'}
                                    </Text>
                                </Box>
                                <User size={20} color="#0284c7" />
                            </Group>

                            <form onSubmit={handleSaveName}>
                                <Stack gap="md">
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        <TextInput
                                            label="First Name"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.currentTarget.value)}
                                            disabled={!isAdmin} // Disabled for staff
                                            required={isAdmin}
                                            radius="md"
                                            styles={{
                                                input: {
                                                    backgroundColor: !isAdmin ? '#F1F5F9' : '#ffffff',
                                                    color: !isAdmin ? '#64748b' : '#0f172a',
                                                    fontWeight: 600,
                                                    cursor: !isAdmin ? 'not-allowed' : 'text',
                                                }
                                            }}
                                        />

                                        <TextInput
                                            label="Last Name"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.currentTarget.value)}
                                            disabled={!isAdmin} // Disabled for staff
                                            radius="md"
                                            styles={{
                                                input: {
                                                    backgroundColor: !isAdmin ? '#F1F5F9' : '#ffffff',
                                                    color: !isAdmin ? '#64748b' : '#0f172a',
                                                    fontWeight: 600,
                                                    cursor: !isAdmin ? 'not-allowed' : 'text',
                                                }
                                            }}
                                        />
                                    </SimpleGrid>

                                    {/* Email: Always disabled / gray uneditable */}
                                    <TextInput
                                        label="Email Address"
                                        value={email}
                                        disabled={true}
                                        leftSection={<Mail size={16} color="#94a3b8" />}
                                        radius="md"
                                        description="Email address is linked to your portal account and cannot be modified."
                                        styles={{
                                            input: {
                                                backgroundColor: '#F1F5F9',
                                                color: '#64748b',
                                                fontWeight: 600,
                                                cursor: 'not-allowed',
                                            }
                                        }}
                                    />

                                    {/* Only Admin has Save Name button */}
                                    {isAdmin && (
                                        <Group justify="flex-end" mt="sm">
                                            <Button
                                                type="submit"
                                                color="blue"
                                                radius="md"
                                                loading={savingName}
                                                fw={700}
                                                leftSection={<Check size={16} />}
                                            >
                                                Save Changes
                                            </Button>
                                        </Group>
                                    )}
                                </Stack>
                            </form>
                        </Paper>

                        {/* CARD 2: Password Change (ONLY SHOWN FOR ADMIN) */}
                        {isAdmin && (
                            <Paper
                                p="xl"
                                radius={20}
                                style={{
                                    background: '#ffffff',
                                    border: '1.5px solid rgba(0, 0, 0, 0.07)',
                                    boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)',
                                }}
                            >
                                <Group justify="space-between" align="center" mb="lg">
                                    <Box>
                                        <Title order={3} size={18} fw={800} c="#0f172a">
                                            Change Password
                                        </Title>
                                        <Text size="xs" c="dimmed" mt={2}>
                                            Password must be strong and satisfy all 4 security checks.
                                        </Text>
                                    </Box>
                                    <KeyRound size={20} color="#0284c7" />
                                </Group>

                                <form onSubmit={handleChangePassword}>
                                    <Stack gap="md">
                                        <PasswordInput
                                            label="Current Password"
                                            placeholder="Enter current password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                                            radius="md"
                                            leftSection={<Lock size={16} />}
                                        />

                                        <PasswordInput
                                            label="New Password"
                                            placeholder="Create a strong password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.currentTarget.value)}
                                            required
                                            radius="md"
                                            leftSection={<Lock size={16} />}
                                        />

                                        {/* Live Interactive Password Strength Progress Bar */}
                                        {newPassword && (
                                            <Box
                                                p="sm"
                                                style={{
                                                    background: '#F8FAFC',
                                                    borderRadius: 12,
                                                    border: '1px solid #E2E8F0',
                                                }}
                                            >
                                                <Group justify="space-between" mb={6}>
                                                    <Text size="xs" fw={700} c="#475569">
                                                        Password Strength:
                                                    </Text>
                                                    <Text size="xs" fw={800} c={strengthColor}>
                                                        {strengthLabel} ({strengthScore}%)
                                                    </Text>
                                                </Group>

                                                <Progress
                                                    value={strengthScore}
                                                    color={strengthColor}
                                                    size="sm"
                                                    radius="xl"
                                                    mb="sm"
                                                    animated={strengthScore < 100}
                                                />

                                                {/* Interactive Checklist Pills */}
                                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                                    {passwordRequirements.map((req, i) => (
                                                        <Group key={i} gap={6} align="center">
                                                            {req.met ? (
                                                                <CheckCircle2 size={14} color="#10B981" />
                                                            ) : (
                                                                <AlertCircle size={14} color="#94A3B8" />
                                                            )}
                                                            <Text
                                                                size="xs"
                                                                fw={600}
                                                                c={req.met ? '#0f172a' : '#94a3b8'}
                                                            >
                                                                {req.label}
                                                            </Text>
                                                        </Group>
                                                    ))}
                                                </SimpleGrid>
                                            </Box>
                                        )}

                                        <PasswordInput
                                            label="Confirm New Password"
                                            placeholder="Re-enter new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                                            required
                                            radius="md"
                                            leftSection={<Lock size={16} />}
                                            error={
                                                confirmPassword && newPassword !== confirmPassword
                                                    ? 'Passwords do not match'
                                                    : undefined
                                            }
                                        />

                                        <Group justify="flex-end" mt="sm">
                                            <Button
                                                type="submit"
                                                color="blue"
                                                radius="md"
                                                fw={700}
                                                loading={updatingPassword}
                                                disabled={
                                                    strengthScore < 100 ||
                                                    !confirmPassword ||
                                                    newPassword !== confirmPassword
                                                }
                                                leftSection={<ShieldCheck size={16} />}
                                            >
                                                Update Password
                                            </Button>
                                        </Group>
                                    </Stack>
                                </form>
                            </Paper>
                        )}
                    </Stack>
                </Box>
            </SimpleGrid>
        </Box>
    );
}
