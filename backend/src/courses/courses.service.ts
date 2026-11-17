import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Course } from './course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { CourseIdentityService } from './course-identity.service';

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course)
        private coursesRepository: Repository<Course>,
        private readonly courseIdentityService: CourseIdentityService,
    ) { }

    async create(createCourseDto: CreateCourseDto): Promise<Course> {
        const existing = await this.coursesRepository.findOne({
            where: { title: ILike(createCourseDto.title.trim()) },
        });
        if (existing) {
            throw new ConflictException(
                `A course with title "${existing.title}" already exists (id=${existing.id}). Rename the existing course instead of creating a duplicate.`,
            );
        }
        const course = this.coursesRepository.create(createCourseDto);
        const saved = await this.coursesRepository.save(course);
        await this.courseIdentityService.invalidateCache();
        return saved;
    }

    async findAll(): Promise<Course[]> {
        return this.coursesRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string): Promise<Course | null> {
        return this.coursesRepository.findOne({ where: { id } });
    }

    async update(id: string, updateCourseDto: CreateCourseDto): Promise<Course | null> {
        const existing = await this.findOne(id);
        if (!existing) {
            throw new NotFoundException(`Course ${id} not found`);
        }

        const titleChanged =
            updateCourseDto.title !== undefined &&
            updateCourseDto.title.trim() !== existing.title;

        if (titleChanged) {
            const clash = await this.coursesRepository.findOne({
                where: { title: ILike(updateCourseDto.title.trim()) },
            });
            if (clash && clash.id !== id) {
                throw new ConflictException(
                    `Another course already uses title "${clash.title}" (id=${clash.id}).`,
                );
            }
        }

        await this.coursesRepository.update(id, updateCourseDto);
        const updated = await this.findOne(id);

        if (titleChanged && updated) {
            // Keep historical training/certificate rows linked to the same logical course
            await this.courseIdentityService.propagateTitleRename(id, updated.title);
        } else {
            await this.courseIdentityService.invalidateCache();
        }

        return updated;
    }

    async remove(id: string): Promise<void> {
        await this.coursesRepository.delete(id);
        await this.courseIdentityService.invalidateCache();
    }
}
