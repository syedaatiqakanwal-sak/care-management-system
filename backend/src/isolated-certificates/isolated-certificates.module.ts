import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Certificate } from '../certificates/certificate.entity';
import { User } from '../users/user.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { TrainingRecord } from '../training/training-record.entity';
import { Course } from '../courses/course.entity';
import { IsolatedCertificatesController } from './isolated-certificates.controller';
import { IsolatedCertificatesService } from './isolated-certificates.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Certificate, User, StaffProfile, TrainingRecord, Course]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [IsolatedCertificatesController],
    providers: [IsolatedCertificatesService],
    exports: [IsolatedCertificatesService],
})
export class IsolatedCertificatesModule { }
