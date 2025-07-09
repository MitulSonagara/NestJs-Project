import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post as PostEntity } from './entities/post.entity';
import { PostExistsPipe } from './pipes/post-exists.pipe';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { FindPostsQueryDto } from './dto/find-posts-query.dto';
import { Paginatedresponse } from 'src/common/interfaces/paginated-response.interface';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query() query: FindPostsQueryDto): Promise<Paginatedresponse<PostEntity>> {
    return this.postsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PostEntity> {
    return this.postsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
    }),
  ) // Validate this request with this particular pipe and other will be validated via global pipes
  create(@Body() post: CreatePostDto, @CurrentUser() user: any): Promise<PostEntity> {
    return this.postsService.create(post, user);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Body() postData: UpdatePostDto,
    @Param('id', ParseIntPipe, PostExistsPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<PostEntity> {
    return this.postsService.update(id, postData, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe, PostExistsPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.postsService.remove(id, user);
  }
}
