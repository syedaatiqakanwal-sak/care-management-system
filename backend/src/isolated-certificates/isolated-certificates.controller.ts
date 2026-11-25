import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
    ForbiddenException,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { IsolatedCertificatesService } from './isolated-certificates.service';
import { UserRole } from '../users/user.entity';
import { Public } from '../auth/public.decorator';

@Controller('isolated-certificates')
export class IsolatedCertificatesController {
    constructor(private readonly service: IsolatedCertificatesService) { }

    @Get('staff')
    @UseGuards(AuthGuard('jwt'))
    async getStaffList(@Req() req) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only administrators can access staff certificate management');
        }
        return this.service.getStaffList();
    }

    @Get('staff/:userId')
    @UseGuards(AuthGuard('jwt'))
    async getCertificatesForStaff(@Param('userId') userId: string, @Req() req) {
        const requestingUserId = req.user.userId || req.user.id;
        if (req.user.role !== UserRole.ADMIN && requestingUserId !== userId) {
            throw new ForbiddenException('You can only view your own certificates');
        }
        return this.service.getCertificatesForStaff(userId);
    }

    @Post(':id/view-token')
    @UseGuards(AuthGuard('jwt'))
    async createViewToken(@Param('id') id: string, @Req() req) {
        const token = await this.service.generateViewToken(id, req.user);
        return { token };
    }

    @Get(':id/stream')
    @Public()
    async streamPreview(
        @Param('id') id: string,
        @Query('token') token: string,
        @Res() res: Response,
    ) {
        const payload = await this.service.verifyViewToken(token);
        if (!payload || payload.certId !== id) {
            throw new UnauthorizedException('Invalid or expired view token');
        }

        // Secondary IDOR check on the stream endpoint
        const record = await this.service.resolveRecordOwner(id);
        if (!record) throw new NotFoundException('Course record not found');
        if (payload.role !== UserRole.ADMIN && record.userId !== payload.userId) {
            throw new ForbiddenException('Access denied');
        }

        const { buffer, fileName } = await this.service.generatePreviewPdf(id);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0',
        });

        res.end(buffer);
    }

    @Get(':id/download')
    @UseGuards(AuthGuard('jwt'))
    async downloadPreview(
        @Param('id') id: string,
        @Req() req,
        @Res() res: Response,
    ) {
        const requestingUserId = req.user.userId || req.user.id;
        const record = await this.service.resolveRecordOwner(id);
        if (!record) throw new NotFoundException('Course record not found');

        // IDOR check: Only Admin OR the certificate owner can download
        if (req.user.role !== UserRole.ADMIN && record.userId !== requestingUserId) {
            throw new ForbiddenException('You do not have permission to download this certificate');
        }

        const { buffer, fileName } = await this.service.generatePreviewPdf(id);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });

        res.end(buffer);
    }
}
