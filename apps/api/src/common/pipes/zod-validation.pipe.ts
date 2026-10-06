import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validasyon hatası',
          code: 'VALIDATION_ERROR',
          details: error.flatten().fieldErrors,
        });
      }
      throw new BadRequestException('Geçersiz veri');
    }
  }
}
