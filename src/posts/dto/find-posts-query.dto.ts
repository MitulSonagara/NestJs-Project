import { IsOptional, IsString, Max } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class FindPostsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string ' })
  @Max(100, { message: 'Title search cannot exceed 100' })
  title?: string;
}
