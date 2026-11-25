import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/user.entity';
import { StaffService } from '../staff/staff.service';
import { RegisterDto } from './auth.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private staffService: StaffService,
        private emailService: EmailService,
    ) { }

    async validateUser(email: string, pass: string, requiredRole?: UserRole): Promise<any> {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.usersService.findByEmail(normalizedEmail);

        // 1. Check existence
        if (!user) return null;

        // 2. Check Role (Strict separation)
        if (requiredRole && user.role !== requiredRole) return null;

        // 3. Check Status (Must be active)
        if (!user.isActive) return null;

        // 4. Check Password
        if (await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        // Update Last Login Timestamp
        await this.usersService.update(user.id, { lastLoginAt: new Date() });

        const payload = { sub: user.id, role: user.role };

        let name = user.role === UserRole.ADMIN ? 'Admin' : 'Staff Member';
        try {
            const profile = await this.staffService.getProfileByUserId(user.id);
            if (profile) {
                const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
                if (fullName) {
                    name = fullName;
                }
            }
        } catch (e) {
            // Keep role fallback if profile lookup fails
        }

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role.toLowerCase(), // Normalize to lowercase for frontend consistency
                name: name
            }
        };
    }

    async register(registerDto: RegisterDto) {
        const { email, password, firstName, lastName, phone, ilccsNumber } = registerDto;

        const exists = await this.usersService.exists(email);
        if (exists) {
            throw new UnauthorizedException('Invalid request');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await this.usersService.create({
            email: email.toLowerCase().trim(),
            password: hashedPassword,
        });

        if (newUser.role === UserRole.STAFF) {
            await this.staffService.createProfile(
                newUser,
                firstName,
                lastName,
                phone,
                ilccsNumber
            );
        }

        const { password: _, ...result } = newUser;
        return result;
    }

    // --- Forgot Password Flow ---

    async forgotPassword(email: string) {
        const user = await this.usersService.findForReset(email.toLowerCase().trim());
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return { message: 'If the email exists, an OTP has been sent' };
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Hash it
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Expires in 15 minutes
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 15);

        await this.usersService.update(user.id, {
            resetOtp: hashedOtp,
            resetOtpExpiry: expiry
        });

        // Send Email via Nodemailer
        await this.emailService.sendOtp(email, otp);

        return { message: 'If the email exists, an OTP has been sent' };
    }

    async verifyOtp(email: string, otp: string) {
        const user = await this.usersService.findForReset(email);
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            throw new UnauthorizedException('Invalid request');
        }

        if (new Date() > user.resetOtpExpiry) {
            throw new UnauthorizedException('OTP expired');
        }

        const isValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isValid) {
            throw new UnauthorizedException('Invalid OTP');
        }

        return { message: 'OTP verified' };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        // Re-verify strictly
        const user = await this.usersService.findForReset(email.toLowerCase().trim());
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            throw new UnauthorizedException('Invalid request');
        }

        if (new Date() > user.resetOtpExpiry) {
            // Clear expired OTP to prevent further attempts
            await this.usersService.update(user.id, {
                resetOtp: null,
                resetOtpExpiry: null
            } as any);
            throw new UnauthorizedException('OTP expired');
        }

        const isValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isValid) {
            throw new UnauthorizedException('Invalid OTP');
        }

        // Hash new password with stronger rounds
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and clear OTP immediately
        await this.usersService.update(user.id, {
            password: hashedPassword,
            resetOtp: null,
            resetOtpExpiry: null
        } as any);

        return { message: 'Password reset successfully' };
    }

    async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
        if (!newPassword || newPassword.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters long');
        }
        if (!/\d/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            throw new BadRequestException('Password must include at least one number, one uppercase letter, and one special character');
        }

        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only administrators are permitted to change password');
        }

        if (currentPassword) {
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                throw new BadRequestException('Current password is incorrect');
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await this.usersService.update(user.id, {
            password: hashedPassword,
        });

        return { message: 'Password updated successfully' };
    }
}
