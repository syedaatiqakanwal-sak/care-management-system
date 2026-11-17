import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './course.entity';
import { CourseIdentityService } from './course-identity.service';
import { TrainingRecord } from '../training/training-record.entity';
import { Certificate } from '../certificates/certificate.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Course, TrainingRecord, Certificate])],
    controllers: [CoursesController],
    providers: [CoursesService, CourseIdentityService],
    exports: [CoursesService, CourseIdentityService, TypeOrmModule],
})
export class CoursesModule { }
